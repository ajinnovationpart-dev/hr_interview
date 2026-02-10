# 챗봇 기능 기술명세

## 1. 개요

| 항목 | 내용 |
|------|------|
| **목적** | 관리자·면접관이 면접/일정/면접관/지원자 등에 대해 **자연어로 질문**하고, 시스템 데이터 기반 **답변**을 받는 도우미 기능 |
| **명칭** | 면접 도우미 (UI 표기: "면접 도우미") |
| **노출** | 관리자(`/admin/*`), 면접관(`/interviewer/*`) 로그인 시에만 우측 하단 플로팅 버튼으로 표시 |

---

## 2. 사용자·권한

| 역할 | 노출 | 컨텍스트 범위 |
|------|------|----------------|
| **ADMIN** | ✅ | 전체: 면접관 목록, 회의실 목록, 지원자 현황, 등록된 면접 목록(최근 50건) |
| **면접관(INTERVIEWER)** | ✅ | 본인 참여 면접만: 면접명·팀·상태·일시, 본인이 담당하는 지원자(이름·직무·일정·메모·이력서 유무) |
| 비로그인 / 지원자 등 | ❌ | 챗봇 UI 미표시 |

---

## 3. 프론트엔드

### 3.1 컴포넌트·위치

- **파일**: `frontend/src/components/ChatBot.tsx`
- **마운트**: `frontend/src/App.tsx`에서 전역 렌더 (`<ChatBot />`)
- **표시 조건**: `isAuthenticated && (pathname.startsWith('/admin') || pathname.startsWith('/interviewer'))`

### 3.2 UI 사양

