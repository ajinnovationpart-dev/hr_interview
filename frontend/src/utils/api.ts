import axios from 'axios'
import { useAuthStore } from '../stores/authStore'

// 네트워크 접속 시 자동으로 IP 감지
const getApiUrl = () => {
  // 현재 호스트 확인
  const hostname = window.location.hostname
  
  // 프로덕션 환경에서 환경 변수 사용
  if (import.meta.env.PROD && import.meta.env.VITE_API_URL) {
    let apiUrl = import.meta.env.VITE_API_URL
    // URL이 /로 끝나면 제거
    apiUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl
    // /api가 없으면 추가
    if (!apiUrl.endsWith('/api')) {
      apiUrl = `${apiUrl}/api`
    }
    return apiUrl
  }
  
  // 개발 환경: localhost가 아니면 같은 IP의 3000 포트 사용
  // (브라우저의 Private Network Access 정책 때문에 localhost와 다른 IP 간 요청이 차단됨)
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return `http://${hostname}:3000/api`
  }
  
  // localhost인 경우
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
      // 개발 환경에서는 항상 '/', 프로덕션에서는 BASE_URL 사용
      const basename = import.meta.env.DEV ? '/' : (import.meta.env.BASE_URL || '/')
      window.location.href = `${basename}auth/login`
    }
    // 네트워크 오류 처리
    if (!error.response && error.message === 'Network Error') {
      console.error('❌ Network Error: 백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인하세요.')
    }
    return Promise.reject(error)
  }
)
