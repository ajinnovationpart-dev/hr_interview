/**
 * 면접관 일정 조회 (Power Automate 연동)
 * 일정 없는 경우('일정없음')에만 면접 일정 선택 가능. 그 외(일정있음/오류/미응답)는 선택 불가.
 */

import { logger } from '../utils/logger';

const DEFAULT_START_TIME = '08:00:00';
const DEFAULT_END_TIME = '23:00:00';

export interface ScheduleCheckRequest {
  startdate: string; // ISO 형식 예: 2026-02-09T08:00:00
  enddate: string;
  userPrincipalName: string; // 면접관 이메일
}

/**
 * API 응답이 '일정없음'일 때만 false(선택 가능). '일정있음' 또는 오류/불명확 시 true(선택 불가).
 */
export async function checkInterviewerHasSchedule(
  startDate: string,
  endDate: string,
  userPrincipalName: string
): Promise<boolean> {
  const url = process.env.INTERVIEWER_SCHEDULE_CHECK_URL;
  if (!url || url.trim() === '') {
    logger.debug('INTERVIEWER_SCHEDULE_CHECK_URL not set, skip schedule check');
    return false;
  }

  const startdate = toApiDateTime(startDate, DEFAULT_START_TIME);
  const enddate = toApiDateTime(endDate, DEFAULT_END_TIME);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startdate,
        enddate,
        userPrincipalName,
      } as ScheduleCheckRequest),
    });

    const text = await res.text();

    if (!res.ok) {
      logger.warn('Interviewer schedule check API error', { status: res.status, url });
      return true;
    }

    const hasSchedule = parseScheduleCheckResponse(text);
    if (hasSchedule) {
      logger.info('Interviewer has existing schedule in period', { userPrincipalName, startdate, enddate });
    } else {
      logger.debug('Interviewer has no schedule in period (일정없음)', { userPrincipalName, startdate, enddate });
    }
    return hasSchedule;
  } catch (err) {
    logger.warn('Interviewer schedule check request failed', { error: err instanceof Error ? err.message : String(err) });
    return true;
  }
}

/** '일정없음'인 경우에만 false(선택 가능). 그 외는 true(선택 불가). */
function parseScheduleCheckResponse(text: string): boolean {
  const normalized = (text || '').trim();
  if (normalized.includes('일정없음')) return false;
  if (normalized.includes('일정있음')) return true;
  try {
    const json = normalized ? JSON.parse(normalized) : {};
    if (typeof json !== 'object') return true;
    const val = json.result ?? json.message ?? json.일정있음 ?? json.hasSchedule;
    if (val === '일정없음' || val === false) return false;
    if (val === '일정있음' || val === true) return true;
  } catch {
    // ignore
  }
  return true;
}

function toApiDateTime(dateStr: string, timeStr: string): string {
  return `${dateStr}T${timeStr}`;
}
