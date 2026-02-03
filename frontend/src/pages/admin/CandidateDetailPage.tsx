import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  Descriptions,
  Table,
  Tag,
  Space,
  Button,
  Timeline,
  Spin,
} from 'antd';
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons';
import { api } from '../../utils/api';
import type { ColumnsType } from 'antd/es/table';

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

export function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['candidate', id],
    queryFn: async () => {
      const response = await api.get(`/candidates/${id}`);
      return response.data.data;
    },
  });

  const interviewColumns: ColumnsType<any> = [
    {
      title: '면접 ID',
      dataIndex: 'interviewId',
      key: 'interviewId',
    },
    {
      title: '면접 일자',
      dataIndex: 'interviewDate',
      key: 'interviewDate',
    },
    {
      title: '단계',
      dataIndex: 'stage',
      key: 'stage',
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={
          status === 'COMPLETED' ? 'green' :
          status === 'CANCELLED' ? 'red' :
          status === 'NO_SHOW' ? 'orange' : 'blue'
        }>
          {status}
        </Tag>
      ),
    },
    {
      title: '면접관',
      dataIndex: 'interviewers',
      key: 'interviewers',
      render: (interviewers: string[]) => interviewers.join(', '),
    },
    {
      title: '결과',
      dataIndex: 'result',
      key: 'result',
    },
    {
      title: '작업',
      key: 'action',
      render: (_: any, record: any) => (
        <Button
          type="link"
          onClick={() => navigate(`/admin/interviews/${record.interviewId}`)}
        >
          상세보기
        </Button>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <p>지원자를 찾을 수 없습니다.</p>
          <Button onClick={() => navigate('/admin/candidates')}>
            목록으로
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/candidates')}>
          목록으로
        </Button>

        <Card
          title="지원자 정보"
          extra={
            <Button
              icon={<EditOutlined />}
              onClick={() => navigate(`/admin/candidates/${id}/edit`)}
            >
              수정
            </Button>
          }
        >
          <Descriptions column={2}>
            <Descriptions.Item label="이름">{data.candidate.name}</Descriptions.Item>
            <Descriptions.Item label="이메일">{data.candidate.email || '-'}</Descriptions.Item>
            <Descriptions.Item label="전화번호">{data.candidate.phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="지원 직무">{data.candidate.position_applied}</Descriptions.Item>
            <Descriptions.Item label="상태">
              <Tag color={statusColors[data.candidate.status] || 'default'}>
                {statusLabels[data.candidate.status] || data.candidate.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="지원일">
              {data.candidate.created_at ? new Date(data.candidate.created_at).toLocaleDateString('ko-KR') : '-'}
            </Descriptions.Item>
            {data.candidate.resume_url && (
              <Descriptions.Item label="이력서">
                <a href={data.candidate.resume_url} target="_blank" rel="noopener noreferrer">
                  이력서 보기
                </a>
              </Descriptions.Item>
            )}
            {data.candidate.notes && (
              <Descriptions.Item label="비고" span={2}>
                {data.candidate.notes}
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        <Card title="면접 이력">
          <Table
            columns={interviewColumns}
            dataSource={data.interviews || []}
            rowKey="interviewId"
            pagination={false}
          />
        </Card>

        {data.timeline && data.timeline.length > 0 && (
          <Card title="타임라인">
            <Timeline
              items={data.timeline.map((item: any) => ({
                children: (
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{item.event}</div>
                    <div style={{ color: '#666' }}>{item.description}</div>
                    <div style={{ color: '#999', fontSize: '12px', marginTop: 4 }}>
                      {new Date(item.date).toLocaleString('ko-KR')}
                    </div>
                  </div>
                ),
              }))}
            />
          </Card>
        )}
      </Space>
    </div>
  );
}
