import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  Select,
  DatePicker,
  Table,
  Tag,
  Space,
  Calendar,
  Badge,
  Empty,
} from 'antd';
import { UserOutlined, CalendarOutlined } from '@ant-design/icons';
import { api } from '../../utils/api';
import dayjs, { Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import type { CalendarProps } from 'antd';

const { RangePicker } = DatePicker;

export function InterviewerSchedulePage() {
  const [interviewerId, setInterviewerId] = useState<string>('');
  const [view, setView] = useState<'day' | 'week' | 'month'>('week');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('week'),
    dayjs().endOf('week'),
  ]);

  const { data: interviewers } = useQuery({
    queryKey: ['interviewers'],
    queryFn: async () => {
      const response = await api.get('/interviewers');
      return response.data.data;
    },
  });

  const { data: scheduleData, isLoading } = useQuery({
    queryKey: ['interviewer-schedule', interviewerId, view, dateRange],
    queryFn: async () => {
      if (!interviewerId) return null;
      
      const params = new URLSearchParams();
      params.append('view', view);
      if (dateRange[0]) params.append('startDate', dateRange[0].format('YYYY-MM-DD'));
      if (dateRange[1]) params.append('endDate', dateRange[1].format('YYYY-MM-DD'));
      
      const response = await api.get(`/interviewers/${interviewerId}/schedule?${params.toString()}`);
      return response.data.data;
    },
    enabled: !!interviewerId,
  });

  const scheduleColumns: ColumnsType<any> = [
    {
      title: '날짜',
      dataIndex: 'date',
      key: 'date',
      width: 120,
    },
    {
      title: '면접',
      key: 'interviews',
      render: (_: any, record: any) => (
        <Space direction="vertical" style={{ width: '100%' }}>
          {record.interviews.length > 0 ? (
            record.interviews.map((interview: any, index: number) => (
              <Card key={index} size="small">
                <Space direction="vertical" size="small">
                  <div>
                    <strong>{interview.candidateName}</strong>
                    <Tag color="blue" style={{ marginLeft: 8 }}>
                      {interview.role === 'PRIMARY' ? '주면접관' : '보조면접관'}
                    </Tag>
                  </div>
                  <div>
                    <CalendarOutlined /> {interview.startTime} ~ {interview.endTime}
                  </div>
                  {interview.roomName && (
                    <div>📍 {interview.roomName}</div>
                  )}
                  <Tag color={
                    interview.status === 'COMPLETED' ? 'green' :
                    interview.status === 'CANCELLED' ? 'red' :
                    interview.status === 'NO_SHOW' ? 'orange' : 'blue'
                  }>
                    {interview.status}
                  </Tag>
                </Space>
              </Card>
            ))
          ) : (
            <Empty description="면접 없음" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Space>
      ),
    },
    {
      title: '가용 시간',
      key: 'availableSlots',
      render: (_: any, record: any) => (
        <Space wrap>
          {record.availableSlots.slice(0, 10).map((slot: any, index: number) => (
            <Tag key={index} color="green">
              {slot.startTime}~{slot.endTime}
            </Tag>
          ))}
          {record.availableSlots.length > 10 && (
            <Tag>+{record.availableSlots.length - 10}개 더</Tag>
          )}
        </Space>
      ),
    },
  ];

  const getListData = (value: Dayjs) => {
    if (!scheduleData?.weekSchedule) return [];
    
    const dateStr = value.format('YYYY-MM-DD');
    const daySchedule = scheduleData.weekSchedule.find((s: any) => s.date === dateStr);
    
    if (!daySchedule || daySchedule.interviews.length === 0) return [];
    
    return daySchedule.interviews.map((interview: any) => ({
      type: 'success',
      content: `${interview.candidateName} (${interview.startTime})`,
    }));
  };

  const dateCellRender: CalendarProps<Dayjs>['cellRender'] = (value) => {
    const listData = getListData(value);
    return (
      <ul className="events">
        {listData.map((item: { type: string; content: string }, index: number) => (
          <li key={index}>
            <Badge status={item.type as any} text={item.content} />
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={
          <Space>
            <UserOutlined />
            <span>면접관별 스케줄 조회</span>
          </Space>
        }
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Space>
            <Select
              placeholder="면접관 선택"
              style={{ width: 300 }}
              value={interviewerId}
              onChange={setInterviewerId}
              showSearch
              filterOption={(input, option) => {
                const label = typeof option?.label === 'string' ? option.label : String(option?.label ?? '')
                return label.toLowerCase().includes(input.toLowerCase())
              }}
              options={interviewers?.map((iv: any) => ({
                label: `${iv.name} (${iv.email})`,
                value: iv.interviewer_id,
              }))}
            />
            <Select
              value={view}
              onChange={setView}
              style={{ width: 120 }}
            >
              <Select.Option value="day">일간</Select.Option>
              <Select.Option value="week">주간</Select.Option>
              <Select.Option value="month">월간</Select.Option>
            </Select>
            <RangePicker
              value={dateRange}
              onChange={(dates) => {
                if (dates) {
                  setDateRange([dates[0]!, dates[1]!]);
                }
              }}
            />
          </Space>

          {scheduleData && (
            <>
              <Card title="통계">
                <Space>
                  <div>전체 면접: {scheduleData.statistics.totalInterviews}건</div>
                  <div>완료: {scheduleData.statistics.completedInterviews}건</div>
                  <div>예정: {scheduleData.statistics.upcomingInterviews}건</div>
                </Space>
              </Card>

              {view === 'month' ? (
                <Card title="캘린더 뷰">
                  <Calendar cellRender={dateCellRender} />
                </Card>
              ) : (
                <Card title="스케줄 상세">
                  <Table
                    columns={scheduleColumns}
                    dataSource={scheduleData.weekSchedule}
                    loading={isLoading}
                    rowKey="date"
                    pagination={false}
                  />
                </Card>
              )}
            </>
          )}

          {!interviewerId && (
            <Card>
              <Empty description="면접관을 선택해주세요" />
            </Card>
          )}
        </Space>
      </Card>
    </div>
  );
}
