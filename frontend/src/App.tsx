import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AdminLayout } from './layouts/AdminLayout'
import { DashboardPage } from './pages/admin/DashboardPage'
import { InterviewCreatePage } from './pages/admin/InterviewCreatePage'
import { InterviewDetailPage } from './pages/admin/InterviewDetailPage'
import { InterviewerManagePage } from './pages/admin/InterviewerManagePage'
import { ConfirmPage } from './pages/interviewer/ConfirmPage'
import { AuthCallbackPage } from './pages/AuthCallbackPage'
import AuthLoginPage from './pages/AuthLoginPage'
import { useAuthStore } from './stores/authStore'

function App() {
  // GitHub Pages를 위한 base 경로 설정
  const basename = import.meta.env.BASE_URL || '/'
  
  return (
    <BrowserRouter basename={basename} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/auth/login" element={<AuthLoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/confirm/:token" element={<ConfirmPage />} />
        
        <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="interviews/new" element={<InterviewCreatePage />} />
          <Route path="interviews/:id" element={<InterviewDetailPage />} />
          <Route path="interviewers" element={<InterviewerManagePage />} />
        </Route>

        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
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
