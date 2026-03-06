import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { Alert, Card, Button, Space, message, Descriptions, Tag, Spin, Checkbox, Typography } from 'antd'
import { apiA } from '../../utils/apiA'

interface ProposedSlot {
  slotId: string
  date: string
  startTime: string
  endTime: string
  sortOrder?: number
}

const { Text } = Typography

export function ConfirmPage() {
  const { token } = useParams<{ token: string }>()
  const queryClient = useQueryClient()
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([])

  const { data, isLoading } = useQuery({
    queryKey: ['confirm', token],
    queryFn: async () => {
      const response = await apiA.get(`/confirm/${token}`)
      return response.data.data
    },
  })

  const proposedSlots = ((data?.proposedSlots || []) as ProposedSlot[])

  useEffect(() => {
    if (!data) return
    if (data.status === 'CONFIRMED' || data.status === 'PENDING_APPROVAL') return
    if (proposedSlots.length === 0) return
    if (selectedSlotIds.length > 0) return
    setSelectedSlotIds([proposedSlots[0].slotId])
  }, [data, proposedSlots, selectedSlotIds.length])

  const mutation = useMutation({
    mutationFn: async (slotIds: string[]) => {
      const response = await apiA.post(`/confirm/${token}`, { selectedSlotIds: slotIds })
      return response.data
    },
    onSuccess: (data) => {
      message.success(data.data.message)
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '일정 선택에 실패했습니다')
    },
  })

  const acceptMutation = useMutation({
    mutationFn: async () => {
      const response = await apiA.post(`/confirm/${token}/accept`)
      return response.data
    },
    onSuccess: () => {
      message.success('일정 수락이 완료되었습니다')
      queryClient.invalidateQueries({ queryKey: ['confirm', token] })
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '일정 수락에 실패했습니다')
    },
  })

  const handleSubmit = () => {
    if (selectedSlotIds.length === 0) {
      message.warning('최소 1개의 제안 일정을 선택해주세요')
      return
    }
    mutation.mutate(selectedSlotIds)
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
            <Descriptions.Item label="제안 일정">
              {proposedSlots.map((slot) => (
                <div key={slot.slotId}>
                  {slot.date} {slot.startTime} ~ {slot.endTime}
                </div>
              ))}
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

        {data.status === 'CONFIRMED' && data.confirmedSchedule && (
          <Card title="확정된 일정">
            <Descriptions column={1}>
              <Descriptions.Item label="날짜">{data.confirmedSchedule.date}</Descriptions.Item>
              <Descriptions.Item label="시간">
                {data.confirmedSchedule.startTime} ~ {data.confirmedSchedule.endTime}
              </Descriptions.Item>
            </Descriptions>
            {data.myAcceptedAt ? (
              <Alert type="success" showIcon message="일정 수락을 완료하셨습니다" style={{ marginTop: 16 }} />
            ) : (
              <Button
                type="primary"
                size="large"
                loading={acceptMutation.isPending}
                onClick={() => acceptMutation.mutate()}
                style={{ marginTop: 16 }}
              >
                일정 수락하기
              </Button>
            )}
          </Card>
        )}

        {data.status === 'PENDING_APPROVAL' && (
          <Alert
            type="info"
            showIcon
            message="현재 일정이 확정 대기 상태입니다."
            description="관리자 승인 후 확정되면 이 화면에서 일정 수락 상태를 확인할 수 있습니다."
          />
        )}

        {data.status !== 'CONFIRMED' && data.status !== 'PENDING_APPROVAL' && (
        <Card title="가능한 일정 선택">
          <Space direction="vertical" style={{ width: '100%' }}>
            {data.externalScheduleExists && (
              <Alert
                type="warning"
                showIcon
                message="해당 기간에 이미 일정이 있어 일정 선택을 할 수 없습니다."
                description="다른 일정이 등록된 상태입니다. 관리자에게 문의해 주세요."
                style={{ marginBottom: 16 }}
              />
            )}
            {proposedSlots.length === 0 ? (
              <Alert type="warning" showIcon message="선택 가능한 제안 일정이 없습니다. 관리자에게 문의해 주세요." />
            ) : (
              <Checkbox.Group
                style={{ width: '100%' }}
                value={selectedSlotIds}
                onChange={(values) => setSelectedSlotIds(values as string[])}
                disabled={data.externalScheduleExists}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  {proposedSlots.map((slot) => (
                    <Card key={slot.slotId} size="small" style={{ width: '100%' }}>
                      <Checkbox value={slot.slotId}>
                        <Text strong>{slot.date}</Text>
                        <Text style={{ marginLeft: 8 }}>{slot.startTime} ~ {slot.endTime}</Text>
                      </Checkbox>
                    </Card>
                  ))}
                </Space>
              </Checkbox.Group>
            )}

            <Button
              type="primary"
              onClick={handleSubmit}
              loading={mutation.isPending}
              block
              size="large"
              disabled={data.externalScheduleExists}
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
        )}
      </Space>
    </div>
  )
}
