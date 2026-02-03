import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AdminLayout } from './layouts/AdminLayout'
import { DashboardPage } from './pages/admin/DashboardPage'
import { InterviewListPage } from './pages/admin/InterviewListPage'
import { InterviewCreatePage } from './pages/admin/InterviewCreatePage'
import { InterviewDetailPage } from './pages/admin/InterviewDetailPage'
import { InterviewerManagePage } from './pages/admin/InterviewerManagePage'
import { SettingsPage } from './pages/admin/SettingsPage'
import { RoomManagePage } from './pages/admin/RoomManagePage'
import { StatisticsPage } from './pages/admin/StatisticsPage'
import { CandidateManagePage } from './pages/admin/CandidateManagePage'
import { InterviewerSchedulePage } from './pages/admin/InterviewerSchedulePage'
import { CalendarPage } from './pages/admin/CalendarPage'
import { CandidateDetailPage } from './pages/admin/CandidateDetailPage'
import { ConfirmPage } from './pages/interviewer/ConfirmPage'
import { AuthCallbackPage } from './pages/AuthCallbackPage'
import AuthLoginPage from './pages/AuthLoginPage'
import { useAuthStore } from './stores/authStore'

function App() {
  // 개발 환경에서는 항상 '/' 사용, 프로덕션에서만 '/hr_interview/' 사용
  // Vite의 base 설정과 일치시켜야 함
  // import.meta.env.MODE를 사용하여 더 명확하게 확인
  const isDev = import.meta.env.MODE === 'development' || import.meta.env.DEV
  const basename = isDev ? '/' : '/hr_interview/'
  
  // 개발 환경에서 /hr_interview/ 경로로 접근하면 루트로 리다이렉트
  React.useEffect(() => {
    if (isDev && window.location.pathname.startsWith('/hr_interview/')) {
      const newPath = window.location.pathname.replace('/hr_interview', '') || '/'
      window.history.replaceState({}, '', newPath)
      window.location.reload()
    }
  }, [isDev])
  
  // 디버깅: basename 로그 출력
  if (import.meta.env.DEV) {
    console.log('🔧 App basename:', basename, 'isDev:', isDev, 'MODE:', import.meta.env.MODE, 'pathname:', window.location.pathname)
  }
  
  return (
    <BrowserRouter basename={basename} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/auth/login" element={<AuthLoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/confirm/:token" element={<ConfirmPage />} />
        
        <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="interviews" element={<InterviewListPage />} />
          <Route path="interviews/new" element={<InterviewCreatePage />} />
          <Route path="interviews/:id" element={<InterviewDetailPage />} />
          <Route path="interviewers" element={<InterviewerManagePage />} />
          <Route path="rooms" element={<RoomManagePage />} />
          <Route path="candidates" element={<CandidateManagePage />} />
          <Route path="candidates/:id" element={<CandidateDetailPage />} />
          <Route path="statistics" element={<StatisticsPage />} />
          <Route path="interviewer-schedule" element={<InterviewerSchedulePage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="/" element={<Navigate to="/auth/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />
  }
  
  return <>{children}</>
}

export default App
