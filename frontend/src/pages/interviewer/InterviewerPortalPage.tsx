import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card,
  Table,
  Tag,
  Space,
  Button,
  Descriptions,
  Modal,
  Drawer,
  Form,
  Input,
  Rate,
  Select,
  message,
  Spin,
  Typography,
} from 'antd'
import { DownloadOutlined, EyeOutlined, FormOutlined } from '@ant-design/icons'
import { apiA } from '../../utils/apiA'
import { api } from '../../utils/api'

const { Title, Text } = Typography
const { TextArea } = Input

interface Candidate {
  candidate_id: string
  name: string
  email: string
  phone: string
  position_applied: string
  scheduled_start_time: string
  scheduled_end_time: string
  sequence: number
  resume_url?: string
}

interface Interview {
  interview_id: string
  main_notice: string
  team_name: string
  proposed_date: string
  proposed_start_time: string
  proposed_end_time: string
  status: string
  candidates: Candidate[]
}

export function InterviewerPortalPage() {
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [evaluationCandidate, setEvaluationCandidate] = useState<{ interview: Interview; candidate: Candidate } | null>(null)
  const [isEvaluationDrawerOpen, setIsEvaluationDrawerOpen] = useState(false)
  const [evalForm] = Form.useForm()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['interviewer-portal', 'interviews'],
    queryFn: async () => {
      const response = await apiA.get('/interviewer-portal/interviews')
      return response.data.data
    },
  })

  const interviewId = evaluationCandidate?.interview?.interview_id
  const candidateId = evaluationCandidate?.candidate?.candidate_id
  const { data: evaluationData } = useQuery({
    queryKey: ['interviewer-portal', 'evaluation', interviewId, candidateId],
    queryFn: async () => {
      const response = await apiA.get(`/interviewer-portal/interviews/${interviewId}/candidates/${candidateId}/evaluation`)
      return response.data.data?.evaluation
    },
    enabled: !!interviewId && !!candidateId && isEvaluationDrawerOpen,
  })

  useEffect(() => {
    if (evaluationData && isEvaluationDrawerOpen) {
      evalForm.setFieldsValue({
        technical_score: evaluationData.technical_score ?? 0,
        communication_score: evaluationData.communication_score ?? 0,
        fit_score: evaluationData.fit_score ?? 0,
        teamwork_score: evaluationData.teamwork_score ?? 0,
        overall_score: evaluationData.overall_score ?? 0,
        recommendation: evaluationData.recommendation || undefined,
        comments: evaluationData.comments || '',
        strengths: Array.isArray(evaluationData.strengths) ? evaluationData.strengths.join(', ') : (evaluationData.strengths || ''),
        weaknesses: Array.isArray(evaluationData.weaknesses) ? evaluationData.weaknesses.join(', ') : (evaluationData.weaknesses || ''),
      })
    } else if (!evaluationData && isEvaluationDrawerOpen) {
      evalForm.resetFields()
    }
  }, [evaluationData, isEvaluationDrawerOpen, evalForm])

  const submitEvaluationMutation = useMutation({
    mutationFn: async (values: any) => {
      const payload = {
        technical_score: values.technical_score || 0,
        communication_score: values.communication_score || 0,
        fit_score: values.fit_score || 0,
        teamwork_score: values.teamwork_score || 0,
        overall_score: values.overall_score || 0,
        recommendation: values.recommendation,
        comments: values.comments || '',
        strengths: (values.strengths || '').split(',').map((s: string) => s.trim()).filter(Boolean),
        weaknesses: (values.weaknesses || '').split(',').map((s: string) => s.trim()).filter(Boolean),
      }
      await apiA.post(`/interviewer-portal/interviews/${interviewId}/candidates/${candidateId}/evaluation`, payload)
    },
    onSuccess: () => {
      message.success('평가가 저장되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['interviewer-portal', 'evaluation', interviewId, candidateId] })
      setIsEvaluationDrawerOpen(false)
      setEvaluationCandidate(null)
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '평가 저장에 실패했습니다.')
    },
  })

  const handleViewDetail = (interview: Interview) => {
    setSelectedInterview(interview)
    setIsDetailModalOpen(true)
  }

  const handleDownloadResume = (candidate: Candidate) => {
    if (!candidate.resume_url) {
      message.warning('이력서가 등록되지 않았습니다')
      return
    }

    // 이력서 다운로드 URL: baseURL이 .../api 이므로 resume_url(/api/resumes/xxx)과 합치면 /api 중복 방지
    const base = (api.defaults.baseURL || '').replace(/\/api\/?$/, '') || api.defaults.baseURL
    const path = candidate.resume_url.startsWith('/') ? candidate.resume_url : `/api/resumes/${candidate.resume_url}`
    const resumeUrl = `${base}${path}`

    window.open(resumeUrl, '_blank')
  }

  const columns = [
    {
      title: '공고명',
      dataIndex: 'main_notice',
      key: 'main_notice',
    },
    {
      title: '팀명',
      dataIndex: 'team_name',
      key: 'team_name',
    },
    {
      title: '면접 일시',
      key: 'datetime',
      render: (record: Interview) => (
        <Space direction="vertical" size="small">
          <Text>{record.proposed_date}</Text>
          <Text type="secondary">
            {record.proposed_start_time} ~ {record.proposed_end_time}
          </Text>
        </Space>
      ),
    },
    {
      title: '면접자 수',
      key: 'candidateCount',
      render: (record: Interview) => (
        <Tag color="blue">{record.candidates?.length || 0}명</Tag>
      ),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusConfig: Record<string, { color: string; label: string }> = {
          PENDING: { color: 'orange', label: '대기 중' },
          PARTIAL: { color: 'blue', label: '진행 중' },
          CONFIRMED: { color: 'green', label: '확정' },
          CANCELLED: { color: 'red', label: '취소' },
          COMPLETED: { color: 'gray', label: '완료' },
        }
        const config = statusConfig[status] || { color: 'default', label: status }
        return <Tag color={config.color}>{config.label}</Tag>
      },
    },
    {
      title: '작업',
      key: 'actions',
      render: (record: Interview) => (
        <Button
          type="link"
          onClick={() => handleViewDetail(record)}
          icon={<EyeOutlined />}
        >
          상세보기
        </Button>
      ),
    },
  ]

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
      <Title level={2}>면접 일정</Title>
      <Card>
        <Table
          columns={columns}
          dataSource={data?.interviews || []}
          rowKey="interview_id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `총 ${total}건`,
          }}
        />
      </Card>

      <Modal
        title="면접 상세 정보"
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        footer={null}
        width={800}
      >
        {selectedInterview && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions column={1} bordered>
              <Descriptions.Item label="공고명">
                {selectedInterview.main_notice}
              </Descriptions.Item>
              <Descriptions.Item label="팀명">
                {selectedInterview.team_name}
              </Descriptions.Item>
              <Descriptions.Item label="면접 일시">
                {selectedInterview.proposed_date} {selectedInterview.proposed_start_time} ~ {selectedInterview.proposed_end_time}
              </Descriptions.Item>
              <Descriptions.Item label="상태">
                <Tag color="blue">{selectedInterview.status}</Tag>
              </Descriptions.Item>
            </Descriptions>

            <Title level={4}>면접자 정보</Title>
            {selectedInterview.candidates?.map((candidate) => (
              <Card
                key={candidate.candidate_id}
                size="small"
                title={
                  <Space>
                    <Text strong>{candidate.name}</Text>
                    <Tag>{candidate.position_applied}</Tag>
                    <Text type="secondary">
                      {candidate.scheduled_start_time} ~ {candidate.scheduled_end_time}
                    </Text>
                  </Space>
                }
                extra={
                  <Space>
                    {candidate.resume_url && (
                      <Button
                        icon={<DownloadOutlined />}
                        onClick={() => handleDownloadResume(candidate)}
                      >
                        이력서
                      </Button>
                    )}
                    <Button
                      type="primary"
                      icon={<FormOutlined />}
                      onClick={() => {
                        setEvaluationCandidate({ interview: selectedInterview, candidate })
                        setIsEvaluationDrawerOpen(true)
                      }}
                    >
                      평가하기
                    </Button>
                  </Space>
                }
                style={{ marginBottom: '16px' }}
              >
                <Descriptions column={2} size="small">
                  <Descriptions.Item label="이메일">
                    {candidate.email || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="전화번호">
                    {candidate.phone || '-'}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            ))}
          </Space>
        )}
      </Modal>

      <Drawer
        title={evaluationCandidate ? `${evaluationCandidate.candidate.name} 님 평가` : '면접 평가'}
        open={isEvaluationDrawerOpen}
        onClose={() => {
          setIsEvaluationDrawerOpen(false)
          setEvaluationCandidate(null)
        }}
        width={520}
        footer={
          <Space>
            <Button onClick={() => setIsEvaluationDrawerOpen(false)}>취소</Button>
            <Button type="primary" loading={submitEvaluationMutation.isPending} onClick={() => evalForm.submit()}>
              저장
            </Button>
          </Space>
        }
      >
        {evaluationCandidate && (
          <Form
            form={evalForm}
            layout="vertical"
            onFinish={(values) => submitEvaluationMutation.mutate(values)}
            initialValues={{
              technical_score: 0,
              communication_score: 0,
              fit_score: 0,
              teamwork_score: 0,
              overall_score: 0,
              recommendation: undefined,
              comments: '',
              strengths: '',
              weaknesses: '',
            }}
          >
            <Form.Item name="technical_score" label="기술 역량 (1~5점)" rules={[{ required: true }]}>
              <Rate count={5} />
            </Form.Item>
            <Form.Item name="communication_score" label="커뮤니케이션 (1~5점)" rules={[{ required: true }]}>
              <Rate count={5} />
            </Form.Item>
            <Form.Item name="fit_score" label="업무 적합도 (1~5점)" rules={[{ required: true }]}>
              <Rate count={5} />
            </Form.Item>
            <Form.Item name="teamwork_score" label="팀워크 (1~5점)" rules={[{ required: true }]}>
              <Rate count={5} />
            </Form.Item>
            <Form.Item name="overall_score" label="종합 평가 (1~5점)" rules={[{ required: true }]}>
              <Rate count={5} />
            </Form.Item>
            <Form.Item name="recommendation" label="합격 여부" rules={[{ required: true, message: '선택해주세요' }]}>
              <Select
                placeholder="선택"
                options={[
                  { value: 'PASS', label: '합격' },
                  { value: 'CONSIDER', label: '검토' },
                  { value: 'FAIL', label: '불합격' },
                ]}
              />
            </Form.Item>
            <Form.Item name="comments" label="평가 코멘트">
              <TextArea rows={3} placeholder="종합 의견을 입력하세요" />
            </Form.Item>
            <Form.Item name="strengths" label="강점 (쉼표로 구분)">
              <Input placeholder="예: 기술력, 소통 능력" />
            </Form.Item>
            <Form.Item name="weaknesses" label="보완점 (쉼표로 구분)">
              <Input placeholder="예: 경력 부족" />
            </Form.Item>
          </Form>
        )}
      </Drawer>
    </div>
  )
}
