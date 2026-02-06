import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Button, Tooltip, Drawer, Typography } from 'antd'
import {
  DashboardOutlined,
  PlusOutlined,
  UnorderedListOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  HomeOutlined,
  BarChartOutlined,
  TeamOutlined,
  CalendarOutlined,
  ScheduleOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../stores/authStore'
import { getScreenManual } from '../manuals/screenManuals'

const { Header, Content, Sider } = Layout

const menuConfig = [
  { key: '/admin/dashboard', icon: <DashboardOutlined />, label: '대시보드', description: '면접 현황 요약, 최근 면접 목록, 상태별 건수(대기/진행/완료/공통없음) 확인' },
  { key: '/admin/interviews', icon: <UnorderedListOutlined />, label: '면접 목록', description: '등록된 면접 전체 목록 조회·검색·필터, 상세 이동' },
  { key: '/admin/interviews/new', icon: <PlusOutlined />, label: '면접 등록', description: '공고명·팀·면접자·면접관 지정 후 저장 시 면접관에게 일정 확인 메일 자동 발송' },
  { key: '/admin/interviewers', icon: <UserOutlined />, label: '면접관 관리', description: '면접관 추가·수정·삭제, 이메일·부서·팀장 여부 관리' },
  { key: '/admin/rooms', icon: <HomeOutlined />, label: '면접실 관리', description: '면접실(회의실) 등록·수정·삭제, 장소·수용 인원 관리' },
  { key: '/admin/candidates', icon: <TeamOutlined />, label: '지원자 관리', description: '지원자(후보자) 목록 조회·등록·수정, 이력서 연동' },
  { key: '/admin/statistics', icon: <BarChartOutlined />, label: '통계 및 리포트', description: '면접·평가 통계, 리포트·엑셀 내보내기' },
  { key: '/admin/interviewer-schedule', icon: <ScheduleOutlined />, label: '면접관 스케줄', description: '면접관별 가능 일정 등록·조회, 면접 일정과 연동' },
  { key: '/admin/calendar', icon: <CalendarOutlined />, label: '캘린더 뷰', description: '면접 일정을 캘린더 형태로 한눈에 보기' },
  { key: '/admin/settings', icon: <SettingOutlined />, label: '설정', description: '면접 소요 시간·리마인더·이메일 발신 정보 등 시스템 전역 설정' },
]

export function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, clearAuth } = useAuthStore()
  const [manualOpen, setManualOpen] = useState(false)

  const currentManual = getScreenManual(location.pathname)

  const menuItems = menuConfig.map(({ key, icon, label, description }) => ({
    key,
    icon,
    label: (
      <Tooltip title={description} placement="right">
        <span>{label}</span>
      </Tooltip>
    ),
  }))

  const handleLogout = () => {
    clearAuth()
    navigate('/auth/login')
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#001529' }}>
        <div style={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>
          면접 일정 자동화 시스템
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Tooltip title="현재 화면 메뉴얼 보기">
            <Button
              type="text"
              icon={<QuestionCircleOutlined />}
              onClick={() => setManualOpen(true)}
              style={{ color: 'rgba(255,255,255,0.85)' }}
            >
              화면 메뉴얼
            </Button>
          </Tooltip>
          <span style={{ color: 'white' }}>{user?.email}</span>
          <Button type="primary" icon={<LogoutOutlined />} onClick={handleLogout}>
            로그아웃
          </Button>
        </div>
      </Header>
      <Layout>
        <Sider width={200} style={{ background: '#fff' }}>
          <Menu
            mode="inline"
            selectedKeys={[
              location.pathname.startsWith('/admin/interviews/') && location.pathname !== '/admin/interviews/new'
                ? '/admin/interviews'
                : location.pathname
            ]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{ height: '100%', borderRight: 0 }}
          />
        </Sider>
        <Layout style={{ padding: '24px' }}>
          <Content style={{ background: '#fff', padding: '24px', minHeight: 280 }}>
            <Outlet />
          </Content>
        </Layout>
      </Layout>

      <Drawer
        title={currentManual?.title ?? '화면 메뉴얼'}
        placement="right"
        width={420}
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        styles={{ body: { paddingTop: 8 } }}
      >
        {currentManual ? (
          <Typography>{currentManual.content}</Typography>
        ) : (
          <Typography>
            <Typography.Paragraph>이 화면에 대한 메뉴얼이 없습니다.</Typography.Paragraph>
            <Typography.Paragraph type="secondary">대시보드·면접 목록·설정 등 메인 메뉴 화면에서는 「화면 메뉴얼」을 확인할 수 있습니다.</Typography.Paragraph>
          </Typography>
        )}
      </Drawer>
    </Layout>
  )
}
