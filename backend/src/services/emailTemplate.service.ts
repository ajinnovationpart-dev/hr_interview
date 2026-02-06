import { logger } from '../utils/logger';

export interface EmailTemplateConfig {
  company_logo_url?: string;
  company_address?: string;
  parking_info?: string;
  dress_code?: string;
  email_greeting?: string; // 인사말 (예: "안녕하세요")
  email_company_name?: string; // 회사명 (예: "AJ Networks")
  email_department_name?: string; // 부서명 (예: "인사팀")
  email_contact_email?: string; // 문의 이메일
  email_footer_text?: string; // 푸터 문구
}

export class EmailTemplateService {
  private config: EmailTemplateConfig;

  constructor(config: EmailTemplateConfig = {}) {
    this.config = config;
  }

  /**
   * 면접관 초대 메일 템플릿 (스팸 필터 회피 최적화)
   */
  generateInterviewerInvitation(data: {
    interviewerName: string;
    mainNotice: string;
    teamName: string;
    candidates: Array<{ name: string; positionApplied: string; time: string }>;
    proposedDate: string;
    confirmLink: string;
  }): string {
    const logoUrl = this.config.company_logo_url || '';
    const companyAddress = this.config.company_address || '';
    const parkingInfo = this.config.parking_info || '';
    const dressCode = this.config.dress_code || '비즈니스 캐주얼';
    const greeting = this.config.email_greeting || '안녕하세요';
    const companyName = this.config.email_company_name || 'AJ Networks';
    const departmentName = this.config.email_department_name || '인사팀';
    const contactEmail = this.config.email_contact_email || 'hr@ajnetworks.co.kr';
    const footerText = this.config.email_footer_text || `본 메일은 ${companyName} ${departmentName}에서 발송한 공식 메일입니다.`;

    return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>면접 일정 조율 요청</title>
  <style>
    body { 
      font-family: 'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', sans-serif; 
      line-height: 1.6; 
      color: #333333; 
      margin: 0; 
      padding: 0; 
      background-color: #f4f4f4;
    }
    .email-wrapper { 
      max-width: 600px; 
      margin: 0 auto; 
      background-color: #ffffff;
    }
    .header { 
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); 
      color: #ffffff; 
      padding: 40px 24px; 
      text-align: center; 
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header h2 {
      margin: 0;
      font-size: 26px;
      font-weight: 700;
      letter-spacing: -0.5px;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .content { 
      padding: 32px 24px; 
      background-color: #ffffff;
    }
    .info-box { 
      background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%); 
      padding: 20px; 
      margin: 20px 0; 
      border-left: 4px solid #2563eb;
      border-radius: 6px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    .info-box h3 {
      margin-top: 0;
      margin-bottom: 12px;
      font-size: 16px;
      font-weight: 600;
      color: #1f2937;
    }
    .candidates-table { 
      width: 100%; 
      border-collapse: collapse; 
      margin: 20px 0;
      font-size: 14px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      border-radius: 6px;
      overflow: hidden;
    }
    .candidates-table th, .candidates-table td { 
      border: 1px solid #e5e7eb; 
      padding: 12px; 
      text-align: left; 
    }
    .candidates-table th { 
      background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
      font-weight: 600;
      color: #374151;
    }
    .candidates-table tr:nth-child(even) {
      background-color: #f9fafb;
    }
    .candidates-table tr:hover {
      background-color: #f3f4f6;
    }
    .button-container {
      text-align: center;
      margin: 32px 0;
      padding: 20px 0;
    }
    .button-wrapper {
      display: inline-block;
      margin: 0 auto;
    }
    .button { 
      display: inline-block; 
      background-color: #2563eb; 
      color: #ffffff !important; 
      padding: 16px 32px; 
      text-decoration: none !important; 
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      line-height: 1.5;
      border: none;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      transition: background-color 0.3s ease;
    }
    .button:hover {
      background-color: #1d4ed8;
    }
    /* 이메일 클라이언트 호환성을 위한 추가 스타일 */
    @media only screen and (max-width: 600px) {
      .button {
        padding: 14px 24px;
        font-size: 15px;
      }
    }
    .footer { 
      color: #6b7280; 
      font-size: 12px; 
      margin-top: 32px; 
      padding: 24px 20px; 
      border-top: 2px solid #e5e7eb;
      text-align: center;
      background-color: #f9fafb;
    }
    .footer p {
      margin: 4px 0;
    }
    .text-link {
      color: #2563eb;
      word-break: break-all;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    ${logoUrl ? `<div style="text-align: center; margin: 30px 0 20px 0; padding: 20px 0;"><img src="${logoUrl}" alt="${companyName}" style="max-width: 200px; height: auto; display: block; margin: 0 auto;"></div>` : `<div style="text-align: center; margin: 30px 0 20px 0; padding: 20px 0;"><h1 style="margin: 0; color: #2563eb; font-size: 28px; font-weight: 700;">${companyName}</h1></div>`}
    
    <div class="header">
      <h2>면접 일정 조율 요청</h2>
    </div>
    
    <div class="content">
      <p>${data.interviewerName}님, ${greeting}.</p>
      <p>아래 면접에 면접관으로 참여 요청을 드립니다.</p>
      
      <div class="info-box">
        <h3>면접 정보</h3>
        <p><strong>공고명:</strong> ${data.mainNotice}</p>
        <p><strong>팀명:</strong> ${data.teamName}</p>
        <p><strong>제안 일시:</strong> ${data.proposedDate}</p>
      </div>

      <div class="info-box">
        <h3>면접자 정보</h3>
        <table class="candidates-table">
          <thead>
            <tr>
              <th>이름</th>
              <th>지원 직무</th>
              <th>면접 시간</th>
            </tr>
          </thead>
          <tbody>
            ${data.candidates.map(c => `
              <tr>
                <td>${c.name}</td>
                <td>${c.positionApplied}</td>
                <td>${c.time}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      ${companyAddress || parkingInfo || dressCode ? `
      <div class="info-box">
        <h3>면접 장소 안내</h3>
        ${companyAddress ? `<p><strong>주소:</strong> ${companyAddress}</p>` : ''}
        ${parkingInfo ? `<p><strong>주차 안내:</strong> ${parkingInfo}</p>` : ''}
        <p><strong>복장:</strong> ${dressCode}</p>
      </div>
      ` : ''}

      <p>가능하신 일정을 선택해 주시기 바랍니다. 제안된 날짜 외에도 다른 날짜와 시간을 선택하실 수 있습니다.</p>

      <!-- 아웃룩 PC 등 호환: 버튼을 이미지로 표시 (cid:scheduleBtn = 첨부 이미지) -->
      <div style="text-align: center; margin: 40px 0; padding: 30px 0;">
        <a href="${data.confirmLink}" target="_blank" style="display: inline-block; text-decoration: none;">
          <img src="cid:scheduleBtn" alt="일정 선택하기" width="220" height="56" style="display: block; border: 0; margin: 0 auto;" />
        </a>
        <p style="color: #6b7280; font-size: 12px; margin-top: 8px;">↑ 위 버튼을 클릭하여 일정을 선택해 주세요.</p>
      </div>

      <p style="color: #6b7280; font-size: 13px; margin-top: 24px; text-align: center; line-height: 1.6;">
        48시간 이내에 응답해 주시면 감사하겠습니다.<br>
        위 링크는 7일간 유효합니다.
      </p>
    </div>

    <div class="footer">
      <p>${footerText}</p>
      <p>문의사항: ${contactEmail}</p>
      <p style="margin-top: 8px;">${companyName} ${departmentName}</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * D-1 리마인더 템플릿 (스팸 필터 회피 최적화)
   */
  generateDMinus1Reminder(data: {
    recipientName: string;
    mainNotice: string;
    interviewDate: string;
    interviewTime: string;
    candidates: string[];
  }): string {
    const greeting = this.config.email_greeting || '안녕하세요';
    const companyName = this.config.email_company_name || 'AJ Networks';
    const departmentName = this.config.email_department_name || '인사팀';
    const contactEmail = this.config.email_contact_email || 'hr@ajnetworks.co.kr';
    const footerText = this.config.email_footer_text || `본 메일은 ${companyName} ${departmentName}에서 발송한 공식 메일입니다.`;
    
    return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>면접 일정 안내</title>
  <style>
    body { 
      font-family: 'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', sans-serif; 
      line-height: 1.6; 
      color: #333333;
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
    }
    .email-wrapper { 
      max-width: 600px; 
      margin: 0 auto; 
      background-color: #ffffff;
    }
    .header { 
      background-color: #f59e0b; 
      color: #ffffff; 
      padding: 24px 20px; 
      text-align: center; 
    }
    .header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
    }
    .content { 
      padding: 24px 20px; 
      background-color: #ffffff;
    }
    .info-box {
      padding: 16px;
      background-color: #fffbeb;
      margin: 16px 0;
      border-left: 3px solid #f59e0b;
      border-radius: 4px;
    }
    .footer {
      color: #6b7280;
      font-size: 12px;
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="header">
      <h2>면접 일정 안내</h2>
    </div>
    
    <div class="content">
      <p>${data.recipientName}님, ${greeting}.</p>
      <p>내일 진행될 면접 일정을 안내드립니다.</p>
      
      <div class="info-box">
        <p><strong>공고명:</strong> ${data.mainNotice}</p>
        <p><strong>일시:</strong> ${data.interviewDate} ${data.interviewTime}</p>
        <p><strong>면접자:</strong> ${data.candidates.join(', ')}</p>
      </div>
      
      <p>면접 준비 부탁드립니다.</p>
      <p>감사합니다.</p>
    </div>

    <div class="footer">
      <p>${footerText}</p>
      <p>문의사항: ${contactEmail}</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * 미응답 리마인더 템플릿 (스팸 필터 회피 최적화)
   */
  generateReminderEmail(data: {
    interviewerName: string;
    mainNotice: string;
    teamName: string;
    confirmLink: string;
    reminderCount: number;
  }): string {
    const urgencyLevel = data.reminderCount >= 2 ? 'HIGH' : 'MEDIUM';
    const bgColor = urgencyLevel === 'HIGH' ? '#dc2626' : '#f59e0b';
    const reminderText = data.reminderCount === 1 ? '1차' : data.reminderCount === 2 ? '2차' : '최종';
    const greeting = this.config.email_greeting || '안녕하세요';
    const companyName = this.config.email_company_name || 'AJ Networks';
    const departmentName = this.config.email_department_name || '인사팀';
    const contactEmail = this.config.email_contact_email || 'hr@ajnetworks.co.kr';
    const footerText = this.config.email_footer_text || `본 메일은 ${companyName} ${departmentName}에서 발송한 공식 메일입니다.`;

    return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>면접 일정 조율 리마인더</title>
  <style>
    body { 
      font-family: 'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', sans-serif; 
      line-height: 1.6;
      color: #333333;
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
    }
    .email-wrapper { 
      max-width: 600px; 
      margin: 0 auto; 
      background-color: #ffffff;
    }
    .header { 
      background-color: ${bgColor}; 
      color: #ffffff; 
      padding: 24px 20px; 
      text-align: center; 
    }
    .header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
    }
    .content { 
      padding: 24px 20px; 
      background-color: #ffffff;
    }
    .info-box {
      padding: 16px;
      background-color: #f8f9fa;
      margin: 16px 0;
      border-left: 3px solid ${bgColor};
      border-radius: 4px;
    }
    .button-container {
      text-align: center;
      margin: 32px 0;
      padding: 20px 0;
    }
    .button-wrapper {
      display: inline-block;
      margin: 0 auto;
    }
    .button { 
      display: inline-block; 
      background-color: #2563eb; 
      color: #ffffff !important; 
      padding: 16px 32px; 
      text-decoration: none !important; 
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      line-height: 1.5;
      border: none;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      transition: background-color 0.3s ease;
    }
    .button:hover {
      background-color: #1d4ed8;
    }
    /* 이메일 클라이언트 호환성을 위한 추가 스타일 */
    @media only screen and (max-width: 600px) {
      .button {
        padding: 14px 24px;
        font-size: 15px;
      }
    }
    .text-link {
      color: #2563eb;
      word-break: break-all;
      font-size: 12px;
    }
    .footer {
      color: #6b7280;
      font-size: 12px;
      margin-top: 32px;
      padding: 24px 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      background-color: #f9fafb;
    }
    .footer p {
      margin: 4px 0;
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="header">
      <h2>면접 일정 조율 리마인더 (${reminderText})</h2>
    </div>
    
    <div class="content">
      <p>${data.interviewerName}님, ${greeting}.</p>
      <p>아직 응답하지 않으신 면접 일정 조율 건이 있습니다.</p>
      
      <div class="info-box">
        <p><strong>공고명:</strong> ${data.mainNotice}</p>
        <p><strong>팀명:</strong> ${data.teamName}</p>
      </div>
      
      ${urgencyLevel === 'HIGH' ? '<p style="color: #dc2626; font-weight: 600;">최종 요청입니다. 빠른 시일 내에 응답 부탁드립니다.</p>' : '<p>가능하신 일정을 선택해 주시기 바랍니다.</p>'}
      
      <!-- 아웃룩 PC 등 호환: 버튼을 이미지로 표시 (cid:scheduleBtn = 첨부 이미지) -->
      <div style="text-align: center; margin: 40px 0; padding: 30px 0;">
        <a href="${data.confirmLink}" target="_blank" style="display: inline-block; text-decoration: none;">
          <img src="cid:scheduleBtn" alt="일정 선택하기" width="220" height="56" style="display: block; border: 0; margin: 0 auto;" />
        </a>
        <p style="color: #6b7280; font-size: 12px; margin-top: 8px;">↑ 위 버튼을 클릭하여 일정을 선택해 주세요.</p>
      </div>
    </div>

    <div class="footer">
      <p>${footerText}</p>
      <p>문의사항: ${contactEmail}</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * 확정 알림 템플릿 (스팸 필터 회피 최적화)
   */
  generateConfirmationEmail(data: {
    recipientName: string;
    recipientType: 'HR' | 'INTERVIEWER' | 'CANDIDATE';
    mainNotice: string;
    teamName: string;
    candidates: Array<{ name: string; time: string }>;
    confirmedDate: string;
  }): string {
    const greeting = this.config.email_greeting || '안녕하세요';
    const companyName = this.config.email_company_name || 'AJ Networks';
    const departmentName = this.config.email_department_name || '인사팀';
    const contactEmail = this.config.email_contact_email || 'hr@ajnetworks.co.kr';
    const footerText = this.config.email_footer_text || `본 메일은 ${companyName} ${departmentName}에서 발송한 공식 메일입니다.`;
    
    return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>면접 일정 확정 안내</title>
  <style>
    body { 
      font-family: 'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', sans-serif; 
      line-height: 1.6;
      color: #333333;
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
    }
    .email-wrapper { 
      max-width: 600px; 
      margin: 0 auto; 
      background-color: #ffffff;
    }
    .header { 
      background-color: #16a34a; 
      color: #ffffff; 
      padding: 24px 20px; 
      text-align: center; 
    }
    .header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
    }
    .content { 
      padding: 24px 20px; 
      background-color: #ffffff;
    }
    .info-box {
      padding: 16px;
      background-color: #f0fdf4;
      margin: 16px 0;
      border-left: 3px solid #16a34a;
      border-radius: 4px;
    }
    .candidate-item {
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .candidate-item:last-child {
      border-bottom: none;
    }
    .footer {
      color: #6b7280;
      font-size: 12px;
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="header">
      <h2>면접 일정 확정 안내</h2>
    </div>
    
    <div class="content">
      <p>${data.recipientName}님, ${greeting}.</p>
      <p>면접 일정이 확정되었습니다.</p>
      
      <div class="info-box">
        <p><strong>공고명:</strong> ${data.mainNotice}</p>
        <p><strong>팀명:</strong> ${data.teamName}</p>
        <p><strong>확정 날짜:</strong> ${data.confirmedDate}</p>
        <div style="margin-top: 16px;">
          <p style="margin-bottom: 8px; font-weight: 600;">면접자 및 시간:</p>
          ${data.candidates.map(c => `
            <div class="candidate-item">
              <p style="margin: 0;"><strong>${c.name}</strong>: ${c.time}</p>
            </div>
          `).join('')}
        </div>
      </div>
      
      <p>확정된 일정에 맞춰 준비 부탁드립니다.</p>
      <p>일정 변경이 필요한 경우 ${departmentName}으로 연락 주시기 바랍니다.</p>
    </div>

    <div class="footer">
      <p>${footerText}</p>
      <p>문의사항: ${contactEmail}</p>
      <p style="margin-top: 8px;">${companyName} ${departmentName}</p>
    </div>
  </div>
</body>
</html>
    `;
  }
}
