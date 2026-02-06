import type { Dayjs } from 'dayjs'

export interface BusinessHoursConfig {
  work_start_time?: string
  work_end_time?: string
  lunch_start_time?: string
  lunch_end_time?: string
}

const DEFAULT = {
  work_start_time: '09:00',
  work_end_time: '18:00',
  lunch_start_time: '12:00',
  lunch_end_time: '13:00',
}

function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = (timeStr || '').trim().split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

function parseConfig(config?: BusinessHoursConfig | null) {
  const workStart = parseTimeToMinutes(config?.work_start_time || DEFAULT.work_start_time)
  const workEnd = parseTimeToMinutes(config?.work_end_time || DEFAULT.work_end_time)
  const lunchStart = parseTimeToMinutes(config?.lunch_start_time || DEFAULT.lunch_start_time)
  const lunchEnd = parseTimeToMinutes(config?.lunch_end_time || DEFAULT.lunch_end_time)
  return { workStart, workEnd, lunchStart, lunchEnd }
}

/**
 * Ant Design TimePicker용 disabledTime.
 * 업무시간(점심 제외)만 선택 가능하도록 비활성화할 시간/분을 반환합니다.
 */
export function getDisabledTime(config?: BusinessHoursConfig | null) {
  const { workStart, workEnd, lunchStart, lunchEnd } = parseConfig(config)

  return function disabledTime(_current: Dayjs) {
    const disabledHours = () => {
      const hours: number[] = []
      for (let h = 0; h < 24; h++) {
        const minStart = h * 60
        const minEnd = (h + 1) * 60 - 1
        const hasAllowedMinute =
          (minStart < lunchStart && minEnd > workStart) ||   // 오전 업무 [workStart, lunchStart)
          (minStart < workEnd && minEnd > lunchEnd)         // 오후 업무 [lunchEnd, workEnd)
        if (!hasAllowedMinute) hours.push(h)
      }
      return hours
    }

    const disabledMinutes = (selectedHour: number) => {
      const minutes: number[] = []
      const hourStartMin = selectedHour * 60
      for (let m = 0; m < 60; m++) {
        const totalMin = hourStartMin + m
        const inLunch = totalMin >= lunchStart && totalMin < lunchEnd
        const beforeWork = totalMin < workStart
        const afterWork = totalMin >= workEnd
        if (inLunch || beforeWork || afterWork) minutes.push(m)
      }
      return minutes
    }

    return { disabledHours, disabledMinutes }
  }
}

/**
 * 업무 시작 시각을 분 단위로 반환 (dayjs 기본값 생성용).
 */
export function getWorkStartMinutes(config?: BusinessHoursConfig | null): number {
  return parseConfig(config).workStart
}

/**
 * 업무 종료 시각을 분 단위로 반환.
 */
export function getWorkEndMinutes(config?: BusinessHoursConfig | null): number {
  return parseConfig(config).workEnd
}

/**
 * 기본 시작/종료 시간(분). 슬롯 추가 시 업무 시작 ~ 시작+1시간.
 */
export function getDefaultSlotMinutes(config?: BusinessHoursConfig | null): { start: number; end: number } {
  const start = getWorkStartMinutes(config)
  const end = Math.min(start + 60, getWorkEndMinutes(config))
  return { start, end }
}
