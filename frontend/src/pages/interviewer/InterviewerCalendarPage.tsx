import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, Calendar, Badge, Modal, Descriptions, Tag } from 'antd'
import { CalendarOutlined } from '@ant-design/icons'
import { apiA } from '../../utils/apiA'
import dayjs, { Dayjs } from 'dayjs'
import type { CalendarProps } from 'antd'

interface InterviewEvent {
  interview_id: string
  main_notice: string
  team_name: string
  date: string
  startTime: string
  endTime: string
  status: string
}

export function InterviewerCalendarPage() {
  const [currentMonth, setCurrentMonth] = useState<Dayjs>(dayjs())
  const [selectedEvent, setSelectedEvent] = useState<InterviewEvent | null>(null)

  const { data } = useQuery({
    queryKey: ['interviewer-portal', 'interviews'],
    queryFn: async () => {
      const response = await apiA.get('/interviewer-portal/interviews')
      return response.data.data
    },
  })

  const events: InterviewEvent[] = (data?.interviews || []).map((i: any) => {
    const isConfirmed = i.status === 'CONFIRMED' && i.confirmedSchedule
    const date = isConfirmed ? i.confirmedSchedule.date : i.proposed_date
    const startTime = isConfirmed ? i.confirmedSchedule.startTime : i.proposed_start_time
    const endTime = isConfirmed ? i.confirmedSchedule.endTime : i.proposed_end_time
    return {
      interview_id: i.interview_id,
      main_notice: i.main_notice,
      team_name: i.team_name,
      date: date || '',
      startTime: startTime || '',
      endTime: endTime || '',
      status: i.status,
    }
  }).filter((e: InterviewEvent) => e.date)

  const getListData = (value: Dayjs) => {
    const dateStr = value.format('YYYY-MM-DD')
    return events.filter((e) => e.date === dateStr)
  }

  const dateCellRender: CalendarProps<Dayjs>['cellRender'] = (value) => {
    const listData = getListData(value)
    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {listData.map((evt) => (
          <li key={evt.interview_id} style={{ marginBottom: 4 }}>
            <Badge
              status={evt.status === 'CONFIRMED' ? 'success' : evt.status === 'CANCELLED' ? 'error' : 'processing'}
              text={
                <span
                  style={{ fontSize: 12, cursor: 'pointer' }}
                  onClick={() => setSelectedEvent(evt)}
                >
                  {evt.main_notice} {evt.startTime}
                </span>
              }
            />
          </li>
        ))}
      </ul>
    )
  }

  const onPanelChange = (value: Dayjs) => {
    setCurrentMonth(value)
  }

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={
          <span>
            <CalendarOutlined style={{ marginRight: 8 }} />
            면접 일정 캘린더
          </span>
        }
      >
        <Calendar
          value={currentMonth}
          onPanelChange={onPanelChange}
          cellRender={dateCellRender}
        />
      </Card>

      <Modal
        title="면접 일정"
        open={!!selectedEvent}
        onCancel={() => setSelectedEvent(null)}
        footer={null}
      >
        {selectedEvent && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="공고명">{selectedEvent.main_notice}</Descriptions.Item>
            <Descriptions.Item label="팀명">{selectedEvent.team_name}</Descriptions.Item>
            <Descriptions.Item label="일시">
              {selectedEvent.date} {selectedEvent.startTime} ~ {selectedEvent.endTime}
            </Descriptions.Item>
            <Descriptions.Item label="상태">
              <Tag color={selectedEvent.status === 'CONFIRMED' ? 'green' : 'blue'}>
                {selectedEvent.status === 'CONFIRMED' ? '확정' : selectedEvent.status}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}
