import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Table, Tag, Button, Space, Descriptions, message, Popconfirm, Modal, Form, DatePicker, TimePicker, Input, Select } from 'antd'
import { ArrowLeftOutlined, ThunderboltOutlined, CheckCircleOutlined, CopyOutlined, DeleteOutlined, BellOutlined, EditOutlined, CloseCircleOutlined, CheckCircleFilled } from '@ant-design/icons'
import dayjs from 'dayjs'
import { api } from '../../utils/api'
import type { ColumnsType } from 'antd/es/table'

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

export function InterviewDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false)
  const [isNoShowModalOpen, setIsNoShowModalOpen] = useState(false)
  const [editForm] = Form.useForm()
  const [cancelForm] = Form.useForm()
  const [completeForm] = Form.useForm()
  const [noShowForm] = Form.useForm()

  const { data, isLoading } = useQuery({
    queryKey: ['interview', id],
    queryFn: async () => {
      const response = await api.get(`/interviews/${id}`)
      return response.data.data
    },
  })

  // AI 분석 mutation
  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/interviews/${id}/analyze`)
      return response.data
    },
    onSuccess: (result) => {
      message.success(result.message || 'AI 분석이 완료되었습니다.')
      // 데이터 새로고침
      queryClient.invalidateQueries({ queryKey: ['interview', id] })
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'AI 분석 중 오류가 발생했습니다.')
    },
  })

  // 리마인더 발송 mutation
  const remindMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/interviews/${id}/remind`)
      return response.data
    },
    onSuccess: (result) => {
      message.success(result.message || '리마인더가 발송되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['interview', id] })
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '리마인더 발송 중 오류가 발생했습니다.')
    },
  })

  // 면접 삭제 mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await api.delete(`/interviews/${id}`)
      return response.data
    },
    onSuccess: () => {
      message.success('면접이 삭제되었습니다.')
      navigate('/admin/dashboard')
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '면접 삭제 중 오류가 발생했습니다.')
    },
  })

  // 포털 링크 복사
  const copyPortalLink = async (interviewerId: string) => {
    try {
      const response = await api.get(`/interviews/${id}/portal-link/${interviewerId}`)
      const link = response.data.data.portalLink
      
      await navigator.clipboard.writeText(link)
      message.success('포털 링크가 클립보드에 복사되었습니다.')
    } catch (error: any) {
      message.error(error.response?.data?.message || '링크 복사에 실패했습니다.')
    }
  }

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
    {
      title: '작업',
      key: 'action',
      render: (_, record) => (
        !record.responded && (
          <Button
            type="link"
            icon={<CopyOutlined />}
            onClick={() => copyPortalLink(record.interviewerId)}
          >
            링크 복사
          </Button>
        )
      ),
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
            <Card 
              title="면접 정보"
              extra={
                <Space>
                  <Button
                    icon={<BellOutlined />}
                    onClick={() => remindMutation.mutate()}
                    loading={remindMutation.isPending}
                    disabled={data.interview.status === 'CONFIRMED'}
                  >
                    리마인더 발송
                  </Button>
                  <Popconfirm
                    title="면접 삭제"
                    description="이 면접을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
                    onConfirm={() => deleteMutation.mutate()}
                    okText="삭제"
                    cancelText="취소"
                    okButtonProps={{ danger: true }}
                  >
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      loading={deleteMutation.isPending}
                    >
                      삭제
                    </Button>
                  </Popconfirm>
                </Space>
              }
            >
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
              <Card 
                title="선택된 시간대"
                extra={
                  <Button
                    type="primary"
                    icon={<ThunderboltOutlined />}
                    loading={analyzeMutation.isPending}
                    onClick={() => analyzeMutation.mutate()}
                    disabled={data.interview.status === 'CONFIRMED'}
                  >
                    AI 분석으로 공통 시간대 찾기
                  </Button>
                }
              >
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
              <Card 
                title={
                  <Space>
                    <ThunderboltOutlined style={{ color: '#1890ff' }} />
                    <span>AI 분석 결과 - 공통 시간대</span>
                  </Space>
                }
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  {data.commonSlots.map((slot: any, index: number) => (
                    <Card 
                      key={index} 
                      size="small"
                      style={{ 
                        border: '1px solid #1890ff',
                        borderRadius: '8px',
                      }}
                    >
                      <Space>
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                        <Tag color="blue" style={{ fontSize: '14px', padding: '4px 12px' }}>
                          {slot.date} {slot.startTime} ~ {slot.endTime}
                        </Tag>
                      </Space>
                    </Card>
                  ))}
                </Space>
              </Card>
            )}

            {data.timeSelections && data.timeSelections.length > 0 && (!data.commonSlots || data.commonSlots.length === 0) && (
              <Card 
                title="공통 시간대 분석"
                extra={
                  <Button
                    type="primary"
                    icon={<ThunderboltOutlined />}
                    loading={analyzeMutation.isPending}
                    onClick={() => analyzeMutation.mutate()}
                    disabled={data.interview.status === 'CONFIRMED'}
                  >
                    AI 분석 실행
                  </Button>
                }
              >
                <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                  AI 분석을 실행하여 공통 시간대를 찾아보세요.
                </div>
              </Card>
            )}

            <Card 
              title="면접 관리"
              extra={
                <Space>
                  {!['COMPLETED', 'CANCELLED'].includes(data.interview.status) && (
                    <>
                      <Button
                        icon={<EditOutlined />}
                        onClick={() => {
                          editForm.setFieldsValue({
                            interviewDate: data.interview.proposed_date ? dayjs(data.interview.proposed_date) : null,
                            startTime: data.interview.proposed_start_time ? dayjs(data.interview.proposed_start_time, 'HH:mm') : null,
                            duration: 60,
                          })
                          setIsEditModalOpen(true)
                        }}
                      >
                        일정 수정
                      </Button>
                      <Button
                        danger
                        icon={<CloseCircleOutlined />}
                        onClick={() => setIsCancelModalOpen(true)}
                      >
                        취소
                      </Button>
                    </>
                  )}
                  {['SCHEDULED', 'IN_PROGRESS'].includes(data.interview.status) && (
                    <Button
                      type="primary"
                      icon={<CheckCircleFilled />}
                      onClick={() => setIsCompleteModalOpen(true)}
                    >
                      완료 처리
                    </Button>
                  )}
                  {['SCHEDULED', 'IN_PROGRESS'].includes(data.interview.status) && (
                    <Button
                      danger
                      icon={<CloseCircleOutlined />}
                      onClick={() => setIsNoShowModalOpen(true)}
                    >
                      노쇼 처리
                    </Button>
                  )}
                </Space>
              }
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    Modal.confirm({
                      title: '면접 삭제',
                      content: '이 면접을 삭제하시겠습니까? 관련된 모든 데이터가 삭제됩니다.',
                      onOk: () => deleteMutation.mutate(),
                    })
                  }}
                >
                  면접 삭제
                </Button>
              </Space>
            </Card>
          </>
        )}
      </Space>

      {/* 일정 수정 모달 */}
      <Modal
        title="면접 일정 수정"
        open={isEditModalOpen}
        onOk={async () => {
          try {
            const values = await editForm.validateFields()
            await api.put(`/interviews/${id}/schedule`, {
              interviewDate: values.interviewDate.format('YYYY-MM-DD'),
              startTime: values.startTime.format('HH:mm'),
              duration: values.duration,
            })
            message.success('면접 일정이 수정되었습니다')
            queryClient.invalidateQueries({ queryKey: ['interview', id] })
            setIsEditModalOpen(false)
            editForm.resetFields()
          } catch (error: any) {
            if (error.response) {
              message.error(error.response.data.message || '일정 수정에 실패했습니다')
            }
          }
        }}
        onCancel={() => {
          setIsEditModalOpen(false)
          editForm.resetFields()
        }}
        okText="수정"
        cancelText="취소"
      >
        <Form form={editForm} layout="vertical">
          <Form.Item
            label="면접 날짜"
            name="interviewDate"
            rules={[{ required: true, message: '면접 날짜를 선택해주세요' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            label="시작 시간"
            name="startTime"
            rules={[{ required: true, message: '시작 시간을 선택해주세요' }]}
          >
            <TimePicker format="HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            label="소요 시간 (분)"
            name="duration"
            rules={[{ required: true, message: '소요 시간을 입력해주세요' }]}
          >
            <Input type="number" min={30} step={30} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 취소 모달 */}
      <Modal
        title="면접 취소"
        open={isCancelModalOpen}
        onOk={async () => {
          try {
            const values = await cancelForm.validateFields()
            await api.post(`/interviews/${id}/cancel`, {
              reason: values.reason,
              notifyAll: true,
            })
            message.success('면접이 취소되었습니다')
            queryClient.invalidateQueries({ queryKey: ['interview', id] })
            setIsCancelModalOpen(false)
            cancelForm.resetFields()
          } catch (error: any) {
            if (error.response) {
              message.error(error.response.data.message || '면접 취소에 실패했습니다')
            }
          }
        }}
        onCancel={() => {
          setIsCancelModalOpen(false)
          cancelForm.resetFields()
        }}
        okText="취소"
        cancelText="닫기"
        okButtonProps={{ danger: true }}
      >
        <Form form={cancelForm} layout="vertical">
          <Form.Item
            label="취소 사유"
            name="reason"
            rules={[{ required: true, message: '취소 사유를 입력해주세요' }]}
          >
            <Input.TextArea rows={4} placeholder="취소 사유를 입력해주세요" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 완료 처리 모달 */}
      <Modal
        title="면접 완료 처리"
        open={isCompleteModalOpen}
        onOk={async () => {
          try {
            const values = await completeForm.validateFields()
            await api.post(`/interviews/${id}/complete`, {
              notes: values.notes,
              actualDuration: values.actualDuration,
            })
            message.success('면접이 완료 처리되었습니다')
            queryClient.invalidateQueries({ queryKey: ['interview', id] })
            setIsCompleteModalOpen(false)
            completeForm.resetFields()
          } catch (error: any) {
            if (error.response) {
              message.error(error.response.data.message || '완료 처리에 실패했습니다')
            }
          }
        }}
        onCancel={() => {
          setIsCompleteModalOpen(false)
          completeForm.resetFields()
        }}
        okText="완료 처리"
        cancelText="취소"
      >
        <Form form={completeForm} layout="vertical">
          <Form.Item
            label="면접 메모"
            name="notes"
          >
            <Input.TextArea rows={4} placeholder="면접 메모를 입력해주세요" />
          </Form.Item>
          <Form.Item
            label="실제 소요 시간 (분)"
            name="actualDuration"
          >
            <Input type="number" min={0} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 노쇼 처리 모달 */}
      <Modal
        title="노쇼 처리"
        open={isNoShowModalOpen}
        onOk={async () => {
          try {
            const values = await noShowForm.validateFields()
            await api.post(`/interviews/${id}/no-show`, {
              noShowType: values.noShowType,
              reason: values.reason,
              interviewerId: values.interviewerId,
            })
            message.success('노쇼 처리되었습니다')
            queryClient.invalidateQueries({ queryKey: ['interview', id] })
            setIsNoShowModalOpen(false)
            noShowForm.resetFields()
          } catch (error: any) {
            if (error.response) {
              message.error(error.response.data.message || '노쇼 처리에 실패했습니다')
            }
          }
        }}
        onCancel={() => {
          setIsNoShowModalOpen(false)
          noShowForm.resetFields()
        }}
        okText="처리"
        cancelText="취소"
        okButtonProps={{ danger: true }}
      >
        <Form form={noShowForm} layout="vertical">
          <Form.Item
            label="노쇼 유형"
            name="noShowType"
            rules={[{ required: true, message: '노쇼 유형을 선택해주세요' }]}
          >
            <Select>
              <Select.Option value="candidate">지원자 노쇼</Select.Option>
              <Select.Option value="interviewer">면접관 노쇼</Select.Option>
              <Select.Option value="both">양쪽 모두 노쇼</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            label="사유"
            name="reason"
          >
            <Input.TextArea rows={4} placeholder="노쇼 사유를 입력해주세요" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
