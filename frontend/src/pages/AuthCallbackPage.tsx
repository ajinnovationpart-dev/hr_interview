import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Spin, message } from 'antd'
import { useAuthStore } from '../stores/authStore'
import { apiA } from '../utils/apiA'

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)

  useEffect(() => {
    const token = searchParams.get('token')
    
    if (!token) {
      message.error('인증 토큰이 없습니다')
      navigate('/auth/login')
      return
    }

    // 사용자 정보 조회
    apiA.get('/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        const user = response.data.data.user
        setAuth(token, {
          email: user.email,
          role: user.role,
        })
        navigate('/admin/dashboard')
      })
      .catch((error) => {
        console.error('Auth error:', error)
        message.error('인증에 실패했습니다')
        navigate('/auth/login')
      })
  }, [searchParams, navigate, setAuth])

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Spin size="large" />
    </div>
  )
}
