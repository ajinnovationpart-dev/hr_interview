import axios from 'axios'
import { useAuthStore } from '../stores/authStore'

// 네트워크 접속 시 자동으로 IP 감지
const getApiUrl = () => {
  // 환경 변수가 있으면 사용
  if (import.meta.env.VITE_API_URL) {
    let apiUrl = import.meta.env.VITE_API_URL
    // URL이 /로 끝나면 제거
    apiUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl
    // /api가 없으면 추가
    if (!apiUrl.endsWith('/api')) {
      apiUrl = `${apiUrl}/api`
    }
    return apiUrl
  }
  
  // 현재 호스트가 localhost가 아니면 같은 IP의 3000 포트 사용
  const hostname = window.location.hostname
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return `http://${hostname}:3000/api`
  }
  
  // 기본값
  return 'http://localhost:3000/api'
}

const API_URL = getApiUrl()

// 디버깅: API URL 로그 출력 (프로덕션에서는 제거 가능)
if (import.meta.env.DEV) {
  console.log('🔧 API URL:', API_URL)
  console.log('🔧 VITE_API_URL:', import.meta.env.VITE_API_URL)
}

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true', // ngrok 브라우저 경고 페이지 건너뛰기
  },
})

// Request interceptor: 로그 추가
api.interceptors.request.use((config) => {
  console.log('📤 API Request:', {
    method: config.method?.toUpperCase(),
    url: config.url,
    baseURL: config.baseURL,
    fullURL: `${config.baseURL}${config.url}`,
  })
  return config
})

// Request interceptor: Add auth token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor: Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth()
      const basename = import.meta.env.BASE_URL || '/'
      window.location.href = `${basename}auth/login`
    }
    return Promise.reject(error)
  }
)
