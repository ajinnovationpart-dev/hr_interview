import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  Calendar,
  Badge,
  Select,
  DatePicker,
  Space,
  Alert,
  Modal,
  Descriptions,
} from 'antd';
import { CalendarOutlined, WarningOutlined } from '@ant-design/icons';
import { apiA } from '../../utils/apiA';
import dayjs, { Dayjs } from 'dayjs';
import type { CalendarProps } from 'antd';

export function CalendarPage() {
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);
  const [interviewerId, setInterviewerId] = useState<string>('');
  const [roomId, setRoomId] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const { data: rooms } = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      const response = await apiA.get('/rooms');
      return response.data.data;
    },
  });

  const { data: interviewers } = useQuery({
    queryKey: ['interviewers'],
    queryFn: async () => {
      const response = await apiA.get('/interviewers');
      return response.data.data;
    },
  });

  const { data: calendarData } = useQuery({
    queryKey: ['calendar', dateRange, interviewerId, roomId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange[0]) params.append('startDate', dateRange[0].format('YYYY-MM-DD'));
      if (dateRange[1]) params.append('endDate', dateRange[1].format('YYYY-MM-DD'));
      params.append('view', view);
      if (interviewerId) params.append('interviewerId', interviewerId);
      if (roomId) params.append('roomId', roomId);
      
      const response = await apiA.get(`/calendar/interviews?${params.toString()}`);
      return response.data.data;
    },
    enabled: !!dateRange[0] && !!dateRange[1],
  });

  const getListData = (value: Dayjs) => {
    if (!calendarData?.events) return [];
    
    const dateStr = value.format('YYYY-MM-DD');
    const dayEvents = calendarData.events.filter((event: any) => {
      const eventDate = dayjs(event.start).format('YYYY-MM-DD');
      return eventDate === dateStr;
    });
    
    return dayEvents.map((event: any) => ({
      type: event.resource.status === 'COMPLETED' ? 'success' :
            event.resource.status === 'CANCELLED' ? 'error' :
            event.resource.status === 'NO_SHOW' ? 'warning' : 'processing',
      content: event.title,
      event,
    }));
  };

  const dateCellRender: CalendarProps<Dayjs>['cellRender'] = (value) => {
    const listData = getListData(value);
    return (
      <ul className="events" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {listData.map((item: { type: string; content: string; event: any }, index: number) => (
          <li key={index} style={{ cursor: 'pointer' }}>
            <Badge
              status={item.type as any}
              text={
                <span
                  onClick={() => setSelectedEvent(item.event)}
                  style={{ fontSize: '12px' }}
                >
                  {item.content}
                </span>
              }
            />
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card
          title={
            <Space>
              <CalendarOutlined />
              <span>캘린더 뷰</span>
            </Space>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Space>
              <Select
                placeholder="면접관 필터"
                style={{ width: 200 }}
                allowClear
                value={interviewerId}
                onChange={setInterviewerId}
                showSearch
                filterOption={(input, option) => {
                  const label = typeof option?.label === 'string' ? option.label : String(option?.label ?? '')
                  return label.toLowerCase().includes(input.toLowerCase())
                }}
                options={interviewers?.map((iv: any) => ({
                  label: iv.name,
                  value: iv.interviewer_id,
                }))}
              />
              <Select
                placeholder="면접실 필터"
                style={{ width: 200 }}
                allowClear
                value={roomId}
                onChange={setRoomId}
                options={rooms?.map((room: any) => ({
                  label: room.room_name,
                  value: room.room_id,
                }))}
              />
              <Select
                value={view}
                onChange={setView}
                style={{ width: 120 }}
              >
                <Select.Option value="month">월간</Select.Option>
                <Select.Option value="week">주간</Select.Option>
                <Select.Option value="day">일간</Select.Option>
              </Select>
              <DatePicker.RangePicker
                value={dateRange}
                onChange={(dates) => {
                  if (dates) {
                    setDateRange([dates[0]!, dates[1]!]);
                  }
                }}
              />
            </Space>

            {calendarData?.conflicts && calendarData.conflicts.length > 0 && (
              <Alert
                message="일정 충돌 감지"
                description={
                  <Space direction="vertical">
                    {calendarData.conflicts.map((conflict: any, index: number) => (
                      <div key={index}>
                        <WarningOutlined /> {conflict.type === 'interviewer' ? '면접관' : '면접실'} 충돌: {conflict.resourceName}
                      </div>
                    ))}
                  </Space>
                }
                type="warning"
                showIcon
              />
            )}

            <Calendar
              cellRender={dateCellRender}
              style={{ width: '100%' }}
            />
          </Space>
        </Card>
      </Space>

      <Modal
        title="면접 상세 정보"
        open={!!selectedEvent}
        onCancel={() => setSelectedEvent(null)}
        footer={null}
      >
        {selectedEvent && (
          <Descriptions column={1}>
            <Descriptions.Item label="제목">{selectedEvent.title}</Descriptions.Item>
            <Descriptions.Item label="시작">{dayjs(selectedEvent.start).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
            <Descriptions.Item label="종료">{dayjs(selectedEvent.end).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
            <Descriptions.Item label="지원자">{selectedEvent.resource.candidateName}</Descriptions.Item>
            <Descriptions.Item label="면접관">{selectedEvent.resource.interviewers.join(', ')}</Descriptions.Item>
            <Descriptions.Item label="면접실">{selectedEvent.resource.roomName || '미지정'}</Descriptions.Item>
            <Descriptions.Item label="상태">{selectedEvent.resource.status}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
