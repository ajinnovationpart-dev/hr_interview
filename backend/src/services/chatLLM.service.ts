/**
 * 챗봇 LLM: Groq만 사용 (무료). 요청 큐·속도 제한으로 429 완화.
 */
import { logger } from '../utils/logger';

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.1-8b-instant';

const MAX_CONTEXT_CHARS = 22000;
const MIN_INTERVAL_MS = 900;
const MAX_TOKENS = 1024;

let lastRequestAt = 0;
const queue: Array<() => void> = [];

function waitRateLimit(): Promise<void> {
  return new Promise((resolve) => {
    const run = () => {
      const now = Date.now();
      const elapsed = now - lastRequestAt;
      if (elapsed >= MIN_INTERVAL_MS || lastRequestAt === 0) {
        lastRequestAt = Date.now();
        resolve();
        const next = queue.shift();
        if (next) next();
      } else {
        const delay = MIN_INTERVAL_MS - elapsed;
        setTimeout(() => {
          lastRequestAt = Date.now();
          resolve();
          const next = queue.shift();
          if (next) next();
        }, delay);
      }
    };
    if (queue.length === 0) {
      queue.push(run);
      run();
    } else {
      queue.push(run);
    }
  });
}

function buildPrompt(systemContext: string, userMessage: string): string {
  const trimmed =
    systemContext.length > MAX_CONTEXT_CHARS
      ? systemContext.slice(0, MAX_CONTEXT_CHARS) + '\n...(용량 제한으로 위 데이터만 참고하세요. 면접 목록이 잘렸을 수 있습니다.)'
      : systemContext;
  return `당신은 AJ Networks 면접/채용 시스템의 도우미 챗봇입니다.
아래 [참고 데이터]만 사용해서 질문에 친절하고 간결하게 답변하세요. "(로드 실패)" 표시된 항목은 해당 데이터를 사용할 수 없다고 안내하세요. 데이터에 없는 내용은 "해당 정보가 없습니다" 등으로 답하고 추측하지 마세요.

[참고 데이터]
${trimmed}

[사용자 질문]
${userMessage}

[답변] (한국어, 요점 정리, 불릿 가능):`;
}

async function callGroq(
  apiKey: string,
  prompt: string,
  model: string
): Promise<{ ok: boolean; status: number; text: string; is429: boolean }> {
  const res = await fetch(GROQ_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are a helpful assistant for an interview scheduling system. Answer in Korean based only on the provided context.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: MAX_TOKENS,
      temperature: 0.3,
    }),
  });

  const text = await res.text();
  const is429 = res.status === 429;
  if (!res.ok) {
    logger.warn('Groq API error', { status: res.status, model, body: text?.slice(0, 200) });
    return { ok: false, status: res.status, text, is429 };
  }

  try {
    const data = JSON.parse(text) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data?.choices?.[0]?.message?.content?.trim();
    return { ok: true, status: res.status, text: content || '답변을 생성하지 못했습니다.', is429: false };
  } catch {
    return { ok: false, status: res.status, text, is429 };
  }
}

async function chatWithGroq(systemContext: string, userMessage: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) return '';

  const prompt = buildPrompt(systemContext, userMessage);
  const model = process.env.GROQ_CHAT_MODEL?.trim() || DEFAULT_MODEL;

  await waitRateLimit();

  let result = await callGroq(apiKey, prompt, model);

  if (result.is429) {
    logger.warn('Groq 429, retrying once after 2s');
    await new Promise((r) => setTimeout(r, 2000));
    await waitRateLimit();
    result = await callGroq(apiKey, prompt, model);
  }

  if (!result.ok) {
    throw new Error(result.is429 ? 'GROQ_QUOTA' : `Groq ${result.status}: ${result.text?.slice(0, 150)}`);
  }

  return result.text;
}

/**
 * 챗봇 답변 생성. Groq만 사용. (요청 큐 + 속도 제한 적용)
 */
export async function getChatReply(systemContext: string, userMessage: string): Promise<string> {
  if (!process.env.GROQ_API_KEY?.trim()) {
    return '챗봇을 사용하려면 .env에 GROQ_API_KEY를 설정해 주세요. (무료 발급: https://console.groq.com)';
  }

  try {
    const reply = await chatWithGroq(systemContext, userMessage);
    logger.debug('Chat reply via Groq');
    return reply;
  } catch (e: any) {
    if (e?.message === 'GROQ_QUOTA') {
      logger.warn('Groq quota exceeded');
      return '요청 한도를 초과했습니다. 잠시 후(약 1분) 다시 시도해 주세요.';
    }
    logger.warn('Groq chat failed', { error: e?.message });
    return `일시적인 오류가 발생했습니다. (${e?.message || 'Unknown error'})`;
  }
}
