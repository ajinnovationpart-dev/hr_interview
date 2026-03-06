import React from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Form, Input, DatePicker, TimePicker, Button, Card, Space, message, Divider, Typography, Select, Tag, Upload } from 'antd'
import { PlusOutlined, MinusCircleOutlined, UploadOutlined } from '@ant-design/icons'
import type { SelectProps, UploadFile } from 'antd'
import { useNavigate } from 'react-router-dom'
import dayjs, { Dayjs } from 'dayjs'
import { apiA } from '../../utils/apiA'
import { clampTimeToBusinessHours } from '../../utils/businessHours'

const { Text, Title } = Typography

function normalizeInterviewerId(id: unknown): string {
  return String(id ?? '').trim()
}

export function InterviewCreatePage() {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [resumeFiles, setResumeFiles] = React.useState<Record<number, UploadFile[]>>({})

  const { data: interviewers } = useQuery({
    queryKey: ['interviewers'],
    queryFn: async () => {
      const response = await apiA.get('/interviewers')
      return response.data.data
    },
  })

  // 면접관 ID 공백/중복 변형 방어: ID를 trim한 값 기준으로 중복 제거
  // (백엔드도 trim하여 유니크 처리하므로, 프론트에서 미리 동일한 기준으로 통일)
  const normalizedInterviewers = React.useMemo(() => {
    if (!Array.isArray(interviewers)) return []
    const byId = new Map<string, any>()
    const score = (iv: any) =>
      (iv?.is_active ? 2 : 0) + (iv?.email && String(iv.email).trim() ? 1 : 0)

    for (const iv of interviewers) {
      const id = normalizeInterviewerId(iv?.interviewer_id)
      if (!id) continue
      const existing = byId.get(id)
      if (!existing) {
        byId.set(id, iv)
        continue
      }
      if (score(iv) > score(existing)) {
        byId.set(id, iv)
      }
    }
    return Array.from(byId.values())
  }, [interviewers])

  // 면접 등록 화면에서는 "발송 가능한" 면접관만 노출 (비활성/이메일없음 숨김)
  const selectableInterviewers = React.useMemo(() => {
    return normalizedInterviewers.filter((iv: any) => {
      const active = !!iv?.is_active
      const hasEmail = !!iv?.email && String(iv.email).trim().length > 0
      return active && hasEmail
    })
  }, [normalizedInterviewers])

  // 면접관을 부서별로 그룹화
  const groupedInterviewers = selectableInterviewers?.reduce((acc: any, interviewer: any) => {
    const department = interviewer.department || '기타'
    if (!acc[department]) {
      acc[department] = []
    }
    acc[department].push(interviewer)
    return acc
  }, {}) || {}

  // 부서별 정렬된 키 목록
  const departmentKeys = Object.keys(groupedInterviewers).sort()

  // Select 옵션 생성 (부서별 OptGroup 사용)
  const interviewerOptions: SelectProps['options'] = departmentKeys.map((department) => {
    const deptInterviewers = groupedInterviewers[department]
    return {
      label: department,
      options: deptInterviewers.map((interviewer: any) => ({
        label: (
          <Space>
            <span style={{ fontWeight: interviewer.is_team_lead ? 600 : 400 }}>
              {interviewer.name}
            </span>
            {interviewer.position && (
              <Tag color="default" style={{ margin: 0 }}>{interviewer.position}</Tag>
            )}
            {interviewer.is_team_lead && (
              <Tag color="red" style={{ margin: 0 }}>⭐팀장급</Tag>
            )}
            {!interviewer.is_active && (
              <Tag color="default" style={{ margin: 0 }}>비활성</Tag>
            )}
            {(!interviewer.email || !String(interviewer.email).trim()) && (
              <Tag color="default" style={{ margin: 0 }}>이메일없음</Tag>
            )}
          </Space>
        ),
        value: normalizeInterviewerId(interviewer.interviewer_id),
        // selectableInterviewers로 이미 필터링되지만, 방어적으로 disabled 유지
        disabled: !interviewer.is_active || !interviewer.email || !String(interviewer.email).trim(),
        interviewer: interviewer,
      })),
    }
  })

  // 검색 필터 함수
  const filterOption = (input: string, option: any) => {
    // OptGroup의 경우 options 배열을 확인
    if (option.options) {
      return option.options.some((opt: any) => {
        const interviewer = opt.interviewer
        const searchText = input.toLowerCase()
        return (
          interviewer.name.toLowerCase().includes(searchText) ||
          interviewer.department?.toLowerCase().includes(searchText) ||
          interviewer.position?.toLowerCase().includes(searchText) ||
          interviewer.email?.toLowerCase().includes(searchText)
        )
      })
    }
    
    // 개별 옵션의 경우
    const interviewer = option.interviewer
    if (!interviewer) return false
    const searchText = input.toLowerCase()
    return (
      interviewer.name.toLowerCase().includes(searchText) ||
      interviewer.department?.toLowerCase().includes(searchText) ||
      interviewer.position?.toLowerCase().includes(searchText) ||
      interviewer.email?.toLowerCase().includes(searchText)
    )
  }

  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: async () => {
      try {
        const response = await apiA.get('/config')
        return response.data.data
      } catch (error) {
        // Config가 없어도 기본값 사용
        return {
          interview_duration_minutes: '30',
          work_start_time: '09:00',
          work_end_time: '18:00',
          lunch_start_time: '12:00',
          lunch_end_time: '13:00',
        }
      }
    },
    retry: false, // Backend 연결 실패 시 재시도 안 함
  })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiA.post('/interviews', data)
      return response.data
    },
    onSuccess: async (data) => {
      // 면접 생성 후 이력서 업로드
      const candidates = form.getFieldValue('candidates') || []
      const interviewData = data.data
      
      // 각 면접자에 대해 이력서 업로드
      const uploadPromises = candidates.map(async (candidate: any, index: number) => {
        const files = resumeFiles[index]
        if (!files || files.length === 0) return
        
        // candidateId 찾기 (면접 생성 응답에서)
        const candidateId = interviewData.candidates?.[index]?.candidateId || 
                           interviewData.candidateSchedules?.[index]?.candidateId
        if (!candidateId) {
          console.warn(`Candidate ID not found for candidate at index ${index}`)
          return
        }
        
        const file = files[0]
        if (file.originFileObj) {
          const formData = new FormData()
          // multer가 body를 채우려면 필드 순서: candidateId 먼저, 그 다음 파일
          formData.append('candidateId', String(candidateId))
          formData.append('resume', file.originFileObj)
          
          try {
            await apiA.post('/resumes/upload', formData)
          } catch (error: any) {
            const serverMessage = error.response?.data?.message
            console.error(`이력서 업로드 실패 (${candidate.name}):`, error, serverMessage ? { serverMessage } : '')
            message.warning(serverMessage || `${candidate.name}님의 이력서 업로드에 실패했습니다`)
          }
        }
      })
      
      await Promise.all(uploadPromises)

      const total = data.data.totalInterviewers ?? 0
      const sent = data.data.emailsSent ?? 0
      const missingIds = data.data.missingInterviewerIds as string[] | undefined
      const msg = data.message || `면접이 등록되었습니다. ${sent}명에게 메일이 발송되었습니다.`
      const allSent = total > 0 && sent === total
      if (allSent) message.success(msg)
      else message.warning(msg)
      if (missingIds?.length) {
        message.warning(`일부 면접관(ID: ${missingIds.join(', ')})이 면접관 목록에 없거나 이메일이 비어 있어 메일이 발송되지 않았습니다. 면접관 관리에서 등록·수정 후 리마인더를 보내 주세요.`, 8)
      }

      // 백엔드에서 내려주는 상세 결과(스킵/실패 사유) 요약 표시
      const emailResults = (data.data.emailResults as any[] | undefined) || undefined
      if (Array.isArray(emailResults) && emailResults.length > 0) {
        const problematic = emailResults.filter((r) => r?.status && r.status !== 'SENT')
        if (problematic.length > 0) {
          const short = problematic.slice(0, 5).map((r) => {
            const who = r?.name ? `${r.name}(${r.interviewerId})` : String(r?.interviewerId || '')
            const status = String(r.status)
            const reason = r?.reason ? `: ${String(r.reason)}` : ''
            return `${who} - ${status}${reason}`
          })
          const more = problematic.length > short.length ? ` 외 ${problematic.length - short.length}명` : ''
          message.warning(`메일 미발송/실패 상세: ${short.join(' / ')}${more}`, 10)
        }
      }
      navigate('/admin/dashboard')
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '면접 등록에 실패했습니다')
    },
  })

  const handleSubmit = (values: any) => {
    const proposedSlots = (values.proposedSlots || []).map((slot: { date: Dayjs; startTime: Dayjs; endTime: Dayjs }) => ({
      date: slot.date.format('YYYY-MM-DD'),
      startTime: slot.startTime.format('HH:mm'),
      endTime: slot.endTime.format('HH:mm'),
    }))
    if (proposedSlots.length < 1) {
      message.error('최소 1개의 제안 일정을 입력해주세요')
      return
    }
    if (proposedSlots.length > 5) {
      message.error('제안 일정은 최대 5개까지 입력할 수 있습니다')
      return
    }
    
    // 각 면접자별로 interviewerIds가 있는지 확인
    const candidates = values.candidates.map((c: any) => ({
      name: c.name,
      email: c.email || '',
      phone: c.phone || '',
      positionApplied: c.positionApplied,
      interviewerIds: Array.from(
        new Set((c.interviewerIds || []).map(normalizeInterviewerId).filter(Boolean))
      ),
    }))

    // 검증
    for (const candidate of candidates) {
      if (!candidate.interviewerIds || candidate.interviewerIds.length < 1) {
        message.error(`${candidate.name}님의 담당 면접관을 최소 1명 이상 선택해주세요`)
        return
      }
      if (candidate.interviewerIds.length > 5) {
        message.error(`${candidate.name}님의 담당 면접관은 최대 5명까지 선택 가능합니다`)
        return
      }
      
      // 팀장급 필수 체크
      const selectedInterviewers = normalizedInterviewers?.filter((iv: any) =>
        candidate.interviewerIds.includes(normalizeInterviewerId(iv.interviewer_id))
      ) || []
      const hasTeamLead = selectedInterviewers.some((iv: any) => iv.is_team_lead)
      
      // 활성/이메일 보유 체크 (비활성/이메일없음 선택 방지)
      const inactiveSelected = selectedInterviewers.filter((iv: any) => !iv.is_active)
      if (inactiveSelected.length) {
        message.error(`${candidate.name}님의 담당 면접관 중 비활성 면접관이 포함되어 있습니다. (예: ${inactiveSelected[0].name})`)
        return
      }
      const noEmailSelected = selectedInterviewers.filter((iv: any) => !iv.email || !String(iv.email).trim())
      if (noEmailSelected.length) {
        message.error(`${candidate.name}님의 담당 면접관 중 이메일이 없는 면접관이 포함되어 있습니다. (예: ${noEmailSelected[0].name})`)
        return
      }

      if (!hasTeamLead) {
        message.error(`${candidate.name}님의 담당 면접관 중 팀장급 이상 1명은 필수로 포함해야 합니다`)
        return
      }
    }

    mutation.mutate({
      mainNotice: values.mainNotice,
      teamName: values.teamName,
      proposedSlots,
      candidates,
    })
  }

  return (
    <Card title="새 면접 등록">
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          proposedSlots: [{ date: dayjs(), startTime: dayjs().hour(9).minute(0), endTime: dayjs().hour(10).minute(0) }],
          candidates: [{ name: '', email: '', phone: '', positionApplied: '', interviewerIds: [] }],
        }}
      >
        <Title level={4}>1. 공고 정보</Title>
        <Form.Item
          label="공고명"
          name="mainNotice"
          rules={[{ required: true, message: '공고명을 입력해주세요' }]}
        >
          <Input placeholder="예: 2025년 2월 수시 채용" />
        </Form.Item>

        <Form.Item
          label="팀명"
          name="teamName"
          rules={[{ required: true, message: '팀명을 입력해주세요' }]}
        >
          <Input placeholder="예: 정보전략팀" />
        </Form.Item>

        <Divider />

        <Title level={4}>2. 제안 일정</Title>
        <Form.List name="proposedSlots">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field, index) => (
                <Card
                  key={`slot-${field.key}`}
                  type="inner"
                  title={`제안 일정 ${index + 1}`}
                  extra={fields.length > 1 ? (
                    <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(field.name)}>
                      삭제
                    </Button>
                  ) : null}
                  style={{ marginBottom: '12px' }}
                >
                  <Space style={{ width: '100%' }} size="middle" wrap>
                    <Form.Item
                      label="날짜"
                      name={[field.name, 'date']}
                      rules={[{ required: true, message: '날짜를 선택해주세요' }]}
                    >
                      <DatePicker style={{ width: 180 }} />
                    </Form.Item>
                    <Form.Item
                      label="시작 시간"
                      name={[field.name, 'startTime']}
                      rules={[{ required: true, message: '시작 시간을 선택해주세요' }]}
                    >
                      <TimePicker
                        format="HH:mm"
                        minuteStep={30}
                        showNow={false}
                        changeOnScroll
                        onChange={(time: Dayjs | null) => time && form.setFieldValue(['proposedSlots', field.name, 'startTime'], clampTimeToBusinessHours(time, config) ?? time)}
                      />
                    </Form.Item>
                    <Form.Item
                      label="종료 시간"
                      name={[field.name, 'endTime']}
                      rules={[
                        { required: true, message: '종료 시간을 선택해주세요' },
                        ({ getFieldValue }) => ({
                          validator(_, value) {
                            const start = getFieldValue(['proposedSlots', field.name, 'startTime'])
                            if (!start || !value || !dayjs.isDayjs(start) || !dayjs.isDayjs(value)) return Promise.resolve()
                            if (value.isAfter(start)) return Promise.resolve()
                            return Promise.reject(new Error('종료 시간은 시작 시간보다 늦어야 합니다'))
                          }
                        })
                      ]}
                    >
                      <TimePicker
                        format="HH:mm"
                        minuteStep={30}
                        showNow={false}
                        changeOnScroll
                        onChange={(time: Dayjs | null) => time && form.setFieldValue(['proposedSlots', field.name, 'endTime'], clampTimeToBusinessHours(time, config) ?? time)}
                      />
                    </Form.Item>
                  </Space>
                </Card>
              ))}
              <Button
                type="dashed"
                block
                icon={<PlusOutlined />}
                onClick={() => {
                  if (fields.length >= 5) {
                    message.warning('제안 일정은 최대 5개까지 추가할 수 있습니다')
                    return
                  }
                  add({ date: dayjs(), startTime: dayjs().hour(9).minute(0), endTime: dayjs().hour(10).minute(0) })
                }}
              >
                일정 추가
              </Button>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                최소 1개, 최대 5개의 제안 일정을 등록할 수 있습니다.
              </Text>
            </>
          )}
        </Form.List>

        <Divider />

        <Title level={4}>3. 면접자 및 담당 면접관</Title>
        <Form.List name="candidates">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field, index) => (
                <Card
                  key={`candidate-${field.key}`}
                  type="inner"
                  title={`면접자 ${index + 1}`}
                  extra={
                    fields.length > 1 && (
                      <Button 
                        type="text" 
                        danger 
                        icon={<MinusCircleOutlined />}
                        onClick={() => {
                          remove(field.name)
                        }}
                      >
                        삭제
                      </Button>
                    )
                  }
                  style={{ marginBottom: '16px' }}
                >
                  <Form.Item
                    key={field.key}
                    label="이름"
                    name={[field.name, 'name']}
                    rules={[{ required: true, message: '이름을 입력해주세요' }]}
                  >
                    <Input placeholder="홍길동" />
                  </Form.Item>

                  <Form.Item
                    key={`${field.key}-email`}
                    label="이메일"
                    name={[field.name, 'email']}
                  >
                    <Input placeholder="hong@example.com" type="email" />
                  </Form.Item>

                  <Form.Item
                    key={`${field.key}-phone`}
                    label="전화번호"
                    name={[field.name, 'phone']}
                  >
                    <Input placeholder="010-1234-5678" />
                  </Form.Item>

                  <Form.Item
                    key={`${field.key}-position`}
                    label="지원 직무"
                    name={[field.name, 'positionApplied']}
                    rules={[{ required: true, message: '지원 직무를 입력해주세요' }]}
                  >
                    <Input placeholder="선임 개발자" />
                  </Form.Item>

                  <Form.Item
                    key={`${field.key}-resume`}
                    label="이력서 (선택)"
                    name={[field.name, 'resume']}
                  >
                    <Upload
                      beforeUpload={() => false} // 자동 업로드 방지
                      maxCount={1}
                      accept=".pdf,.doc,.docx,.hwp,.txt"
                      fileList={resumeFiles[field.name] || []}
                      onChange={({ fileList }) => {
                        setResumeFiles(prev => ({
                          ...prev,
                          [field.name]: fileList,
                        }))
                      }}
                      onRemove={() => {
                        setResumeFiles(prev => {
                          const newFiles = { ...prev }
                          delete newFiles[field.name]
                          return newFiles
                        })
                      }}
                    >
                      <Button icon={<UploadOutlined />}>이력서 선택</Button>
                    </Upload>
                    <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '4px' }}>
                      지원 형식: PDF, DOC, DOCX, HWP, TXT (최대 10MB)
                    </Text>
                  </Form.Item>

                  <Form.Item
                    key={`${field.key}-interviewers`}
                    label="담당 면접관 (복수 선택)"
                    name={[field.name, 'interviewerIds']}
                    rules={[
                      { required: true, message: '최소 1명 이상 선택하세요' },
                      {
                        validator: async (_, value) => {
                          if (!value || value.length < 1) {
                            throw new Error('최소 1명 이상 선택해야 합니다')
                          }
                          if (value.length > 5) {
                            throw new Error('최대 5명까지 선택 가능합니다')
                          }
                          
                          // 팀장급 필수 체크
                          const selectedInterviewers = interviewers?.filter((iv: any) => 
                            value.includes(iv.interviewer_id)
                          ) || []
                          const hasTeamLead = selectedInterviewers.some((iv: any) => iv.is_team_lead)
                          
                          if (!hasTeamLead) {
                            throw new Error('팀장급 이상 1명은 필수로 포함해야 합니다')
                          }
                        }
                      }
                    ]}
                  >
                    <Select
                      mode="multiple"
                      placeholder="면접관을 검색하여 선택하세요 (이름, 부서, 직책으로 검색 가능)"
                      options={interviewerOptions}
                      filterOption={filterOption}
                      showSearch
                      allowClear
                      style={{ width: '100%' }}
                      maxTagCount="responsive"
                      tagRender={(props) => {
                        const { value, closable, onClose } = props
                        const interviewer =
                          selectableInterviewers?.find((iv: any) => normalizeInterviewerId(iv.interviewer_id) === value) ||
                          normalizedInterviewers?.find((iv: any) => normalizeInterviewerId(iv.interviewer_id) === value)
                        return (
                          <Tag
                            color={interviewer?.is_team_lead ? 'red' : 'blue'}
                            closable={closable}
                            onClose={onClose}
                            style={{ marginRight: 3 }}
                          >
                            {interviewer?.name} {interviewer?.is_team_lead && '⭐'}
                          </Tag>
                        )
                      }}
                    />
                  </Form.Item>

                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    💡 첫 번째 선택한 면접관이 주면접관(PRIMARY)으로 지정됩니다
                  </Text>
                </Card>
              ))}

              <Button
                type="dashed"
                onClick={() => {
                  add()
                }}
                block
                icon={<PlusOutlined />}
              >
                면접자 추가
              </Button>
            </>
          )}
        </Form.List>

        <Divider />

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" size="large" loading={mutation.isPending}>
              저장 및 메일 발송
            </Button>
            <Button onClick={() => navigate('/admin/dashboard')} size="large">
              취소
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  )
}