| 항목 | 내용 |
|------|------|
| **기본 상태** | 우측 하단 고정( bottom: 24px, right: 24px ) 원형 버튼 (56×56px, 아이콘: MessageOutlined) |
| **열림 상태** | 380×480px 패널 (최대 너비 `calc(100vw - 48px)`), 헤더 "면접 도우미", 닫기 버튼 |
| **메시지 영역** | 사용자 메시지: 우측 정렬, 파란 배경(#1890ff); 봇 메시지: 좌측 정렬, 회색 배경(#f0f0f0) |
| **입력** | 하단 입력창 + 전송 버튼; Enter로 전송(Shift+Enter는 미지원) |
| **로딩** | 전송 중 Spin 표시, 입력/전송 비활성화 |
| **환영 문구** | 메시지 없을 때: "면접/일정에 대해 궁금한 것을 자연어로 질문해 보세요.\n예: …" |

### 3.3 API 호출

- **메서드**: `POST`
- **경로**: `apiA` 기준 `/chat` → 백엔드 `/api/chat` 또는 `/api/a/chat`
- **헤더**: `apiA`에 의해 JWT 등 인증 자동 첨부
- **요청 body**: `{ "message": "사용자 입력 문자열" }`
- **응답 기대**: `{ success: true, data: { reply: string } }`
- **에러**: `err.response.data.message` 또는 기본 문구 "응답을 가져오는 중 오류가 발생했습니다."를 봇 메시지로 표시

---

## 4. 백엔드 API

### 4.1 엔드포인트

| 메서드 | 경로 | 인증 | 설명 |
|--------|------|------|------|
| POST | `/api/chat`, `/api/a/chat` | `adminOrInterviewerAuth` (JWT) | 질문 1건에 대해 답변 1건 반환 |

### 4.2 요청

- **Content-Type**: `application/json`
- **Body**:
  - `message` (string, 필수): 사용자 질문. 공백만 있으면 400 "질문을 입력해 주세요."

### 4.3 응답

- **성공 (200)**  
  `{ "success": true, "data": { "reply": "생성된 답변 문자열" } }`
- **실패**
  - 400: `message` 누락/빈 문자열
  - 401: 미인증
  - 403: 관리자/면접관이 아님
  - 500: "챗봇 응답 생성에 실패했습니다." (내부 에러 시)

### 4.4 처리 흐름

1. 인증·권한 검사 (`adminOrInterviewerAuth`)
2. `message` 검증
3. **컨텍스트 생성**: 역할에 따라 데이터 조회 후 하나의 텍스트(`contextText`)로 결합
4. **LLM 호출**: `getChatReply(contextText, message)` → Groq 기반 답변 생성
5. `reply`를 `data.reply`에 담아 JSON 반환

---

## 5. 컨텍스트 구성 (백엔드)

### 5.1 관리자(ADMIN)

다음 4개 블록을 순서대로 이어 붙임. 각 블록은 **개별 try/catch**로 조회하며, 실패 시 해당 블록만 `"(로드 실패)"`로 대체.

| 블록 | 데이터 소스 | 내용 요약 |
|------|-------------|-----------|
| 면접관 목록 | `dataService.getAllInterviewers()` | 이름, 이메일, 부서, 직책, 연락처, 팀장 여부 |
| 회의실 목록 | `dataService.getAllRooms()` | 회의실명(또는 name/room_id), room_id |
| 지원자 현황 | `dataService.getAllCandidates()` | 총 인원, 상위 20명 이름·직무(`position_applied` 또는 `positionApplied`) |
| 등록된 면접 목록 | `dataService.getAllInterviews()` | 최근 50건. ID, 공고명(main_notice), 팀, 상태, (제안/확정)일 |

- 면접 목록 정렬: `created_at` 기준 내림차순 후 상위 50건
- 날짜 포맷: `dayjs(date).format('YYYY-MM-DD')`

### 5.2 면접관(INTERVIEWER)

- **소스**: `dataService.getAllInterviews()` + 각 면접에 대해 `getInterviewInterviewers`로 본인(`user.interviewerId`) 포함 여부 확인
- **포함 내용**: 본인이 참여하는 면접만. 면접별로:
  - 면접명(main_notice), 팀(team_name), 상태(status), 일시(proposed_date, confirmed_date, start_datetime, end_datetime)
  - **본인이 담당하는 지원자만**: `getInterviewCandidates` → `getCandidateById` → `getCandidateInterviewers`로 본인 매핑된 지원자만
  - 지원자: 이름, 직무(position_applied/positionApplied), 일정(scheduled_start/end), 메모(notes), 이력서 유무(resume_url)

### 5.3 컨텍스트 길이 제한

- **MAX_CONTEXT_CHARS**: 22,000자 (챗봇 LLM 서비스 상수)
- 초과 시 앞부분만 사용하고 끝에 `"...(용량 제한으로 위 데이터만 참고하세요. 면접 목록이 잘렸을 수 있습니다.)"` 추가

---

## 6. LLM 서비스 (Groq)

### 6.1 파일·역할

- **파일**: `backend/src/services/chatLLM.service.ts`
- **진입 함수**: `getChatReply(systemContext: string, userMessage: string): Promise<string>`

### 6.2 환경 변수

| 변수 | 필수 | 기본값 | 설명 |
|------|------|--------|------|
| `GROQ_API_KEY` | ✅ | - | [Groq Console](https://console.groq.com)에서 발급. 없으면 "챗봇을 사용하려면 .env에 GROQ_API_KEY를 설정해 주세요. …" 반환 |
| `GROQ_CHAT_MODEL` | ❌ | `llama-3.1-8b-instant` | 사용할 채팅 모델 |

### 6.3 API 호출

- **URL**: `https://api.groq.com/openai/v1/chat/completions`
- **방식**: POST, `Authorization: Bearer {GROQ_API_KEY}`
- **Body**: OpenAI 호환 형식  
  - `model`, `messages`(system + user), `max_tokens: 1024`, `temperature: 0.3`
- **system 메시지**: "You are a helpful assistant for an interview scheduling system. Answer in Korean based only on the provided context."
- **user 메시지**: 아래 프롬프트 문자열(참고 데이터 + 사용자 질문 + 답변 지시)

### 6.4 프롬프트 구조

```
당신은 AJ Networks 면접/채용 시스템의 도우미 챗봇입니다.
아래 [참고 데이터]만 사용해서 질문에 친절하고 간결하게 답변하세요. "(로드 실패)" 표시된 항목은 해당 데이터를 사용할 수 없다고 안내하세요. 데이터에 없는 내용은 "해당 정보가 없습니다" 등으로 답하고 추측하지 마세요.

[참고 데이터]
{contextText (최대 22000자)}

[사용자 질문]
{userMessage}

[답변] (한국어, 요점 정리, 불릿 가능):
```

### 6.5 속도 제한·재시도

- **요청 간격**: 최소 약 900ms (MIN_INTERVAL_MS). 큐로 직렬화하여 429 완화.
- **429 발생 시**: 2초 대기 후 동일 요청 1회 재시도.
- **재시도 후에도 실패** 시 사용자에게 "요청 한도를 초과했습니다. 잠시 후(약 1분) 다시 시도해 주세요." 반환 (GROQ_QUOTA).

### 6.6 기타 상수

- **MAX_TOKENS**: 1024
- **temperature**: 0.3

---

## 7. 에러·한계

| 상황 | 사용자에게 전달 |
|------|-----------------|
| `GROQ_API_KEY` 미설정 | ".env에 GROQ_API_KEY를 설정해 주세요. …" |
| Groq 429 (재시도 후 실패) | "요청 한도를 초과했습니다. 잠시 후(약 1분) 다시 시도해 주세요." |
| 기타 Groq/네트워크 오류 | "일시적인 오류가 발생했습니다. (상세 메시지)" |
| 컨텍스트 일부 로드 실패 | 해당 블록 "(로드 실패)"로 포함; LLM에게 해당 항목은 사용 불가 안내 지시 |
| 컨텍스트 22,000자 초과 | 앞부분만 사용, 잘림 안내 문구 추가 |

- **세션/대화 이력**: 서버에 저장하지 않음. 매 요청 독립(무상태).
- **이력서 본문 분석**: 컨텍스트에 이력서 원문을 넣지 않음. "이력서 파악해서 질문 리스트" 등 요청은 데이터에 있는 메모·직무 등만 참고.

---

## 8. 관련 파일 요약

| 구분 | 경로 |
|------|------|
| 프론트 UI | `frontend/src/components/ChatBot.tsx` |
| 프론트 마운트 | `frontend/src/App.tsx` |
| 채팅 API 라우트 | `backend/src/routes/chat.routes.ts` |
| LLM 서비스 | `backend/src/services/chatLLM.service.ts` |
| 라우트 등록 | `backend/src/server.ts` (`/api/chat`, `/api/a/chat`) |
| 환경/API 안내 | `ENV_AND_API_CHECK.md` |

---

## 9. 코드 적용(연결) 상세

아래는 챗봇이 실제 코드에서 어떻게 연결·적용되는지 정리한 내용이다.

### 9.1 프론트: 앱에 챗봇 마운트

`App.tsx`에서 라우트 트리 바깥에 전역으로 `<ChatBot />`을 렌더한다. 모든 경로에서 DOM에는 존재하지만, 컴포넌트 내부에서 노출 조건을 검사해 관리자/면접관일 때만 UI를 그린다.

```tsx
// frontend/src/App.tsx
import { ChatBot } from './components/ChatBot'
// ...
return (
  <BrowserRouter basename={basename} ...>
    <Routes>...</Routes>
    <ChatBot />
  </BrowserRouter>
)
```

### 9.2 프론트: 노출 조건·API 호출

`ChatBot.tsx`에서 경로·인증으로 노출 여부를 결정하고, 전송 시 `apiA.post('/chat', { message })`로 호출한다.

```tsx
// frontend/src/components/ChatBot.tsx
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { apiA } from '../utils/apiA'

const isAdmin = location.pathname.startsWith('/admin')
const isInterviewer = location.pathname.startsWith('/interviewer')
const showChat = isAuthenticated && (isAdmin || isInterviewer)
// ...
if (!showChat) return null

// 전송 시
const { data } = await apiA.post<{ success: boolean; data: { reply: string } }>('/chat', { message: text })
const reply = data?.data?.reply ?? '답변을 불러올 수 없습니다.'
```

- `apiA`: `frontend/src/utils/apiA.ts`에서 생성된 axios 인스턴스. 개발 시 `baseURL`은 `http://localhost:3000/api`(또는 호스트에 맞춤), 프로덕션에서는 `VITE_API_URL` 정규화 후 `/api/a` 사용.
- `apiA` 요청 인터셉터에서 `useAuthStore.getState().accessToken`으로 `Authorization: Bearer <token>`을 붙이므로, 로그인된 관리자/면접관만 유효한 요청이 된다.

### 9.3 백엔드: 채팅 라우트 등록

Express 앱에서 동일한 `chatRouter`를 `/api/chat`과 `/api/a/chat` 두 경로에 마운트한다. 프론트가 `apiA`로 `/chat`만 호출하므로, 실제 요청 URL은 `baseURL + '/chat'` → `/api/chat` 또는 `/api/a/chat`이 된다.

```ts
// backend/src/server.ts
import { chatRouter } from './routes/chat.routes';
// ...
app.use('/api/chat', chatRouter);
// ...
app.use('/api/a/chat', chatRouter);
```

### 9.4 백엔드: 라우트 핸들러·인증·컨텍스트

`chat.routes.ts`는 `POST /` 한 개만 정의하며, `adminOrInterviewerAuth`로 JWT 검증 후 `req.user`에 `role`, `interviewerId` 등을 넣는다. 그 다음 역할별로 컨텍스트 문자열을 만든 뒤 `getChatReply(contextText, message)`를 호출한다.

```ts
// backend/src/routes/chat.routes.ts
import { adminOrInterviewerAuth } from '../middlewares/auth.middleware';
import { dataService } from '../services/dataService';
import { getChatReply } from '../services/chatLLM.service';

chatRouter.post('/', adminOrInterviewerAuth, async (req, res) => {
  const user = req.user!;
  const message = (req.body?.message ?? '').trim();
  if (!message) throw new AppError(400, '질문을 입력해 주세요.');

  let contextText = '';
  if (user.role === 'ADMIN') {
    // 면접관 목록, 회의실, 지원자 현황, 면접 목록(최근 50건) 각각 try/catch로 조회
    // 실패 시 해당 블록만 "(로드 실패)"로 대체 후 결합
    contextText = [interviewList, roomList, candidateSummary, interviewSection].join('\n\n');
  } else {
    // 면접관: getAllInterviews + 본인 참여·담당 지원자만 필터링해 문자열 구성
    contextText = [ '=== 내가 참여하는 면접 목록 및 일정 ===', ... ].join('\n\n');
  }
  const reply = await getChatReply(contextText, message);
  res.json({ success: true, data: { reply } });
});
```

- 인증 미들웨어(`adminOrInterviewerAuth`)는 `auth.middleware.ts`에서 JWT 검증 후 `decoded.role === 'ADMIN' || 'INTERVIEWER'` 및 면접관일 때 `interviewerId` 존재 여부를 검사하고, `req.user`에 `AuthUser`를 설정한다.

### 9.5 백엔드: LLM 서비스 진입·큐·Groq 호출

`getChatReply`는 `chatLLM.service.ts`에 있으며, API 키 없으면 안내 문구를 반환하고, 있으면 컨텍스트를 프롬프트로 만든 뒤 속도 제한 큐를 거쳐 Groq API를 호출한다.

```ts
// backend/src/services/chatLLM.service.ts
const MIN_INTERVAL_MS = 900;
let lastRequestAt = 0;
const queue: Array<() => void> = [];

function waitRateLimit(): Promise<void> { /* 직렬화: 최소 900ms 간격 보장 */ }

export async function getChatReply(systemContext: string, userMessage: string): Promise<string> {
  if (!process.env.GROQ_API_KEY?.trim()) {
    return '챗봇을 사용하려면 .env에 GROQ_API_KEY를 설정해 주세요. ...';
  }
  const reply = await chatWithGroq(systemContext, userMessage);
  return reply;
}

// chatWithGroq 내부: buildPrompt()로 [참고 데이터]+[질문] 문자열 생성
// → waitRateLimit() 후 callGroq() 호출
// → 429 시 2초 대기 후 1회 재시도
// → callGroq: fetch(GROQ_CHAT_URL, { method: 'POST', Authorization: Bearer key, body: { model, messages, max_tokens: 1024, temperature: 0.3 } })
```

- 컨텍스트가 `MAX_CONTEXT_CHARS`(22000)를 넘으면 `buildPrompt`에서 앞부분만 잘라 넣고 잘림 안내 문구를 붙인다.
- 프롬프트 문자열은 "당신은 AJ Networks 면접/채용 시스템의 도우미 챗봇입니다. … [참고 데이터] … [사용자 질문] … [답변] (한국어, …)" 형태로, Groq의 `messages`에는 system 메시지 1개 + user 메시지(위 전체 프롬프트) 1개로 전달된다.

### 9.6 호출 흐름 요약

1. 사용자(관리자/면접관)가 `/admin/*` 또는 `/interviewer/*`에서 챗봇 패널을 열고 메시지 전송.
2. `ChatBot.tsx` → `apiA.post('/chat', { message })` (Authorization 헤더 자동).
3. 백엔드 `POST /api/chat` 또는 `POST /api/a/chat` → `adminOrInterviewerAuth` → `chat.routes.ts` 핸들러.
4. `dataService`로 역할별 컨텍스트 수집 → `getChatReply(contextText, message)`.
5. `chatLLM.service.ts`: `waitRateLimit()` → `buildPrompt()` → `callGroq()` (429 시 1회 재시도) → 답변 문자열 반환.
6. `res.json({ success: true, data: { reply } })` → 프론트에서 `data.data.reply`를 봇 메시지로 표시.

---

## 10. 버전·비고

- **LLM**: Groq만 사용 (Gemini 제거됨).
- **기본 모델**: `llama-3.1-8b-instant` (이전 `llama3-8b-8192` 단종 대체).
- 챗봇과 별도로, 면접 일정 공통 시간대 분석 등 다른 기능은 `commonSlotService` 등 별도 경로 사용.
