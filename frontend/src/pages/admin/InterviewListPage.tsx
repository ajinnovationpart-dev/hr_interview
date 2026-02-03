import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, Table, Button, Tag, Space, Input, Select, DatePicker } from 'antd'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftOutlined, SearchOutlined } from '@ant-design/icons'
import { api } from '../../utils/api'
import dayjs from 'dayjs'
import type { ColumnsType } from 'antd/es/table'

const { RangePicker } = DatePicker

interface Interview {
  interview_id: string
  main_notice: string
  team_name: string
  status: string
  created_at: string
  proposed_date: string
  proposed_start_time: string
  proposed_end_time: string
}

const statusColors: Record<string, string> = {
  PENDING: 'orange',
  PARTIAL: 'blue',
  CONFIRMED: 'green',
  SCHEDULED: 'green',
  IN_PROGRESS: 'purple',
  COMPLETED: 'gray',
  CANCELLED: 'red',
  NO_SHOW: 'brown',
  NO_COMMON: 'red',
}

const statusLabels: Record<string, string> = {
  PENDING: '대기 중',
  PARTIAL: '진행 중',
  CONFIRMED: '완료',
  SCHEDULED: '예정',
  IN_PROGRESS: '진행중',
  COMPLETED: '완료',
  CANCELLED: '취소',
  NO_SHOW: '노쇼',
  NO_COMMON: '공통 없음',
}

export function InterviewListPage() {
  const navigate = useNavigate()
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [interviewerFilter, setInterviewerFilter] = useState<string>('')
  const [roomFilter, setRoomFilter] = useState<string>('')

  const { data: interviewers } = useQuery({
    queryKey: ['interviewers'],
    queryFn: async () => {
      const response = await api.get('/interviewers')
      return response.data.data
    },
  })

  const { data: rooms } = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      const response = await api.get('/rooms')
      return response.data.data
    },
  })

  const { data: searchResult, isLoading } = useQuery({
    queryKey: ['interviews', 'search', searchText, statusFilter, startDate, endDate, interviewerFilter, roomFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (searchText) params.append('mainNotice', searchText)
      if (statusFilter && statusFilter !== 'ALL') {
        params.append('status', statusFilter)
      }
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      if (interviewerFilter) params.append('interviewerId', interviewerFilter)
      if (roomFilter) params.append('roomId', roomFilter)
      params.append('page', '1')
      params.append('limit', '100')
      
      const response = await api.get(`/interviews/search?${params.toString()}`)
      return response.data.data
    },
  })

  const filteredInterviews = searchResult?.interviews || []

  const columns: ColumnsType<Interview> = [
    {
      title: '공고명',
      dataIndex: 'main_notice',
      key: 'main_notice',
      width: 200,
      ellipsis: true,
    },
    {
      title: '팀명',
      dataIndex: 'team_name',
      key: 'team_name',
      width: 150,
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={statusColors[status] || 'default'}>
          {statusLabels[status] || status}
        </Tag>
      ),
    },
    {
      title: '제안 일시',
      key: 'proposed_datetime',
      width: 200,
      render: (_, record: Interview) => (
        <span>
          {record.proposed_date} {record.proposed_start_time} ~ {record.proposed_end_time}
        </span>
      ),
    },
    {
      title: '생성일',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString('ko-KR'),
    },
    {
      title: '작업',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_, record: Interview) => (
        <Button type="link" onClick={() => navigate(`/admin/interviews/${record.interview_id}`)}>
          상세보기
        </Button>
      ),
    },
  ]

  return (
    <div>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/dashboard')}>
              뒤로가기
            </Button>
            <h1>면접 일정 목록</h1>
          </Space>
        </div>

        <Card>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Space style={{ width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <Space wrap>
                <Input
                  placeholder="공고명/팀명 검색..."
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{ width: 300 }}
                  allowClear
                />
                <Select
                  value={statusFilter}
                  onChange={setStatusFilter}
                  style={{ width: 150 }}
                >
                  <Select.Option value="ALL">전체 상태</Select.Option>
                  <Select.Option value="PENDING">대기 중</Select.Option>
                  <Select.Option value="PARTIAL">진행 중</Select.Option>
                  <Select.Option value="CONFIRMED">완료</Select.Option>
                  <Select.Option value="SCHEDULED">예정</Select.Option>
                  <Select.Option value="IN_PROGRESS">진행중</Select.Option>
                  <Select.Option value="COMPLETED">완료</Select.Option>
                  <Select.Option value="CANCELLED">취소</Select.Option>
                  <Select.Option value="NO_SHOW">노쇼</Select.Option>
                  <Select.Option value="NO_COMMON">공통 없음</Select.Option>
                </Select>
                <RangePicker
                  onChange={(dates) => {
                    if (dates) {
                      setStartDate(dates[0]?.format('YYYY-MM-DD') || '')
                      setEndDate(dates[1]?.format('YYYY-MM-DD') || '')
                    } else {
                      setStartDate('')
                      setEndDate('')
                    }
                  }}
                />
                <Select
                  placeholder="면접관 필터"
                  style={{ width: 200 }}
                  allowClear
                  value={interviewerFilter}
                  onChange={setInterviewerFilter}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={interviewers?.map((iv: any) => ({
                    label: `${iv.name} (${iv.email})`,
                    value: iv.interviewer_id,
                  }))}
                />
                <Select
                  placeholder="면접실 필터"
                  style={{ width: 200 }}
                  allowClear
                  value={roomFilter}
                  onChange={setRoomFilter}
                  options={rooms?.map((room: any) => ({
                    label: room.room_name,
                    value: room.room_id,
                  }))}
                />
              </Space>
              <div>
                총 {searchResult?.pagination?.total || filteredInterviews.length}건
              </div>
            </Space>

            <Table
              columns={columns}
              dataSource={filteredInterviews}
              loading={isLoading}
              rowKey="interview_id"
              pagination={{
                current: searchResult?.pagination?.page || 1,
                pageSize: searchResult?.pagination?.limit || 20,
                total: searchResult?.pagination?.total || filteredInterviews.length,
                showSizeChanger: true,
                showTotal: (total) => `총 ${total}건`,
              }}
              scroll={{ x: 1000 }}
            />
          </Space>
        </Card>
      </Space>
    </div>
  )
}
