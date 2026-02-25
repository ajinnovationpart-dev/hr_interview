import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Form, Input, Button, Card, message } from 'antd'
import { apiA } from '../../utils/apiA'
import { useAuthStore } from '../../stores/authStore'

export function InterviewerLoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const setAuth = useAuthStore((state) => state.setAuth)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (values: { email: string; password: string }) => {
    setLoading(true)
    try {
      const response = await apiA.post('/auth/interviewer/login', values)
      const { accessToken, user } = response.data.data

      setAuth(accessToken, {
        email: user.email,
        role: 'INTERVIEWER',
      })

      message.success('로그인 성공')
      const redirect = searchParams.get('redirect') || ''
      // 오픈 리다이렉트 방지: 내부 경로(/...)만 허용
      if (redirect.startsWith('/')) {
        navigate(redirect)
      } else {
        navigate('/interviewer/list')
      }
    } catch (error: any) {
      const msg = error.response?.data?.message
      const isNetwork = !error.response && (error.code === 'ECONNABORTED' || error.message?.includes('timeout') || error.message === 'Network Error')
      if (isNetwork) {
        message.error('서버에 연결할 수 없습니다. 백엔드 주소(VITE_API_URL)와 네트워크를 확인하세요.')
      } else {
        message.error(msg || '로그인에 실패했습니다')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
      <Card title="면접관 포털 로그인" style={{ width: 400 }}>
        <p style={{ color: '#666', marginBottom: 16 }}>
          면접관으로 등록된 이메일과 비밀번호로 로그인하세요. 비밀번호가 없다면 관리자에게 문의하세요.
        </p>
        <Form
          name="interviewer-login"
          onFinish={handleSubmit}
          layout="vertical"
          autoComplete="off"
        >
          <Form.Item
            label="이메일"
            name="email"
            rules={[
              { required: true, message: '이메일을 입력해주세요' },
              { type: 'email', message: '올바른 이메일 형식이 아닙니다' },
            ]}
          >
            <Input placeholder="면접관 이메일" />
          </Form.Item>

          <Form.Item
            label="비밀번호"
            name="password"
            rules={[{ required: true, message: '비밀번호를 입력해주세요' }]}
          >
            <Input.Password placeholder="비밀번호" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              로그인
            </Button>
          </Form.Item>
        </Form>
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Button type="link" onClick={() => navigate('/auth/login')} style={{ padding: 0 }}>
            관리자 로그인
          </Button>
        </div>
      </Card>
    </div>
  )
}
