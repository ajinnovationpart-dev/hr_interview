import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Button } from 'antd'
import {
  DashboardOutlined,
  PlusOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../stores/authStore'

const { Header, Content, Sider } = Layout

export function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, clearAuth } = useAuthStore()

  const menuItems = [
    {
      key: '/admin/dashboard',
      icon: <DashboardOutlined />,
      label: '대시보드',
    },
    {
      key: '/admin/interviews/new',
      icon: <PlusOutlined />,
      label: '면접 등록',
    },
    {
      key: '/admin/interviewers',
      icon: <UserOutlined />,
      label: '면접관 관리',
    },
  ]

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
            selectedKeys={[location.pathname]}
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
    </Layout>
  )
}
