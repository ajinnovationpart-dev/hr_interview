import { useQuery } from '@tanstack/react-query'
import { Card, Table, Button, Tag, Space } from 'antd'
import { useNavigate } from 'react-router-dom'
import { PlusOutlined } from '@ant-design/icons'
import { api } from '../../utils/api'
import type { ColumnsType } from 'antd/es/table'

interface DashboardStats {
  pending: number
  partial: number
  confirmed: number
  noCommon: number
}

interface RecentInterview {
  interviewId: string
  mainNotice: string
  teamName: string
  status: string
  createdAt: string
}

interface DashboardData {
  stats: DashboardStats
  recentInterviews: RecentInterview[]
}

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

export function DashboardPage() {
  const navigate = useNavigate()

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await api.get('/interviews/dashboard')
      return response.data.data
    },
  })

  const columns: ColumnsType<RecentInterview> = [
    {
      title: '공고명',
      dataIndex: 'mainNotice',
      key: 'mainNotice',
    },
    {
      title: '팀명',
      dataIndex: 'teamName',
      key: 'teamName',
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColors[status] || 'default'}>
          {statusLabels[status] || status}
        </Tag>
      ),
    },
    {
      title: '생성일',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString('ko-KR'),
    },
    {
      title: '작업',
      key: 'action',
      render: (_, record) => (
        <Button type="link" onClick={() => navigate(`/admin/interviews/${record.interviewId}`)}>
          상세보기
        </Button>
      ),
    },
  ]

  return (
    <div>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>대시보드</h1>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={() => navigate('/admin/interviews/new')}
          >
            새 면접 등록
          </Button>
        </div>

        {data && (
          <Space size="middle" style={{ width: '100%' }}>
            <Card title="대기 중" style={{ flex: 1 }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#fa8c16' }}>
                {data.stats.pending}
              </div>
            </Card>
            <Card title="진행 중" style={{ flex: 1 }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1890ff' }}>
                {data.stats.partial}
              </div>
            </Card>
            <Card title="완료" style={{ flex: 1 }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#52c41a' }}>
                {data.stats.confirmed}
              </div>
            </Card>
            <Card title="공통 없음" style={{ flex: 1 }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ff4d4f' }}>
                {data.stats.noCommon}
              </div>
            </Card>
          </Space>
        )}

        <Card title="최근 면접 일정">
          <Table
            columns={columns}
            dataSource={data?.recentInterviews}
            loading={isLoading}
            rowKey="interviewId"
            pagination={{ pageSize: 10 }}
          />
        </Card>
      </Space>
    </div>
  )
}
