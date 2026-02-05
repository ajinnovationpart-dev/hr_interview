import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Select,
  Modal,
  Form,
  Tag,
  message,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { apiA } from '../../utils/apiA';
import type { ColumnsType } from 'antd/es/table';

interface Candidate {
  candidate_id: string;
  name: string;
  email: string;
  phone: string;
  position_applied: string;
  status: string;
  resume_url?: string;
  notes?: string;
  created_at: string;
}

const statusColors: Record<string, string> = {
  applied: 'blue',
  screening: 'orange',
  interviewing: 'purple',
  offer: 'green',
  rejected: 'red',
  withdrawn: 'default',
};

const statusLabels: Record<string, string> = {
  applied: '지원',
  screening: '서류심사',
  interviewing: '면접 진행중',
  offer: '제안',
  rejected: '불합격',
  withdrawn: '지원 취소',
};

export function CandidateManagePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['candidates', searchText, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchText) params.append('search', searchText);
      if (statusFilter) params.append('status', statusFilter);
      
      const response = await apiA.get(`/candidates?${params.toString()}`);
      return response.data.data.candidates;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: any) => {
      const response = await apiA.post('/candidates', values);
      return response.data;
    },
    onSuccess: () => {
      message.success('지원자가 등록되었습니다');
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      setIsModalOpen(false);
      form.resetFields();
      setEditingCandidate(null);
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '지원자 등록에 실패했습니다');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiA.put(`/candidates/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      message.success('지원자 정보가 수정되었습니다');
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      setIsModalOpen(false);
      form.resetFields();
      setEditingCandidate(null);
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '지원자 수정에 실패했습니다');
    },
  });

  const handleCreate = () => {
    setEditingCandidate(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (candidate: Candidate) => {
    setEditingCandidate(candidate);
    form.setFieldsValue(candidate);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingCandidate) {
        updateMutation.mutate({ id: editingCandidate.candidate_id, data: values });
      } else {
        createMutation.mutate(values);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const columns: ColumnsType<Candidate> = [
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
      title: '전화번호',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: '지원 직무',
      dataIndex: 'position_applied',
      key: 'position_applied',
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColors[status] || 'default'}>
          {statusLabels[status] || status}
        </Tag>
      ),
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
          <Button
            type="link"
            onClick={() => window.open(`/admin/candidates/${record.candidate_id}`, '_blank')}
          >
            상세보기
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={
          <Space>
            <UserOutlined />
            <span>지원자 관리</span>
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            지원자 등록
          </Button>
        }
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Space>
            <Input
              placeholder="이름/이메일 검색..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 300 }}
              allowClear
            />
            <Select
              placeholder="상태 선택"
              style={{ width: 150 }}
              allowClear
              value={statusFilter}
              onChange={setStatusFilter}
            >
              {Object.entries(statusLabels).map(([value, label]) => (
                <Select.Option key={value} value={value}>
                  {label}
                </Select.Option>
              ))}
            </Select>
          </Space>

          <Table
            columns={columns}
            dataSource={data}
            loading={isLoading}
            rowKey="candidate_id"
            pagination={{ pageSize: 20 }}
          />
        </Space>
      </Card>

      <Modal
        title={editingCandidate ? '지원자 수정' : '지원자 등록'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
          setEditingCandidate(null);
        }}
        okText={editingCandidate ? '수정' : '등록'}
        cancelText="취소"
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="이름"
            name="name"
            rules={[{ required: true, message: '이름을 입력해주세요' }]}
          >
            <Input placeholder="이름" />
          </Form.Item>

          <Form.Item
            label="이메일"
            name="email"
            rules={[{ type: 'email', message: '올바른 이메일 형식을 입력해주세요' }]}
          >
            <Input placeholder="email@example.com" />
          </Form.Item>

          <Form.Item
            label="전화번호"
            name="phone"
          >
            <Input placeholder="010-1234-5678" />
          </Form.Item>

          <Form.Item
            label="지원 직무"
            name="position_applied"
            rules={[{ required: true, message: '지원 직무를 입력해주세요' }]}
          >
            <Input placeholder="예: 백엔드 개발자" />
          </Form.Item>

          <Form.Item
            label="상태"
            name="status"
          >
            <Select>
              {Object.entries(statusLabels).map(([value, label]) => (
                <Select.Option key={value} value={value}>
                  {label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="이력서 URL"
            name="resume_url"
          >
            <Input placeholder="https://..." />
          </Form.Item>

          <Form.Item
            label="비고"
            name="notes"
          >
            <Input.TextArea rows={3} placeholder="비고를 입력하세요" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
