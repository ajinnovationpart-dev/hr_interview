import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import {
  Card,
  DatePicker,
  TimePicker,
  Button,
  Space,
  message,
  Descriptions,
  Tag,
  Spin,
} from 'antd'
import dayjs, { Dayjs } from 'dayjs'
import { apiA } from '../../utils/apiA'
import { getDefaultSlotMinutes, clampTimeToBusinessHours } from '../../utils/businessHours'

export function ConfirmPage() {
  const { token } = useParams<{ token: string }>()
  const [selectedSlots, setSelectedSlots] = useState<Array<{ date: Dayjs; startTime: Dayjs; endTime: Dayjs }>>([])

  const { data, isLoading } = useQuery({
    queryKey: ['confirm', token],
    queryFn: async () => {
      const response = await apiA.get(`/confirm/${token}`)
      return response.data.data
    },
  })

  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: async () => {
      try {
        const response = await apiA.get('/config')
        return response.data.data
      } catch {
        return null
      }
    },
    retry: false,
  })

  const defaultSlot = getDefaultSlotMinutes(config)
  const defaultStart = dayjs().hour(Math.floor(defaultSlot.start / 60)).minute(defaultSlot.start % 60).second(0).millisecond(0)
  const defaultEnd = dayjs().hour(Math.floor(defaultSlot.end / 60)).minute(defaultSlot.end % 60).second(0).millisecond(0)

  const mutation = useMutation({
    mutationFn: async (slots: Array<{ date: string; startTime: string; endTime: string }>) => {
      const response = await apiA.post(`/confirm/${token}`, { selectedSlots: slots })
      return response.data
    },
    onSuccess: (data) => {
      message.success(data.data.message)
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '일정 선택에 실패했습니다')
    },
  })

  const handleAddSlot = () => {
    setSelectedSlots([...selectedSlots, { date: dayjs(), startTime: defaultStart, endTime: defaultEnd }])
  }

  const handleRemoveSlot = (index: number) => {
    setSelectedSlots(selectedSlots.filter((_, i) => i !== index))
  }

  const handleUpdateSlot = (index: number, field: 'date' | 'startTime' | 'endTime', value: Dayjs) => {
    const updated = [...selectedSlots]
    const clamped =
      field === 'startTime' || field === 'endTime' ? clampTimeToBusinessHours(value, config) ?? value : value
    updated[index] = { ...updated[index], [field]: clamped }
    setSelectedSlots(updated)
  }

  const handleSubmit = () => {
    if (selectedSlots.length === 0) {
      message.warning('최소 1개의 시간대를 선택해주세요')
      return
    }

    const slots = selectedSlots.map(slot => ({
      date: slot.date.format('YYYY-MM-DD'),
      startTime: slot.startTime.format('HH:mm'),
      endTime: slot.endTime.format('HH:mm'),
    }))

    mutation.mutate(slots)
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!data) {
    return <div>면접 정보를 불러올 수 없습니다</div>
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card title="면접 정보">
          <Descriptions column={1}>
            <Descriptions.Item label="공고명">{data.mainNotice}</Descriptions.Item>
            <Descriptions.Item label="팀명">{data.teamName}</Descriptions.Item>
            <Descriptions.Item label="면접자">
              {data.candidates.join(', ')}
            </Descriptions.Item>
            <Descriptions.Item label="제안 일시">
              {data.proposedSlot.date} {data.proposedSlot.startTime} ~ {data.proposedSlot.endTime}
            </Descriptions.Item>
            <Descriptions.Item label="응답 현황">
              <Tag color="blue">
                {data.responseStatus.responded} / {data.responseStatus.total}명 응답 완료
              </Tag>
              {data.responseStatus.respondedList.length > 0 && (
                <span style={{ marginLeft: 8 }}>
                  ({data.responseStatus.respondedList.join(', ')})
                </span>
              )}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="가능한 일정 선택">
          <Space direction="vertical" style={{ width: '100%' }}>
            {selectedSlots.map((slot, index) => (
              <Card key={index} size="small">
                <Space>
                  <DatePicker
                    value={slot.date}
                    onChange={(date) => date && handleUpdateSlot(index, 'date', date)}
                  />
                  <TimePicker
                    value={clampTimeToBusinessHours(slot.startTime, config) ?? slot.startTime}
                    format="HH:mm"
                    minuteStep={30}
                    showNow={false}
                    changeOnScroll
                    onChange={(time) => time && handleUpdateSlot(index, 'startTime', clampTimeToBusinessHours(time, config) ?? time)}
                  />
                  <span>~</span>
                  <TimePicker
                    value={clampTimeToBusinessHours(slot.endTime, config) ?? slot.endTime}
                    format="HH:mm"
                    minuteStep={30}
                    showNow={false}
                    changeOnScroll
                    onChange={(time) => time && handleUpdateSlot(index, 'endTime', clampTimeToBusinessHours(time, config) ?? time)}
                  />
                  <Button danger onClick={() => handleRemoveSlot(index)}>
                    삭제
                  </Button>
                </Space>
              </Card>
            ))}

            <Button type="dashed" onClick={handleAddSlot} block>
              시간대 추가
            </Button>

            <Button
              type="primary"
              onClick={handleSubmit}
              loading={mutation.isPending}
              block
              size="large"
              style={{ 
                minHeight: '48px',
                fontSize: '16px',
                fontWeight: 600,
                marginTop: '16px'
              }}
            >
              일정 제출
            </Button>
          </Space>
        </Card>
      </Space>
    </div>
  )
}
