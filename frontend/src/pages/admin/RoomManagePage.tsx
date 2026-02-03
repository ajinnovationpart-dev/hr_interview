import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Table,
  Button,
  message,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Tag,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { api } from '../../utils/api';
import type { ColumnsType } from 'antd/es/table';

interface Room {
  room_id: string;
  room_name: string;
  location: string;
  capacity: number;
  facilities: string[];
  status: 'available' | 'maintenance' | 'reserved';
  notes?: string;
}

export function RoomManagePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: rooms, isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      const response = await api.get('/rooms');
      return response.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/rooms', data);
      return response.data;
    },
    onSuccess: () => {
      message.success('면접실이 등록되었습니다');
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setIsModalOpen(false);
      form.resetFields();
      setEditingRoom(null);
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '면접실 등록에 실패했습니다');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.put(`/rooms/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      message.success('면접실 정보가 수정되었습니다');
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setIsModalOpen(false);
      form.resetFields();
      setEditingRoom(null);
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '면접실 수정에 실패했습니다');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/rooms/${id}`);
      return response.data;
    },
    onSuccess: () => {
      message.success('면접실이 삭제되었습니다');
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '면접실 삭제에 실패했습니다');
    },
  });

  const handleCreate = () => {
    setEditingRoom(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (room: Room) => {
    setEditingRoom(room);
    form.setFieldsValue({
      ...room,
      facilities: room.facilities || [],
    });
    setIsModalOpen(true);
  };

  const handleDelete = (roomId: string) => {
    deleteMutation.mutate(roomId);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingRoom) {
        updateMutation.mutate({ id: editingRoom.room_id, data: values });
      } else {
        createMutation.mutate(values);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const statusColors: Record<string, string> = {
    available: 'green',
    maintenance: 'orange',
    reserved: 'red',
  };

  const statusLabels: Record<string, string> = {
    available: '사용 가능',
    maintenance: '점검 중',
    reserved: '예약됨',
  };

  const columns: ColumnsType<Room> = [
    {
      title: '면접실 이름',
      dataIndex: 'room_name',
      key: 'room_name',
    },
    {
      title: '위치',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: '수용 인원',
      dataIndex: 'capacity',
      key: 'capacity',
      render: (capacity: number) => `${capacity}명`,
    },
    {
      title: '시설',
      dataIndex: 'facilities',
      key: 'facilities',
      render: (facilities: string[]) => (
        <Space>
          {facilities?.map((facility, index) => (
            <Tag key={index}>{facility}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColors[status]}>
          {statusLabels[status]}
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
          <Popconfirm
            title="면접실 삭제"
            description="이 면접실을 삭제하시겠습니까?"
            onConfirm={() => handleDelete(record.room_id)}
            okText="삭제"
            cancelText="취소"
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
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title="면접실 관리"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            면접실 등록
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={rooms}
          loading={isLoading}
          rowKey="room_id"
          pagination={{ pageSize: 20 }}
        />
      </Card>

      <Modal
        title={editingRoom ? '면접실 수정' : '면접실 등록'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
          setEditingRoom(null);
        }}
        okText={editingRoom ? '수정' : '등록'}
        cancelText="취소"
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            status: 'available',
            facilities: [],
          }}
        >
          <Form.Item
            label="면접실 이름"
            name="room_name"
            rules={[{ required: true, message: '면접실 이름을 입력해주세요' }]}
          >
            <Input placeholder="예: 회의실 A" />
          </Form.Item>

          <Form.Item
            label="위치"
            name="location"
            rules={[{ required: true, message: '위치를 입력해주세요' }]}
          >
            <Input placeholder="예: 본관 3층" />
          </Form.Item>

          <Form.Item
            label="수용 인원"
            name="capacity"
            rules={[{ required: true, message: '수용 인원을 입력해주세요' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="예: 10" />
          </Form.Item>

          <Form.Item
            label="시설"
            name="facilities"
          >
            <Select
              mode="tags"
              placeholder="시설을 입력하세요 (예: 빔프로젝터, 화이트보드)"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            label="상태"
            name="status"
          >
            <Select>
              <Select.Option value="available">사용 가능</Select.Option>
              <Select.Option value="maintenance">점검 중</Select.Option>
              <Select.Option value="reserved">예약됨</Select.Option>
            </Select>
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
