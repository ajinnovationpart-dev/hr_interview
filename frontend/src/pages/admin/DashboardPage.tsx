import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, Table, Button, Tag, Space, Input, Select, Row, Col, Alert } from 'antd'
import { useNavigate } from 'react-router-dom'
import { PlusOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import { api } from '../../utils/api'
import type { ColumnsType } from 'antd/es/table'

interface DashboardStats {
  pending: number
  partial: number
  confirmed: number
  noCommon: number
  scheduled?: number
  inProgress?: number
  completed?: number
  cancelled?: number
  noShow?: number
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
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await api.get('/interviews/dashboard')
      return response.data.data
    },
    retry: 1,
    retryOnMount: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })

  // 에러 처리
  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          message="데이터를 불러올 수 없습니다"
          description={
            <div>
              <p>백엔드 서버에 연결할 수 없습니다.</p>
              <p style={{ marginTop: '8px', color: '#666' }}>
                {error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}
              </p>
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={() => window.location.reload()}
                style={{ marginTop: '16px' }}
              >
                새로고침
              </Button>
            </div>
          }
          type="error"
          showIcon
        />
      </div>
    )
  }

  // 필터링된 면접 목록
  const filteredInterviews = data?.recentInterviews?.filter(interview => {
    // 검색 필터
    const matchesSearch = !searchText || 
      interview.mainNotice.toLowerCase().includes(searchText.toLowerCase()) ||
      interview.teamName.toLowerCase().includes(searchText.toLowerCase())
    
    // 상태 필터
    const matchesStatus = statusFilter === 'ALL' || interview.status === statusFilter
    
    return matchesSearch && matchesStatus
  }) || []

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
          <>
            <Row gutter={16}>
              <Col span={6}>
                <Card title="대기 중">
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#fa8c16' }}>
                    {data.stats.pending || 0}
                  </div>
                </Card>
              </Col>
              <Col span={6}>
                <Card title="진행 중">
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1890ff' }}>
                    {data.stats.partial || 0}
                  </div>
                </Card>
              </Col>
              <Col span={6}>
                <Card title="완료">
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#52c41a' }}>
                    {data.stats.confirmed || 0}
                  </div>
                </Card>
              </Col>
              <Col span={6}>
                <Card title="공통 없음">
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ff4d4f' }}>
                    {data.stats.noCommon || 0}
                  </div>
                </Card>
              </Col>
            </Row>
            {(data.stats.scheduled || data.stats.inProgress || data.stats.completed || data.stats.cancelled || data.stats.noShow) && (
              <Row gutter={16} style={{ marginTop: 16 }}>
                {data.stats.scheduled !== undefined && (
                  <Col span={6}>
                    <Card title="예정">
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
                        {data.stats.scheduled}
                      </div>
                    </Card>
                  </Col>
                )}
                {data.stats.inProgress !== undefined && (
                  <Col span={6}>
                    <Card title="진행중">
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#722ed1' }}>
                        {data.stats.inProgress}
                      </div>
                    </Card>
                  </Col>
                )}
                {data.stats.completed !== undefined && (
                  <Col span={6}>
                    <Card title="완료">
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#8c8c8c' }}>
                        {data.stats.completed}
                      </div>
                    </Card>
                  </Col>
                )}
                {data.stats.cancelled !== undefined && (
                  <Col span={6}>
                    <Card title="취소">
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff4d4f' }}>
                        {data.stats.cancelled}
                      </div>
                    </Card>
                  </Col>
                )}
                {data.stats.noShow !== undefined && (
                  <Col span={6}>
                    <Card title="노쇼">
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#d46b08' }}>
                        {data.stats.noShow}
                      </div>
                    </Card>
                  </Col>
                )}
              </Row>
            )}
          </>
        )}

        <Card 
          title="최근 면접 일정"
          extra={
            <Space>
              <Input
                placeholder="공고명/팀명 검색..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 250 }}
                allowClear
              />
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 120 }}
              >
                <Select.Option value="ALL">전체</Select.Option>
                <Select.Option value="PENDING">대기 중</Select.Option>
                <Select.Option value="PARTIAL">진행 중</Select.Option>
                <Select.Option value="CONFIRMED">완료</Select.Option>
                <Select.Option value="NO_COMMON">공통 없음</Select.Option>
              </Select>
              <Button type="link" onClick={() => navigate('/admin/interviews')}>
                전체 목록 보기
              </Button>
            </Space>
          }
        >
          <Table
            columns={columns}
            dataSource={filteredInterviews}
            loading={isLoading}
            rowKey="interviewId"
            pagination={{ pageSize: 10 }}
          />
        </Card>
      </Space>
    </div>
  )
}
