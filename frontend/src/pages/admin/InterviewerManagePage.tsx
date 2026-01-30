import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Card, 
  Table, 
  Upload, 
  Button, 
  message, 
  Space, 
  Input, 
  Modal, 
  Form, 
  Switch, 
  Popconfirm,
  Tag
} from 'antd'
import { 
  UploadOutlined, 
  SearchOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined 
} from '@ant-design/icons'
import { api } from '../../utils/api'
import type { ColumnsType } from 'antd/es/table'

interface Interviewer {
  interviewer_id: string
  name: string
  email: string
  department: string
  position: string
  phone: string
  is_team_lead: boolean | string
  is_active: boolean | string
}

export function InterviewerManagePage() {
  const [searchText, setSearchText] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingInterviewer, setEditingInterviewer] = useState<Interviewer | null>(null)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const { data: interviewers, isLoading } = useQuery({
    queryKey: ['interviewers'],
    queryFn: async () => {
      const response = await api.get('/interviewers')
      return response.data.data
    },
  })

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const response = await api.post('/interviewers/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.data
    },
    onSuccess: (data) => {
      message.success(`업로드 완료: 신규 ${data.data.created}건, 업데이트 ${data.data.updated}건`)
      queryClient.invalidateQueries({ queryKey: ['interviewers'] })
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '업로드에 실패했습니다')
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/interviewers', data)
      return response.data
    },
    onSuccess: () => {
      message.success('면접관이 등록되었습니다')
      queryClient.invalidateQueries({ queryKey: ['interviewers'] })
      setIsModalOpen(false)
      form.resetFields()
      setEditingInterviewer(null)
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '면접관 등록에 실패했습니다')
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.put(`/interviewers/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      message.success('면접관 정보가 수정되었습니다')
      queryClient.invalidateQueries({ queryKey: ['interviewers'] })
      setIsModalOpen(false)
      form.resetFields()
      setEditingInterviewer(null)
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '면접관 수정에 실패했습니다')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/interviewers/${id}`)
      return response.data
    },
    onSuccess: () => {
      message.success('면접관이 비활성화되었습니다')
      queryClient.invalidateQueries({ queryKey: ['interviewers'] })
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '면접관 삭제에 실패했습니다')
    },
  })

  const handleUpload = (file: File) => {
    uploadMutation.mutate(file)
    return false // Prevent default upload
  }

  const handleAdd = () => {
    setEditingInterviewer(null)
    form.resetFields()
    setIsModalOpen(true)
  }

  const handleEdit = (interviewer: Interviewer) => {
    setEditingInterviewer(interviewer)
    form.setFieldsValue({
      name: interviewer.name,
      email: interviewer.email,
      department: interviewer.department,
      position: interviewer.position,
      phone: interviewer.phone,
      is_team_lead: interviewer.is_team_lead === true || interviewer.is_team_lead === 'TRUE',
      is_active: interviewer.is_active !== false && interviewer.is_active !== 'false' && interviewer.is_active !== 'FALSE',
    })
    setIsModalOpen(true)
  }

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id)
  }

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      if (editingInterviewer) {
        updateMutation.mutate({ id: editingInterviewer.interviewer_id, data: values })
      } else {
        createMutation.mutate(values)
      }
    })
  }

  const filteredInterviewers = interviewers?.filter((iv: Interviewer) => {
    if (!searchText) return true
    const search = searchText.toLowerCase()
    return (
      iv.name.toLowerCase().includes(search) ||
      iv.email.toLowerCase().includes(search) ||
      (iv.department && iv.department.toLowerCase().includes(search))
    )
  })

  const columns: ColumnsType<Interviewer> = [
    {
      title: '이름',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '이메일',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '부서',
      dataIndex: 'department',
      key: 'department',
    },
    {
      title: '직책',
      dataIndex: 'position',
      key: 'position',
    },
    {
      title: '연락처',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: '팀장',
      dataIndex: 'is_team_lead',
      key: 'is_team_lead',
      render: (isTeamLead: boolean | string) => (
        isTeamLead === true || isTeamLead === 'TRUE' ? (
          <Tag color="blue">팀장</Tag>
        ) : null
      ),
    },
    {
      title: '상태',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean | string) => {
        const active = isActive === true || isActive === 'TRUE' || (isActive !== false && isActive !== 'false' && isActive !== 'FALSE')
        return (
          <Tag color={active ? 'green' : 'default'}>
            {active ? '활성' : '비활성'}
          </Tag>
        )
      },
    },
    {
      title: '작업',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            수정
          </Button>
          <Popconfirm
            title="면접관 비활성화"
            description="이 면접관을 비활성화하시겠습니까?"
            onConfirm={() => handleDelete(record.interviewer_id)}
            okText="예"
            cancelText="아니오"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
            >
              삭제
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              면접관 등록
            </Button>
            <Upload
              beforeUpload={handleUpload}
              showUploadList={false}
              accept=".xlsx,.xls"
            >
              <Button
                icon={<UploadOutlined />}
                loading={uploadMutation.isPending}
              >
                Excel 업로드
              </Button>
            </Upload>
            <Input
              placeholder="이름, 이메일, 부서로 검색"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 300 }}
            />
          </Space>
        </Card>

        <Card title="면접관 목록">
          <Table
            columns={columns}
            dataSource={filteredInterviewers}
            loading={isLoading}
            rowKey="interviewer_id"
            pagination={{ pageSize: 20 }}
          />
        </Card>
      </Space>

      <Modal
        title={editingInterviewer ? '면접관 수정' : '면접관 등록'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={() => {
          setIsModalOpen(false)
          form.resetFields()
          setEditingInterviewer(null)
        }}
        okText={editingInterviewer ? '수정' : '등록'}
        cancelText="취소"
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            is_team_lead: false,
            is_active: true,
          }}
        >
          <Form.Item
            label="이름"
            name="name"
            rules={[{ required: true, message: '이름을 입력해주세요' }]}
          >
            <Input placeholder="홍길동" />
          </Form.Item>

          <Form.Item
            label="이메일"
            name="email"
            rules={[
              { required: true, message: '이메일을 입력해주세요' },
              { type: 'email', message: '올바른 이메일 형식이 아닙니다' },
            ]}
          >
            <Input placeholder="hong@example.com" type="email" />
          </Form.Item>

          <Form.Item
            label="부서"
            name="department"
          >
            <Input placeholder="개발팀" />
          </Form.Item>

          <Form.Item
            label="직책"
            name="position"
          >
            <Input placeholder="팀장" />
          </Form.Item>

          <Form.Item
            label="연락처"
            name="phone"
          >
            <Input placeholder="010-1234-5678" />
          </Form.Item>

          <Form.Item
            label="팀장 여부"
            name="is_team_lead"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            label="활성 상태"
            name="is_active"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
