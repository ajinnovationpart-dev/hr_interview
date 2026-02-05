import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, Form, Input, InputNumber, Switch, Button, Space, message, Divider, Alert } from 'antd'
import { SaveOutlined, ClockCircleOutlined, BellOutlined, MailOutlined } from '@ant-design/icons'
import { apiA } from '../../utils/apiA'

interface ConfigData {
  interview_duration_minutes?: string
  work_start_time?: string
  work_end_time?: string
  lunch_start_time?: string
  lunch_end_time?: string
  time_slot_interval?: string
  reminder_first_hours?: string
  reminder_second_hours?: string
  reminder_max_count?: string
  d_minus_1_reminder_time?: string
  min_interviewers?: string
  max_interviewers?: string
  require_team_lead?: string
  min_notice_hours?: string
  data_retention_years?: string
  email_retry_count?: string
  company_logo_url?: string
  company_address?: string
  parking_info?: string
  dress_code?: string
  smtp_from_email?: string
  smtp_from_name?: string
  smtp_reply_to?: string
  email_greeting?: string
  email_company_name?: string
  email_department_name?: string
  email_contact_email?: string
  email_footer_text?: string
}

export function SettingsPage() {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<ConfigData>({
    queryKey: ['config'],
    queryFn: async () => {
      const response = await apiA.get('/config')
      return response.data.data
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (values: ConfigData) => {
      const response = await apiA.put('/config', values)
      return response.data
    },
    onSuccess: () => {
      message.success('설정이 저장되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['config'] })
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '설정 저장 중 오류가 발생했습니다.')
    },
  })

  const handleSubmit = (values: ConfigData) => {
    updateMutation.mutate(values)
  }

  if (isLoading) {
    return <div>로딩 중...</div>
  }

  return (
    <div>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card>
          <h1>시스템 설정</h1>
          <p style={{ color: '#999' }}>면접 자동화 시스템의 전역 설정을 관리합니다.</p>
        </Card>

        <Form
          form={form}
          layout="vertical"
          initialValues={data}
          onFinish={handleSubmit}
        >
          {/* 면접 운영 설정 */}
          <Card
            title={
              <Space>
                <ClockCircleOutlined />
                <span>면접 운영 설정</span>
              </Space>
            }
            style={{ marginBottom: 16 }}
          >
            <Form.Item label="기본 면접 소요 시간 (분)" name="interview_duration_minutes">
              <InputNumber min={15} max={180} step={15} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item label="운영 시작 시간" name="work_start_time">
              <Input placeholder="09:00" />
            </Form.Item>

            <Form.Item label="운영 종료 시간" name="work_end_time">
              <Input placeholder="18:00" />
            </Form.Item>

            <Form.Item label="점심 시작 시간" name="lunch_start_time">
              <Input placeholder="12:00" />
            </Form.Item>

            <Form.Item label="점심 종료 시간" name="lunch_end_time">
              <Input placeholder="13:00" />
            </Form.Item>

            <Form.Item label="시간 슬롯 간격 (분)" name="time_slot_interval">
              <InputNumber min={15} max={60} step={15} style={{ width: '100%' }} />
            </Form.Item>
          </Card>

          {/* 리마인더 설정 */}
          <Card
            title={
              <Space>
                <BellOutlined />
                <span>리마인더 설정</span>
              </Space>
            }
            style={{ marginBottom: 16 }}
          >
            <Form.Item label="첫 번째 리마인더 (시간)" name="reminder_first_hours">
              <InputNumber min={1} max={168} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item label="두 번째 리마인더 (시간)" name="reminder_second_hours">
              <InputNumber min={1} max={168} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item label="최대 리마인더 횟수" name="reminder_max_count">
              <InputNumber min={0} max={10} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item label="D-1 리마인더 시간" name="d_minus_1_reminder_time">
              <Input placeholder="17:00" />
            </Form.Item>
          </Card>

          {/* 면접관 설정 */}
          <Card
            title="면접관 설정"
            style={{ marginBottom: 16 }}
          >
            <Form.Item label="최소 면접관 수" name="min_interviewers">
              <InputNumber min={1} max={10} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item label="최대 면접관 수" name="max_interviewers">
              <InputNumber min={1} max={10} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item label="팀장급 필수 여부" name="require_team_lead" valuePropName="checked">
              <Switch checkedChildren="필수" unCheckedChildren="선택" />
            </Form.Item>

            <Form.Item label="최소 사전 통보 시간 (시간)" name="min_notice_hours">
              <InputNumber min={1} max={168} style={{ width: '100%' }} />
            </Form.Item>
          </Card>

          {/* 이메일 설정 */}
          <Card
            title={
              <Space>
                <MailOutlined />
                <span>이메일 설정</span>
              </Space>
            }
            style={{ marginBottom: 16 }}
          >
            <Form.Item label="발신 이메일" name="smtp_from_email">
              <Input placeholder="hr@ajnetworks.co.kr" />
            </Form.Item>

            <Form.Item label="발신자 이름" name="smtp_from_name">
              <Input placeholder="AJ Networks 인사팀" />
            </Form.Item>

            <Form.Item label="회신 주소" name="smtp_reply_to">
              <Input placeholder="hr@ajnetworks.co.kr" />
            </Form.Item>

            <Divider>이메일 템플릿 설정</Divider>

            <Form.Item label="인사말" name="email_greeting">
              <Input placeholder="안녕하세요" />
            </Form.Item>

            <Form.Item label="회사명" name="email_company_name">
              <Input placeholder="AJ Networks" />
            </Form.Item>

            <Form.Item label="부서명" name="email_department_name">
              <Input placeholder="인사팀" />
            </Form.Item>

            <Form.Item label="문의 이메일" name="email_contact_email">
              <Input placeholder="hr@ajnetworks.co.kr" />
            </Form.Item>

            <Form.Item label="푸터 문구" name="email_footer_text">
              <Input.TextArea rows={3} placeholder="본 메일은 AJ Networks 인사팀에서 발송한 공식 메일입니다." />
            </Form.Item>
          </Card>

          {/* 회사 정보 */}
          <Card
            title="회사 정보"
            style={{ marginBottom: 16 }}
          >
            <Form.Item label="회사 로고 URL" name="company_logo_url">
              <Input placeholder="https://example.com/logo.png" />
            </Form.Item>

            <Form.Item label="회사 주소" name="company_address">
              <Input.TextArea rows={2} placeholder="서울시 강남구..." />
            </Form.Item>

            <Form.Item label="주차 안내" name="parking_info">
              <Input.TextArea rows={2} placeholder="지하 1층 주차장 이용 가능" />
            </Form.Item>

            <Form.Item label="복장 안내" name="dress_code">
              <Input placeholder="비즈니스 캐주얼" />
            </Form.Item>
          </Card>

          {/* 기타 설정 */}
          <Card
            title="기타 설정"
            style={{ marginBottom: 16 }}
          >
            <Form.Item label="데이터 보관 기간 (년)" name="data_retention_years">
              <InputNumber min={1} max={10} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item label="이메일 재시도 횟수" name="email_retry_count">
              <InputNumber min={0} max={10} style={{ width: '100%' }} />
            </Form.Item>
          </Card>

          <Alert
            message="주의"
            description="설정 변경은 모든 면접 조율 로직에 즉시 영향을 미칩니다."
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={updateMutation.isPending}
              size="large"
            >
              설정 저장
            </Button>
          </Form.Item>
        </Form>
      </Space>
    </div>
  )
}
