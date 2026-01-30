import axios from 'axios'
import { useAuthStore } from '../stores/authStore'

// 네트워크 접속 시 자동으로 IP 감지
const getApiUrl = () => {
  // 환경 변수가 있으면 사용
  if (import.meta.env.VITE_API_URL) {
    const apiUrl = import.meta.env.VITE_API_URL
    // URL이 /로 끝나면 제거
    return apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl
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

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
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
      window.location.href = '/auth/login'
    }
    return Promise.reject(error)
  }
)
