/**
 * Google Apps Script를 사용한 면접 일정 자동화 시스템 (완전판 v3.0)
 * N:N 매핑, 30분 단위 타임 슬롯, 메일 규칙 관리 지원
 */

// API 키 (보안을 위해 변경하세요)
const API_KEY = 'aj-innovation-2025-secret-key-xyz123';

/**
 * GET 요청 처리
 */
function doGet(e) {
  return handleRequest(e);
}

/**
 * POST 요청 처리
 */
function doPost(e) {
  return handleRequest(e);
}

/**
 * 요청 처리 메인 함수
 */
function handleRequest(e) {
  // API 키 검증
  const apiKey = e.parameter.apiKey || e.parameter.api_key || (e.postData && JSON.parse(e.postData.contents).apiKey);
  if (apiKey !== API_KEY) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: 'Invalid API key'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  const action = e.parameter.action || (e.postData && JSON.parse(e.postData.contents).action);
  
  try {
    let result;
    
    switch(action) {
      // Interviews
      case 'getInterviews':
        result = getInterviews();
        break;
      case 'getInterview':
        result = getInterview(e.parameter.interviewId || JSON.parse(e.postData.contents).interviewId);
        break;
      case 'createInterview':
        result = createInterview(JSON.parse(e.postData.contents).data);
        break;
      case 'updateInterviewStatus':
        result = updateInterviewStatus(
          e.parameter.interviewId || JSON.parse(e.postData.contents).interviewId,
          e.parameter.status || JSON.parse(e.postData.contents).status
        );
        break;
      
      // Candidates
      case 'getCandidates':
        result = getCandidates();
        break;
      case 'getCandidatesByInterview':
        result = getCandidatesByInterview(e.parameter.interviewId || JSON.parse(e.postData.contents).interviewId);
        break;
      case 'createCandidate':
        result = createCandidate(JSON.parse(e.postData.contents).data);
        break;
      case 'getCandidateById':
        result = getCandidateById(e.parameter.candidateId || JSON.parse(e.postData.contents).candidateId);
        break;
      case 'updateCandidate':
        result = updateCandidate(
          e.parameter.candidateId || JSON.parse(e.postData.contents).candidateId,
          JSON.parse(e.postData.contents).updates || {}
        );
        break;
      
      // Interview-Candidate Mapping
      case 'createInterviewCandidate':
        result = createInterviewCandidate(JSON.parse(e.postData.contents).data);
        break;
      case 'getInterviewCandidates':
        result = getInterviewCandidates(e.parameter.interviewId || JSON.parse(e.postData.contents).interviewId);
        break;
      
      // Candidate-Interviewer Mapping (N:N)
      case 'createCandidateInterviewer':
        result = createCandidateInterviewer(JSON.parse(e.postData.contents).data);
        break;
      case 'getCandidateInterviewers':
        result = getCandidateInterviewers(
          e.parameter.interviewId || JSON.parse(e.postData.contents).interviewId,
          e.parameter.candidateId || JSON.parse(e.postData.contents).candidateId
        );
        break;
      
      // Interviewers
      case 'getInterviewers':
        result = getInterviewers();
        break;
      case 'getInterviewer':
        result = getInterviewer(e.parameter.interviewerId || JSON.parse(e.postData.contents).interviewerId);
        break;
      case 'createOrUpdateInterviewers':
        result = createOrUpdateInterviewers(JSON.parse(e.postData.contents).data);
        break;
      
      // Interview-Interviewer Mapping
      case 'getInterviewInterviewers':
        result = getInterviewInterviewers(e.parameter.interviewId || JSON.parse(e.postData.contents).interviewId);
        break;
      case 'createInterviewInterviewers':
        result = createInterviewInterviewers(JSON.parse(e.postData.contents).data);
        break;
      case 'updateRespondedAt':
        result = updateRespondedAt(
          e.parameter.interviewId || JSON.parse(e.postData.contents).interviewId,
          e.parameter.interviewerId || JSON.parse(e.postData.contents).interviewerId
        );
        break;
      case 'updateReminderSent':
        result = updateReminderSent(
          e.parameter.interviewId || JSON.parse(e.postData.contents).interviewId,
          e.parameter.interviewerId || JSON.parse(e.postData.contents).interviewerId
        );
        break;
      
      // Time Selections
      case 'getTimeSelections':
        result = getTimeSelections(e.parameter.interviewId || JSON.parse(e.postData.contents).interviewId);
        break;
      case 'createTimeSelections':
        result = createTimeSelections(JSON.parse(e.postData.contents).data);
        break;
      
      // Confirmed Schedules
      case 'getConfirmedSchedule':
        result = getConfirmedSchedule(e.parameter.interviewId || JSON.parse(e.postData.contents).interviewId);
        break;
      case 'getConfirmedSchedulesByCandidate':
        result = getConfirmedSchedulesByCandidate(
          e.parameter.interviewId || JSON.parse(e.postData.contents).interviewId,
          e.parameter.candidateId || JSON.parse(e.postData.contents).candidateId
        );
        break;
      case 'createConfirmedSchedule':
        result = createConfirmedSchedule(JSON.parse(e.postData.contents).data);
        break;
      
      // Config
      case 'getConfig':
        result = getConfig();
        break;
      case 'updateConfig':
        result = updateConfig(JSON.parse(e.postData.contents).data);
        break;
      
      default:
        throw new Error('Invalid action');
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      data: result
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ========== Helper Functions ==========

function getSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    // 헤더 추가
    initializeSheetHeaders(sheet, sheetName);
  }
  return sheet;
}

function initializeSheetHeaders(sheet, sheetName) {
  switch(sheetName) {
    case 'interviews':
      sheet.getRange(1, 1, 1, 10).setValues([[
        'interview_id', 'main_notice', 'team_name', 'proposed_date', 
        'proposed_start_time', 'proposed_end_time', 'status', 
        'created_by', 'created_at', 'updated_at'
      ]]);
      break;
    case 'candidates':
      sheet.getRange(1, 1, 1, 6).setValues([[
        'candidate_id', 'name', 'email', 'phone', 'position_applied', 'created_at'
      ]]);
      break;
    case 'interview_candidates':
      sheet.getRange(1, 1, 1, 6).setValues([[
        'interview_id', 'candidate_id', 'sequence', 'scheduled_start_time', 
        'scheduled_end_time', 'created_at'
      ]]);
      break;
    case 'candidate_interviewers':
      sheet.getRange(1, 1, 1, 5).setValues([[
        'interview_id', 'candidate_id', 'interviewer_id', 'role', 'created_at'
      ]]);
      break;
    case 'interviewers':
      sheet.getRange(1, 1, 1, 9).setValues([[
        'interviewer_id', 'name', 'email', 'department', 'position', 
        'is_team_lead', 'phone', 'is_active', 'created_at'
      ]]);
      break;
    case 'interview_interviewers':
      sheet.getRange(1, 1, 1, 5).setValues([[
        'interview_id', 'interviewer_id', 'responded_at', 
        'reminder_sent_count', 'last_reminder_sent_at'
      ]]);
      break;
    case 'time_selections':
      sheet.getRange(1, 1, 1, 7).setValues([[
        'selection_id', 'interview_id', 'interviewer_id', 'slot_date', 
        'start_time', 'end_time', 'created_at'
      ]]);
      break;
    case 'confirmed_schedules':
      sheet.getRange(1, 1, 1, 6).setValues([[
        'interview_id', 'candidate_id', 'confirmed_date', 
        'confirmed_start_time', 'confirmed_end_time', 'confirmed_at'
      ]]);
      break;
    case 'config':
      sheet.getRange(1, 1, 1, 4).setValues([[
        'config_key', 'config_value', 'description', 'updated_at'
      ]]);
      // 기본 설정 데이터 추가
      initializeDefaultConfig(sheet);
      break;
  }
}

function initializeDefaultConfig(sheet) {
  const defaultConfigs = [
    ['interview_duration_minutes', '30', '면접 1인당 소요 시간 (분)', new Date().toISOString()],
    ['work_start_time', '09:00', '업무 시작 시간', new Date().toISOString()],
    ['work_end_time', '18:00', '업무 종료 시간', new Date().toISOString()],
    ['lunch_start_time', '12:00', '점심 시작 시간', new Date().toISOString()],
    ['lunch_end_time', '13:00', '점심 종료 시간', new Date().toISOString()],
    ['time_slot_interval', '30', '타임슬롯 간격 (분)', new Date().toISOString()],
    ['reminder_first_hours', '48', '1차 리마인더 (시간)', new Date().toISOString()],
    ['reminder_second_hours', '72', '2차 리마인더 (시간)', new Date().toISOString()],
    ['reminder_max_count', '2', '최대 리마인더 횟수', new Date().toISOString()],
    ['d_minus_1_reminder_time', '17:00', 'D-1 리마인더 발송 시간', new Date().toISOString()],
    ['min_interviewers', '2', '최소 면접관 수', new Date().toISOString()],
    ['max_interviewers', '5', '최대 면접관 수', new Date().toISOString()],
    ['require_team_lead', 'TRUE', '팀장급 필수 여부', new Date().toISOString()],
    ['min_notice_hours', '48', '최소 사전 통보 시간', new Date().toISOString()],
    ['data_retention_years', '1', '데이터 보관 연한', new Date().toISOString()],
    ['email_retry_count', '3', '메일 재시도 횟수', new Date().toISOString()],
    ['company_logo_url', '', '회사 로고 URL', new Date().toISOString()],
    ['company_address', '', '회사 주소', new Date().toISOString()],
    ['parking_info', '', '주차 안내', new Date().toISOString()],
    ['dress_code', '비즈니스 캐주얼', '복장 안내', new Date().toISOString()]
  ];
  
  if (sheet.getLastRow() === 1) {
    sheet.getRange(2, 1, defaultConfigs.length, 4).setValues(defaultConfigs);
  }
}

function getDataRows(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  return data.slice(1); // 헤더 제외
}

// ========== Interview Functions ==========

function getInterviews() {
  const sheet = getSheet('interviews');
  const rows = getDataRows(sheet);
  return rows.map(row => ({
    interview_id: row[0] || '',
    main_notice: row[1] || '',
    team_name: row[2] || '',
    proposed_date: row[3] || '',
    proposed_start_time: row[4] || '',
    proposed_end_time: row[5] || '',
    status: row[6] || 'PENDING',
    created_by: row[7] || '',
    created_at: row[8] || '',
    updated_at: row[9] || ''
  }));
}

function getInterview(interviewId) {
  const interviews = getInterviews();
  return interviews.find(i => i.interview_id === interviewId) || null;
}

function createInterview(data) {
  const sheet = getSheet('interviews');
  const now = new Date().toISOString();
  sheet.appendRow([
    data.interview_id,
    data.main_notice,
    data.team_name,
    data.proposed_date,
    data.proposed_start_time,
    data.proposed_end_time,
    data.status || 'PENDING',
    data.created_by,
    now,
    now
  ]);
  return { interview_id: data.interview_id };
}

function updateInterviewStatus(interviewId, status) {
  const sheet = getSheet('interviews');
  const rows = getDataRows(sheet);
  const rowIndex = rows.findIndex(row => row[0] === interviewId);
  if (rowIndex === -1) throw new Error('Interview not found');
  
  const actualRow = rowIndex + 2;
  sheet.getRange(actualRow, 7).setValue(status); // status column
  sheet.getRange(actualRow, 10).setValue(new Date().toISOString()); // updated_at
  return { success: true };
}

// ========== Candidate Functions ==========

function getCandidates() {
  const sheet = getSheet('candidates');
  const rows = getDataRows(sheet);
  return rows.filter(row => row[0]).map(row => ({
    candidate_id: row[0] || '',
    name: row[1] || '',
    email: row[2] || '',
    phone: row[3] || '',
    position_applied: row[4] || '',
    created_at: row[5] || '',
    status: row[6] || '',
    resume_url: row[7] || '',
    notes: row[8] || ''
  }));
}

function getCandidateById(candidateId) {
  const candidates = getCandidates();
  return candidates.find(c => c.candidate_id === candidateId) || null;
}

function updateCandidate(candidateId, updates) {
  const sheet = getSheet('candidates');
  const rows = getDataRows(sheet);
  const rowIndex = rows.findIndex(row => row[0] === candidateId);
  if (rowIndex === -1) throw new Error('Candidate not found');
  const actualRow = rowIndex + 2;
  if (updates.name !== undefined) sheet.getRange(actualRow, 2).setValue(updates.name);
  if (updates.email !== undefined) sheet.getRange(actualRow, 3).setValue(updates.email);
  if (updates.phone !== undefined) sheet.getRange(actualRow, 4).setValue(updates.phone);
  if (updates.position_applied !== undefined) sheet.getRange(actualRow, 5).setValue(updates.position_applied);
  if (updates.status !== undefined) sheet.getRange(actualRow, 7).setValue(updates.status);
  if (updates.resume_url !== undefined) sheet.getRange(actualRow, 8).setValue(updates.resume_url);
  if (updates.notes !== undefined) sheet.getRange(actualRow, 9).setValue(updates.notes);
  return { success: true };
}

function getCandidatesByInterview(interviewId) {
  const mappingSheet = getSheet('interview_candidates');
  const mappingRows = getDataRows(mappingSheet);
  const candidateIds = mappingRows
    .filter(row => row[0] === interviewId)
    .map(row => row[1]);
  
  const candidates = getCandidates();
  return candidates.filter(c => candidateIds.includes(c.candidate_id));
}

function createCandidate(data) {
  const sheet = getSheet('candidates');
  const now = new Date().toISOString();
  sheet.appendRow([
    data.candidate_id,
    data.name,
    data.email || '',
    data.phone || '',
    data.position_applied,
    now,
    data.status || '',
    data.resume_url || '',
    data.notes || ''
  ]);
  return { candidate_id: data.candidate_id };
}

// ========== Interview-Candidate Mapping ==========

function createInterviewCandidate(data) {
  const sheet = getSheet('interview_candidates');
  const now = new Date().toISOString();
  sheet.appendRow([
    data.interview_id,
    data.candidate_id,
    data.sequence,
    data.scheduled_start_time,
    data.scheduled_end_time,
    now
  ]);
  return { success: true };
}

function getInterviewCandidates(interviewId) {
  const sheet = getSheet('interview_candidates');
  const rows = getDataRows(sheet);
  return rows
    .filter(row => row[0] === interviewId)
    .map(row => ({
      interview_id: row[0] || '',
      candidate_id: row[1] || '',
      sequence: row[2] || 0,
      scheduled_start_time: row[3] || '',
      scheduled_end_time: row[4] || '',
      created_at: row[5] || ''
    }));
}

// ========== Candidate-Interviewer Mapping (N:N) ==========

function createCandidateInterviewer(data) {
  const sheet = getSheet('candidate_interviewers');
  const now = new Date().toISOString();
  sheet.appendRow([
    data.interview_id,
    data.candidate_id,
    data.interviewer_id,
    data.role || 'SECONDARY',
    now
  ]);
  return { success: true };
}

function getCandidateInterviewers(interviewId, candidateId) {
  const sheet = getSheet('candidate_interviewers');
  const rows = getDataRows(sheet);
  return rows
    .filter(row => row[0] === interviewId && row[1] === candidateId)
    .map(row => ({
      interview_id: row[0] || '',
      candidate_id: row[1] || '',
      interviewer_id: row[2] || '',
      role: row[3] || 'SECONDARY',
      created_at: row[4] || ''
    }));
}

// ========== Interviewer Functions ==========

function getInterviewers() {
  const sheet = getSheet('interviewers');
  const rows = getDataRows(sheet);
  return rows.filter(row => row[0]).map(row => ({
    interviewer_id: row[0] || '',
    name: row[1] || '',
    email: row[2] || '',
    department: row[3] || '',
    position: row[4] || '',
    is_team_lead: row[5] === 'TRUE' || row[5] === true,
    phone: row[6] || '',
    is_active: row[7] === 'TRUE' || row[7] === true,
    created_at: row[8] || ''
  }));
}

function getInterviewer(interviewerId) {
  const interviewers = getInterviewers();
  return interviewers.find(i => i.interviewer_id === interviewerId) || null;
}

function createOrUpdateInterviewers(data) {
  const sheet = getSheet('interviewers');
  const existingRows = getDataRows(sheet);
  const existingEmails = new Set(existingRows.map(row => (row[2] || '').toLowerCase()).filter(Boolean));
  
  let created = 0;
  let updated = 0;
  const now = new Date().toISOString();
  
  data.forEach(interviewer => {
    const emailLower = (interviewer.email || '').toLowerCase();
    if (existingEmails.has(emailLower)) {
      // Update
      const rowIndex = existingRows.findIndex(row => (row[2] || '').toLowerCase() === emailLower);
      if (rowIndex !== -1) {
        const actualRow = rowIndex + 2;
        sheet.getRange(actualRow, 1, 1, 8).setValues([[
          interviewer.interviewer_id,
          interviewer.name,
          interviewer.email,
          interviewer.department,
          interviewer.position,
          interviewer.is_team_lead ? 'TRUE' : 'FALSE',
          interviewer.phone,
          interviewer.is_active !== false ? 'TRUE' : 'FALSE'
        ]]);
        updated++;
      }
    } else {
      // Create
      sheet.appendRow([
        interviewer.interviewer_id,
        interviewer.name,
        interviewer.email,
        interviewer.department,
        interviewer.position,
        interviewer.is_team_lead ? 'TRUE' : 'FALSE',
        interviewer.phone,
        interviewer.is_active !== false ? 'TRUE' : 'FALSE',
        now
      ]);
      created++;
    }
  });
  
  return { created, updated };
}

// ========== Interview-Interviewer Mapping ==========

function getInterviewInterviewers(interviewId) {
  const sheet = getSheet('interview_interviewers');
  const rows = getDataRows(sheet);
  return rows
    .filter(row => row[0] === interviewId)
    .map(row => ({
      interview_id: row[0] || '',
      interviewer_id: row[1] || '',
      responded_at: row[2] || null,
      reminder_sent_count: parseInt(row[3] || '0'),
      last_reminder_sent_at: row[4] || null
    }));
}

function createInterviewInterviewers(data) {
  const sheet = getSheet('interview_interviewers');
  data.forEach(mapping => {
    sheet.appendRow([
      mapping.interview_id,
      mapping.interviewer_id,
      '', // responded_at
      0,  // reminder_sent_count
      ''  // last_reminder_sent_at
    ]);
  });
  return { success: true, count: data.length };
}

function updateRespondedAt(interviewId, interviewerId) {
  const sheet = getSheet('interview_interviewers');
  const rows = getDataRows(sheet);
  const rowIndex = rows.findIndex(row => row[0] === interviewId && row[1] === interviewerId);
  if (rowIndex === -1) throw new Error('Mapping not found');
  
  const actualRow = rowIndex + 2;
  sheet.getRange(actualRow, 3).setValue(new Date().toISOString());
  return { success: true };
}

function updateReminderSent(interviewId, interviewerId) {
  const sheet = getSheet('interview_interviewers');
  const rows = getDataRows(sheet);
  const rowIndex = rows.findIndex(row => row[0] === interviewId && row[1] === interviewerId);
  if (rowIndex === -1) throw new Error('Mapping not found');
  
  const actualRow = rowIndex + 2;
  const currentCount = parseInt(rows[rowIndex][3] || '0');
  sheet.getRange(actualRow, 3).setValue(new Date().toISOString()); // responded_at은 그대로
  sheet.getRange(actualRow, 4).setValue(currentCount + 1); // reminder_sent_count++
  sheet.getRange(actualRow, 5).setValue(new Date().toISOString()); // last_reminder_sent_at
  return { success: true };
}

// ========== Time Selection Functions ==========

function getTimeSelections(interviewId) {
  const sheet = getSheet('time_selections');
  const rows = getDataRows(sheet);
  return rows
    .filter(row => row[1] === interviewId)
    .map(row => ({
      selection_id: row[0] || '',
      interview_id: row[1] || '',
      interviewer_id: row[2] || '',
      slot_date: row[3] || '',
      start_time: row[4] || '',
      end_time: row[5] || '',
      created_at: row[6] || ''
    }));
}

function createTimeSelections(data) {
  const sheet = getSheet('time_selections');
  const now = new Date().toISOString();
  data.forEach(selection => {
    sheet.appendRow([
      selection.selection_id,
      selection.interview_id,
      selection.interviewer_id,
      selection.slot_date,
      selection.start_time,
      selection.end_time,
      now
    ]);
  });
  return { success: true, count: data.length };
}

// ========== Confirmed Schedule Functions ==========

function getConfirmedSchedule(interviewId) {
  const sheet = getSheet('confirmed_schedules');
  const rows = getDataRows(sheet);
  const schedules = rows.filter(r => r[0] === interviewId);
  if (schedules.length === 0) return null;
  
  // 첫 번째 확정 일정 반환 (면접 전체 일정)
  const first = schedules[0];
  return {
    interview_id: first[0] || '',
    candidate_id: first[1] || '',
    confirmed_date: first[2] || '',
    confirmed_start_time: first[3] || '',
    confirmed_end_time: first[4] || '',
    confirmed_at: first[5] || ''
  };
}

function getConfirmedSchedulesByCandidate(interviewId, candidateId) {
  const sheet = getSheet('confirmed_schedules');
  const rows = getDataRows(sheet);
  const schedule = rows.find(r => r[0] === interviewId && r[1] === candidateId);
  if (!schedule) return null;
  
  return {
    interview_id: schedule[0] || '',
    candidate_id: schedule[1] || '',
    confirmed_date: schedule[2] || '',
    confirmed_start_time: schedule[3] || '',
    confirmed_end_time: schedule[4] || '',
    confirmed_at: schedule[5] || ''
  };
}

function createConfirmedSchedule(data) {
  const sheet = getSheet('confirmed_schedules');
  sheet.appendRow([
    data.interview_id,
    data.candidate_id || '',
    data.confirmed_date,
    data.confirmed_start_time,
    data.confirmed_end_time,
    new Date().toISOString()
  ]);
  return { success: true };
}

// ========== Config Functions ==========

function getConfig() {
  const sheet = getSheet('config');
  const rows = getDataRows(sheet);
  const config = {};
  
  rows.forEach(row => {
    if (row[0]) {
      config[row[0]] = row[1] || ''; // config_key: config_value
    }
  });
  
  return config;
}

function updateConfig(data) {
  const sheet = getSheet('config');
  const rows = getDataRows(sheet);
  const now = new Date().toISOString();
  
  let updated = 0;
  let created = 0;
  
  Object.keys(data).forEach(key => {
    const rowIndex = rows.findIndex(row => row[0] === key);
    
    if (rowIndex !== -1) {
      // Update existing
      const actualRow = rowIndex + 2;
      sheet.getRange(actualRow, 2).setValue(data[key]); // config_value
      sheet.getRange(actualRow, 4).setValue(now); // updated_at
      updated++;
    } else {
      // Create new
      sheet.appendRow([key, data[key], '', now]);
      created++;
    }
  });
  
  return { success: true, updated, created };
}
