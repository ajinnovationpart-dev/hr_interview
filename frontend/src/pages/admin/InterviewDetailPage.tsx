import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Table, Tag, Button, Space, Descriptions } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { api } from '../../utils/api'
import type { ColumnsType } from 'antd/es/table'

const statusColors: Record<string, string> = {
  PENDING: 'orange',
  PARTIAL: 'blue',
  CONFIRMED: 'green',
  NO_COMMON: 'red',
}

const statusLabels: Record<string, string> = {
  PENDING: '대기 중',
  PARTIAL: '진행 중',
  CONFIRMED: '완료',
  NO_COMMON: '공통 없음',
}

export function InterviewDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['interview', id],
    queryFn: async () => {
      const response = await api.get(`/interviews/${id}`)
      return response.data.data
    },
  })

  const responseColumns: ColumnsType<any> = [
    {
      title: '이름',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '이메일',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '응답 상태',
      key: 'responded',
      render: (_, record) => (
        <Tag color={record.responded ? 'green' : 'red'}>
          {record.responded ? '응답 완료' : '미응답'}
        </Tag>
      ),
    },
    {
      title: '응답 시간',
      dataIndex: 'respondedAt',
      key: 'respondedAt',
      render: (date: string) => date ? new Date(date).toLocaleString('ko-KR') : '-',
    },
  ]

  const timeSelectionColumns: ColumnsType<any> = [
    {
      title: '면접관',
      dataIndex: 'interviewerName',
      key: 'interviewerName',
    },
    {
      title: '날짜',
      dataIndex: 'slot_date',
      key: 'slot_date',
    },
    {
      title: '시간',
      key: 'time',
      render: (_, record) => `${record.start_time} ~ ${record.end_time}`,
    },
  ]

  return (
    <div>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/dashboard')}>
          목록으로
        </Button>

        {data && (
          <>
            <Card title="면접 정보">
              <Descriptions column={2}>
                <Descriptions.Item label="공고명">{data.interview.main_notice}</Descriptions.Item>
                <Descriptions.Item label="팀명">{data.interview.team_name}</Descriptions.Item>
                <Descriptions.Item label="상태">
                  <Tag color={statusColors[data.interview.status]}>
                    {statusLabels[data.interview.status]}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="면접자">{data.interview.candidates}</Descriptions.Item>
                <Descriptions.Item label="시작 일시">
                  {new Date(data.interview.start_datetime).toLocaleString('ko-KR')}
                </Descriptions.Item>
                <Descriptions.Item label="종료 일시">
                  {new Date(data.interview.end_datetime).toLocaleString('ko-KR')}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {data.confirmedSchedule && (
              <Card title="확정 일정">
                <Descriptions>
                  <Descriptions.Item label="날짜">{data.confirmedSchedule.confirmed_date}</Descriptions.Item>
                  <Descriptions.Item label="시간">
                    {data.confirmedSchedule.confirmed_start_time} ~ {data.confirmedSchedule.confirmed_end_time}
                  </Descriptions.Item>
                  <Descriptions.Item label="확정 시간">
                    {new Date(data.confirmedSchedule.confirmed_at).toLocaleString('ko-KR')}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            )}

            <Card title="면접관 응답 현황">
              <Table
                columns={responseColumns}
                dataSource={data.responseStatus}
                loading={isLoading}
                rowKey="interviewerId"
                pagination={false}
              />
            </Card>

            {data.timeSelections && data.timeSelections.length > 0 && (
              <Card title="선택된 시간대">
                <Table
                  columns={timeSelectionColumns}
                  dataSource={data.timeSelections}
                  loading={isLoading}
                  rowKey="selection_id"
                  pagination={false}
                />
              </Card>
            )}

            {data.commonSlots && data.commonSlots.length > 0 && (
              <Card title="공통 시간대">
                <Space direction="vertical">
                  {data.commonSlots.map((slot: any, index: number) => (
                    <Tag key={index} color="blue">
                      {slot.date} {slot.startTime} ~ {slot.endTime}
                    </Tag>
                  ))}
                </Space>
              </Card>
            )}
          </>
        )}
      </Space>
    </div>
  )
}
