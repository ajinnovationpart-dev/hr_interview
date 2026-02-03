import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Button, Card, message } from 'antd'
import { apiA } from '../utils/apiA'
import { useAuthStore } from '../stores/authStore'

function AuthLoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (values: { email: string; password: string }) => {
    setLoading(true)
    try {
      const response = await apiA.post('/auth/login', values)
      const { accessToken, user } = response.data.data
      
      setAuth(accessToken, {
        email: user.email,
        role: user.role,
      })
      
      message.success('로그인 성공')
      navigate('/admin/dashboard')
    } catch (error: any) {
      message.error(error.response?.data?.message || '로그인에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
      <Card title="면접 일정 자동화 시스템 로그인" style={{ width: 400 }}>
        <Form
          name="login"
          onFinish={handleSubmit}
          layout="vertical"
          autoComplete="off"
        >
          <Form.Item
            label="이메일"
            name="email"
            rules={[{ required: true, message: '이메일을 입력해주세요' }, { type: 'email', message: '올바른 이메일 형식이 아닙니다' }]}
          >
            <Input placeholder="이메일을 입력하세요" />
          </Form.Item>

          <Form.Item
            label="비밀번호"
            name="password"
            rules={[{ required: true, message: '비밀번호를 입력해주세요' }]}
          >
            <Input.Password placeholder="비밀번호를 입력하세요" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              로그인
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default AuthLoginPage
