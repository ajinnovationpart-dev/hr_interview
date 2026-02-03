import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  DatePicker,
  Select,
  Space,
  Button,
  Tag,
  Progress,
} from 'antd';
import {
  CalendarOutlined,
  UserOutlined,
  HomeOutlined,
  DownloadOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { api } from '../../utils/api';
import dayjs, { Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

const { RangePicker } = DatePicker;

export function StatisticsPage() {
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(30, 'day'),
    dayjs(),
  ]);
  const [department, setDepartment] = useState<string>('');

  const { data: overviewData, isLoading: overviewLoading } = useQuery({
    queryKey: ['statistics', 'overview', dateRange, department],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange[0]) params.append('startDate', dateRange[0].format('YYYY-MM-DD'));
      if (dateRange[1]) params.append('endDate', dateRange[1].format('YYYY-MM-DD'));
      if (department) params.append('department', department);
      
      const response = await api.get(`/statistics/overview?${params.toString()}`);
      return response.data.data;
    },
  });

  const { data: roomStats, isLoading: roomStatsLoading } = useQuery({
    queryKey: ['statistics', 'rooms', dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange[0]) params.append('startDate', dateRange[0].format('YYYY-MM-DD'));
      if (dateRange[1]) params.append('endDate', dateRange[1].format('YYYY-MM-DD'));
      
      const response = await api.get(`/statistics/rooms?${params.toString()}`);
      return response.data.data;
    },
    enabled: !!dateRange[0] && !!dateRange[1],
  });

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (dateRange[0]) params.append('startDate', dateRange[0].format('YYYY-MM-DD'));
      if (dateRange[1]) params.append('endDate', dateRange[1].format('YYYY-MM-DD'));
      params.append('format', 'xlsx');
      params.append('includeDetails', 'true');
      
      const response = await api.get(`/export/interviews?${params.toString()}`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `면접통계_${dateRange[0].format('YYYY-MM-DD')}_${dateRange[1].format('YYYY-MM-DD')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const roomColumns: ColumnsType<any> = [
    {
      title: '면접실',
      dataIndex: 'roomName',
      key: 'roomName',
    },
    {
      title: '위치',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: '예약 건수',
      dataIndex: 'totalBookings',
      key: 'totalBookings',
      align: 'right',
    },
    {
      title: '사용률',
      dataIndex: 'utilizationRate',
      key: 'utilizationRate',
      render: (rate: number) => (
        <Progress
          percent={rate}
          format={(percent) => `${percent?.toFixed(1)}%`}
          status={rate > 80 ? 'success' : rate > 50 ? 'normal' : 'exception'}
        />
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <h1>
              <BarChartOutlined /> 통계 및 리포트
            </h1>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleExport}
            >
              Excel 내보내기
            </Button>
          </Space>
        </Card>

        <Card title="기간 선택">
          <Space>
            <RangePicker
              value={dateRange}
              onChange={(dates) => {
                if (dates) {
                  setDateRange([dates[0]!, dates[1]!]);
                }
              }}
            />
            <Select
              placeholder="부서 선택"
              style={{ width: 200 }}
              allowClear
              value={department}
              onChange={setDepartment}
            >
              {/* 부서 목록은 실제 데이터에서 가져와야 함 */}
            </Select>
          </Space>
        </Card>

        {overviewData && (
          <>
            <Row gutter={16}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="전체 면접"
                    value={overviewData.interviews?.total || 0}
                    prefix={<CalendarOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="완료된 면접"
                    value={overviewData.interviews?.byStatus?.COMPLETED || 0}
                    prefix={<CalendarOutlined />}
                    valueStyle={{ color: '#3f8600' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="활성 면접관"
                    value={overviewData.interviewers?.active || 0}
                    prefix={<UserOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="면접실 수"
                    value={overviewData.rooms?.total || 0}
                    prefix={<HomeOutlined />}
                  />
                </Card>
              </Col>
            </Row>

            <Card title="상태별 면접 통계">
              <Row gutter={16}>
                {Object.entries(overviewData.interviews?.byStatus || {}).map(([status, count]: [string, any]) => (
                  <Col span={4} key={status}>
                    <Statistic
                      title={status}
                      value={count}
                    />
                  </Col>
                ))}
              </Row>
            </Card>

            <Card title="면접관 순위 (상위 10명)">
              <Table
                columns={[
                  { title: '순위', key: 'rank', render: (_: any, __: any, index: number) => index + 1 },
                  { title: '이름', dataIndex: 'name', key: 'name' },
                  { title: '이메일', dataIndex: 'email', key: 'email' },
                  { title: '면접 수', dataIndex: 'count', key: 'count', align: 'right' },
                ]}
                dataSource={overviewData.interviewers?.topPerformers || []}
                pagination={false}
                rowKey="email"
              />
            </Card>

            {roomStats && (
              <Card title="면접실 사용률">
                <Table
                  columns={roomColumns}
                  dataSource={roomStats.rooms || []}
                  loading={roomStatsLoading}
                  rowKey="roomId"
                  pagination={false}
                />
              </Card>
            )}

            <Card title="일일 면접 추이">
              <Table
                columns={[
                  { title: '날짜', dataIndex: 'date', key: 'date' },
                  { title: '면접 수', dataIndex: 'count', key: 'count', align: 'right' },
                ]}
                dataSource={overviewData.trends?.dailyInterviews || []}
                pagination={false}
                rowKey="date"
              />
            </Card>
          </>
        )}
      </Space>
    </div>
  );
}
