import React from 'react'
import { Typography } from 'antd'

const { Paragraph } = Typography

export interface ScreenManual {
  title: string
  content: React.ReactNode
}

const manuals: Record<string, ScreenManual> = {
  '/admin/dashboard': {
    title: '대시보드 메뉴얼',
    content: (
      <>
        <Paragraph><strong>화면 목적</strong></Paragraph>
        <Paragraph>면접 현황을 한눈에 보고, 최근 면접 목록을 검색·필터할 수 있습니다.</Paragraph>
        <Paragraph><strong>상태 카드</strong></Paragraph>
        <ul>
          <li><strong>대기 중</strong>: 면접이 등록되었고, 면접관에게 일정 확인 메일이 발송된 상태. 아직 응답이 없거나 일부만 응답.</li>
          <li><strong>진행 중</strong>: 면접관 중 일부가 가능 일정을 제출한 상태. 공통 일정 확정 전.</li>
          <li><strong>완료</strong>: 모든 면접관이 응답했고, 겹치는 시간대로 일정이 확정된 상태.</li>
          <li><strong>공통 없음</strong>: 모든 면접관이 응답했지만, 서로 겹치는 가능 시간대가 없어 확정되지 않은 상태. 일정 재조율 또는 취소 후 진행 가능.</li>
        </ul>
        <Paragraph><strong>사용 방법</strong></Paragraph>
        <ul>
          <li>공고명/팀명 검색과 상태 필터로 목록을 좁힐 수 있습니다.</li>
          <li>「상세보기」로 해당 면접 상세 화면으로 이동합니다.</li>
          <li>「새 면접 등록」으로 면접 등록 화면으로 이동합니다.</li>
        </ul>
      </>
    ),
  },
  '/admin/interviews': {
    title: '면접 목록 메뉴얼',
    content: (
      <>
        <Paragraph><strong>화면 목적</strong></Paragraph>
        <Paragraph>등록된 모든 면접을 목록으로 보고, 검색·상태 필터·정렬로 찾아서 상세로 이동할 수 있습니다.</Paragraph>
        <Paragraph><strong>사용 방법</strong></Paragraph>
        <ul>
          <li>검색창에 공고명·팀명·면접관명 등을 입력해 목록을 필터링합니다.</li>
          <li>상태(대기 중/진행 중/완료/공통 없음 등)로 필터할 수 있습니다.</li>
          <li>행의 면접명 또는 「상세」 버튼으로 면접 상세 화면으로 이동합니다.</li>
        </ul>
      </>
    ),
  },
  '/admin/interviews/new': {
    title: '면접 등록 메뉴얼',
    content: (
      <>
        <Paragraph><strong>화면 목적</strong></Paragraph>
        <Paragraph>새 면접을 만들고, 면접관에게 일정 확인 메일을 자동 발송합니다.</Paragraph>
        <Paragraph><strong>입력 항목</strong></Paragraph>
        <ul>
          <li><strong>공고명·팀명</strong>: 면접 식별용.</li>
          <li><strong>제안 일시</strong>: 면접 희망 날짜와 시작/종료 시간. 종료 시간은 면접자 수와 소요 시간에 따라 자동 계산될 수 있습니다.</li>
          <li><strong>면접자</strong>: 이름, 이메일, 연락처, 지원 직무, 담당 면접관(1명 이상 선택). 이력서 파일을 올리면 해당 면접자에게 연결됩니다.</li>
        </ul>
        <Paragraph><strong>저장 시 동작</strong></Paragraph>
        <ul>
          <li>면접이 생성되고, 선택된 면접관들에게 「가능 일정 선택」 메일이 발송됩니다.</li>
          <li>메일이 0명 발송되면 SMTP 설정(.env)과 서버 로그를 확인하세요.</li>
        </ul>
      </>
    ),
  },
  '/admin/interviews/detail': {
    title: '면접 상세 메뉴얼',
    content: (
      <>
        <Paragraph><strong>화면 목적</strong></Paragraph>
        <Paragraph>한 건의 면접 정보, 면접자·면접관·일정·확정 상태를 보고, 리마인더 발송·일정 확정·취소·완료 등을 처리합니다.</Paragraph>
        <Paragraph><strong>주요 기능</strong></Paragraph>
        <ul>
          <li><strong>리마인더 발송</strong>: 아직 응답하지 않은 면접관에게 일정 확인 메일을 다시 보냅니다.</li>
          <li><strong>일정 확정</strong>: 면접관들이 선택한 시간 중 공통 시간이 있으면 확정할 수 있습니다.</li>
          <li><strong>AI 분석</strong>: 면접관별 가능 일정을 분석해 공통 시간대를 제안합니다.</li>
          <li><strong>취소/완료/노쇼</strong>: 상태에 따라 취소, 완료, 노쇼 처리할 수 있습니다.</li>
          <li><strong>포털 링크</strong>: 면접관 전용 포털 링크를 복사해 전달할 수 있습니다.</li>
        </ul>
      </>
    ),
  },
  '/admin/interviewers': {
    title: '면접관 관리 메뉴얼',
    content: (
      <>
        <Paragraph><strong>화면 목적</strong></Paragraph>
        <Paragraph>면접관을 등록·수정·삭제하고, 이메일·부서·팀장 여부를 관리합니다.</Paragraph>
        <Paragraph><strong>사용 방법</strong></Paragraph>
        <ul>
          <li>「면접관 추가」로 새 면접관을 등록합니다. 이메일은 로그인·메일 발송에 사용됩니다.</li>
          <li>엑셀 업로드로 여러 명을 한 번에 등록할 수 있습니다.</li>
          <li>수정/삭제는 각 행의 버튼으로 진행합니다. 테스트 메일 발송으로 연락처를 확인할 수 있습니다.</li>
        </ul>
      </>
    ),
  },
  '/admin/rooms': {
    title: '면접실 관리 메뉴얼',
    content: (
      <>
        <Paragraph><strong>화면 목적</strong></Paragraph>
        <Paragraph>면접실(회의실)을 등록·수정·삭제하고, 장소·수용 인원·비고를 관리합니다.</Paragraph>
        <Paragraph><strong>사용 방법</strong></Paragraph>
        <ul>
          <li>「면접실 추가」로 이름·위치·수용 인원 등을 입력해 등록합니다.</li>
          <li>목록에서 수정/삭제할 수 있습니다. 면접 일정에서 회의실을 지정할 때 여기 등록된 목록이 사용됩니다.</li>
        </ul>
      </>
    ),
  },
  '/admin/candidates': {
    title: '지원자 관리 메뉴얼',
    content: (
      <>
        <Paragraph><strong>화면 목적</strong></Paragraph>
        <Paragraph>지원자(후보자) 목록을 조회·등록·수정하고, 이력서와 연동합니다.</Paragraph>
        <Paragraph><strong>사용 방법</strong></Paragraph>
        <ul>
          <li>「지원자 추가」로 이름·이메일·연락처 등을 등록합니다.</li>
          <li>검색으로 지원자를 찾고, 상세/수정으로 정보를 변경할 수 있습니다.</li>
          <li>면접 등록 시 여기 등록된 지원자를 선택하거나, 면접 등록 화면에서 새로 입력할 수 있습니다.</li>
        </ul>
      </>
    ),
  },
  '/admin/candidates/detail': {
    title: '지원자 상세 메뉴얼',
    content: (
      <>
        <Paragraph><strong>화면 목적</strong></Paragraph>
        <Paragraph>한 지원자의 정보와 참여 면접 이력을 조회·수정합니다.</Paragraph>
        <Paragraph><strong>사용 방법</strong></Paragraph>
        <ul>
          <li>기본 정보 수정은 「수정」 버튼으로 지원자 수정 화면으로 이동합니다.</li>
          <li>참여 면접 목록에서 해당 면접 상세로 이동할 수 있습니다.</li>
        </ul>
      </>
    ),
  },
  '/admin/statistics': {
    title: '통계 및 리포트 메뉴얼',
    content: (
      <>
        <Paragraph><strong>화면 목적</strong></Paragraph>
        <Paragraph>면접·평가 통계를 보고, 기간별로 리포트를 조회하거나 엑셀으로 내보낼 수 있습니다.</Paragraph>
        <Paragraph><strong>사용 방법</strong></Paragraph>
        <ul>
          <li>기간을 선택해 통계 요약과 면접 목록을 확인합니다.</li>
          <li>「엑셀 내보내기」로 선택 기간의 면접 데이터를 다운로드할 수 있습니다.</li>
        </ul>
      </>
    ),
  },
  '/admin/interviewer-schedule': {
    title: '면접관 스케줄 메뉴얼',
    content: (
      <>
        <Paragraph><strong>화면 목적</strong></Paragraph>
        <Paragraph>면접관별로 이미 등록된 가능 일정을 조회·관리합니다. 면접 일정 조율 시 참고됩니다.</Paragraph>
        <Paragraph><strong>사용 방법</strong></Paragraph>
        <ul>
          <li>면접관을 선택하면 해당 면접관의 등록된 스케줄(날짜·시간)을 볼 수 있습니다.</li>
          <li>면접관이 확인 메일 링크에서 선택한 일정은 면접별로 「면접 상세」에서 확인할 수 있습니다.</li>
        </ul>
      </>
    ),
  },
  '/admin/calendar': {
    title: '캘린더 뷰 메뉴얼',
    content: (
      <>
        <Paragraph><strong>화면 목적</strong></Paragraph>
        <Paragraph>면접 일정을 달력 형태로 한눈에 볼 수 있습니다.</Paragraph>
        <Paragraph><strong>사용 방법</strong></Paragraph>
        <ul>
          <li>월/주 단위로 이동하면서 확정된 면접 일정을 확인합니다.</li>
          <li>일정 클릭 시 해당 면접 상세로 이동할 수 있습니다.</li>
        </ul>
      </>
    ),
  },
  '/admin/settings': {
    title: '설정 메뉴얼',
    content: (
      <>
        <Paragraph><strong>화면 목적</strong></Paragraph>
        <Paragraph>시스템 전역 설정을 관리합니다. 면접 소요 시간, 리마인더, 이메일 발신 정보, 회사 정보 등이 적용됩니다.</Paragraph>
        <Paragraph><strong>주요 설정</strong></Paragraph>
        <ul>
          <li><strong>면접 운영</strong>: 기본 면접 소요 시간, 업무/점심 시간대, 시간 슬롯 간격.</li>
          <li><strong>리마인더</strong>: 첫/두 번째 리마인더 시점, 최대 발송 횟수, D-1 리마인더 시간.</li>
          <li><strong>이메일</strong>: 발신 이메일·이름·회신 주소, 인사말·회사명·부서명·푸터 문구. (실제 발송은 서버 .env의 SMTP 설정 사용)</li>
          <li><strong>회사 정보</strong>: 로고, 주소, 주차·복장 안내 등.</li>
        </ul>
        <Paragraph>메일이 발송되지 않을 때는 상단 경고를 확인하고, 서버 .env에 SMTP_USER, SMTP_PASSWORD를 설정한 뒤 백엔드를 재시작하세요.</Paragraph>
      </>
    ),
  },
}

/** pathname에 해당하는 화면 메뉴얼 반환. 상세 페이지는 패턴으로 매칭 */
export function getScreenManual(pathname: string): ScreenManual | null {
  const path = pathname.replace(/\/$/, '').replace(/^\/hr_interview/, '') || '/admin/dashboard'
  if (manuals[path]) return manuals[path]
  if (/^\/admin\/interviews\/[^/]+$/.test(path) && !path.endsWith('/new')) return manuals['/admin/interviews/detail']
  if (path.includes('/edit')) return manuals['/admin/candidates'] ?? null
  if (/^\/admin\/candidates\/[^/]+$/.test(path)) return manuals['/admin/candidates/detail']
  return null
}
