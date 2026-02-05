import axios from 'axios'
import { useAuthStore } from '../stores/authStore'

// A Backend API URL 구성
const getABackendApiUrl = () => {
  // 프로덕션 환경에서 환경 변수 사용
  if (import.meta.env.PROD && import.meta.env.VITE_API_URL) {
    let apiUrl = import.meta.env.VITE_API_URL
    // URL이 /로 끝나면 제거
    apiUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl
    
    // 모든 /api/a 중복 제거 (여러 번 반복될 수 있음)
    while (apiUrl.endsWith('/api/a')) {
      apiUrl = apiUrl.slice(0, -6) // '/api/a' 제거 (6글자)
    }
    
    // /api가 포함되어 있으면 제거
    if (apiUrl.endsWith('/api')) {
      apiUrl = apiUrl.slice(0, -4) // '/api' 제거 (4글자)
    }
    
    // 최종적으로 /api/a 추가 (항상 새로 추가)
    const finalUrl = `${apiUrl}/api/a`
    console.log('🔧 A Backend URL 구성:', {
      original: import.meta.env.VITE_API_URL,
      afterCleanup: apiUrl,
      final: finalUrl
    })
    return finalUrl
  }
  
  // 개발 환경: VITE_API_URL 없으면 api와 동일 백엔드(3000) 사용 → 단일 서버에서 모든 API 호출
  const hostname = window.location.hostname
  const base = (hostname !== 'localhost' && hostname !== '127.0.0.1')
    ? `http://${hostname}:3000`
    : 'http://localhost:3000'
  return `${base}/api`
}

const API_A_URL = getABackendApiUrl()

// 디버깅: API URL 로그 출력 (프로덕션에서도 출력하여 문제 진단)
console.log('🔧 A Backend API URL:', API_A_URL)
console.log('🔧 VITE_API_URL (원본):', import.meta.env.VITE_API_URL)

export const apiA = axios.create({
  baseURL: API_A_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': '1', // ngrok 브라우저 경고 페이지 건너뛰기
  },
})

// Request interceptor: FormData 시 Content-Type 제거 (multipart boundary 자동 설정)
apiA.interceptors.request.use((config) => {
  if (config.data && config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

// Request interceptor: 로그 추가 및 ngrok 헤더 확실히 추가
apiA.interceptors.request.use((config) => {
  // ngrok 인터스티셜 건너뛰기 헤더 확실히 추가
  config.headers['ngrok-skip-browser-warning'] = '1'
  
  console.log('📤 A Backend API Request:', {
    method: config.method?.toUpperCase(),
    url: config.url,
    baseURL: config.baseURL,
    fullURL: `${config.baseURL}${config.url}`,
  })
  return config
})

// Request interceptor: Add auth token
apiA.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor: Handle errors
apiA.interceptors.response.use(
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
      console.error('❌ Network Error: A Backend 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인하세요.')
    }
    return Promise.reject(error)
  }
)
