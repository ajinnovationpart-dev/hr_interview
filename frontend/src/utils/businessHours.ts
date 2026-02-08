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
 * 설정 오류로 선택 가능한 시간이 없으면 비활성화 없음(전체 선택 가능)을 반환합니다.
 */
export function getDisabledTime(config?: BusinessHoursConfig | null) {
  const { workStart, workEnd, lunchStart, lunchEnd } = parseConfig(config)
  const workStartHour = Math.floor(workStart / 60)
  const workEndHour = Math.floor(workEnd / 60)
  const workEndMin = workEnd % 60
  const lunchStartHour = Math.floor(lunchStart / 60)
  const lunchEndHour = Math.floor(lunchEnd / 60)

  // 선택 가능한 시간이 하나도 없으면 제한 없음(딤 처리 안 함)
  const wouldDisableAllHours = workEnd <= workStart
  const noRestriction = () => ({ disabledHours: () => [], disabledMinutes: () => [], disabledSeconds: () => [] })

  return function disabledTime(_current: Dayjs) {
    if (wouldDisableAllHours) return noRestriction()

    const disabledHours = (): number[] => {
      const list: number[] = []
      for (let h = 0; h < 24; h++) {
        if (h < workStartHour) list.push(h)
        else if (h >= lunchStartHour && h < lunchEndHour) list.push(h)
        else if (h > workEndHour) list.push(h)
        else if (h === workEndHour && workEndMin === 0) list.push(h)
      }
      if (list.length >= 24) return []
      return list
    }

    const disabledMinutes = (selectedHour: number): number[] => {
      const list: number[] = []
      const hourStartMin = selectedHour * 60
      for (let m = 0; m < 60; m++) {
        const totalMin = hourStartMin + m
        if (totalMin < workStart) list.push(m)
        else if (totalMin >= lunchStart && totalMin < lunchEnd) list.push(m)
        else if (totalMin >= workEnd) list.push(m)
      }
      return list
    }

    const disabledSeconds = (): number[] => []

    return { disabledHours, disabledMinutes, disabledSeconds }
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

/**
 * 주어진 시간(분)이 업무시간(점심 제외) 내인지
 */
function isWithinBusinessHours(totalMinutes: number, config?: BusinessHoursConfig | null): boolean {
  const { workStart, workEnd, lunchStart, lunchEnd } = parseConfig(config)
  if (totalMinutes < workStart || totalMinutes >= workEnd) return false
  if (totalMinutes >= lunchStart && totalMinutes < lunchEnd) return false
  return true
}

/**
 * 시간(분)을 업무시간 구간으로 클램프. 업무 밖이면 가장 가까운 허용 시각(분) 반환.
 */
function clampMinutesToBusinessHours(totalMinutes: number, config?: BusinessHoursConfig | null): number {
  const { workStart, workEnd, lunchStart, lunchEnd } = parseConfig(config)
  if (totalMinutes < workStart) return workStart
  if (totalMinutes >= lunchStart && totalMinutes < lunchEnd) return lunchEnd
  if (totalMinutes >= workEnd) return workEnd - 30
  return totalMinutes
}

/**
 * Dayjs 값을 업무시간 내로 보정. (TimePicker value가 00:00 등으로 되어 있을 때 사용)
 */
export function clampTimeToBusinessHours(
  time: Dayjs | null | undefined,
  config?: BusinessHoursConfig | null
): Dayjs | null {
  if (!time || !time.isValid()) return null
  const totalMinutes = time.hour() * 60 + time.minute()
  if (isWithinBusinessHours(totalMinutes, config)) return time
  const clamped = clampMinutesToBusinessHours(totalMinutes, config)
  return time.hour(Math.floor(clamped / 60)).minute(clamped % 60).second(0).millisecond(0)
}
