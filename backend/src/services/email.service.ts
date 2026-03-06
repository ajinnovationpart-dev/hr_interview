import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';
import { dataService } from './dataService';
import { getScheduleButtonImageBuffer } from '../utils/emailButtonImage';
import { buildFrontendUrl, buildInterviewerLoginLink } from '../utils/frontendUrl';

// 환경 변수 로드
dotenv.config();

export interface EmailOptions {
  to: string[];
  subject: string;
  htmlBody: string;
  cc?: string[];
  /** 메일 본문에 cid:scheduleBtn 이 있으면 일정 선택 버튼 이미지를 첨부함 (아웃룩 PC 호환) */
  useScheduleButtonImage?: boolean;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private fromEmail: string;

  constructor() {
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    const smtpUser = process.env.SMTP_USER || '';
    // 여러 환경 변수 이름 지원
    const smtpPassword = process.env.SMTP_PASSWORD || process.env.SMTP_PASS || '';
    // 여러 환경 변수 이름 지원 (EMAIL_FROM, SMTP_FROM)
    this.fromEmail = process.env.EMAIL_FROM || process.env.SMTP_FROM || smtpUser;

    if (!smtpUser || !smtpPassword) {
      logger.error('❌ SMTP credentials not configured. Email service will not work.');
      logger.error(`SMTP_USER: ${smtpUser ? 'SET' : 'NOT SET'}, SMTP_PASSWORD: ${smtpPassword ? 'SET' : 'NOT SET'}`);
      // transporter를 null로 설정하여 나중에 체크 가능하게 함
      this.transporter = null as any;
      return;
    }

    // SMTP_SECURE 환경 변수 지원
    const smtpSecureEnv = process.env.SMTP_SECURE;
    const smtpSecure = smtpSecureEnv === 'true' ? true : smtpSecureEnv === 'false' ? false : smtpPort === 465;
    
    logger.info(`SMTP configuration - Host: ${smtpHost}, Port: ${smtpPort}, Secure: ${smtpSecure}, User: ${smtpUser}, From: ${this.fromEmail}`);
    
    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure, // 환경 변수 또는 포트 기반
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
      // Gmail TLS 설정 (포트 587 사용 시)
      ...(smtpPort === 587 && !smtpSecure ? {
        requireTLS: true,
        tls: {
          rejectUnauthorized: false,
        },
      } : {
        tls: {
          rejectUnauthorized: false,
        },
      }),
      connectionTimeout: 30000, // 30초로 증가
      greetingTimeout: 30000,
      socketTimeout: 30000,
      debug: process.env.NODE_ENV === 'development', // 개발 환경에서 디버그 로그
    });

    // Verify connection
    this.transporter.verify().then(() => {
      logger.info('SMTP server connection verified');
    }).catch((error) => {
      logger.error('SMTP server connection failed:', error);
    });
  }

  /** SMTP 설정 여부 (관리자/점검용) */
  isConfigured(): boolean {
    return !!this.transporter;
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    // 설정에서 발신자 정보 가져오기 (없으면 환경 변수 또는 기본값 사용)
    let fromEmail = this.fromEmail;
    
    try {
      // SMTP 연결 확인
      if (!this.transporter) {
        throw new Error('SMTP transporter is not initialized. Check SMTP credentials.');
      }
      // 여러 환경 변수 이름 지원 (EMAIL_FROM_NAME, SMTP_FROM_NAME)
      let fromName = process.env.EMAIL_FROM_NAME || process.env.SMTP_FROM_NAME || 'AJ Networks 인사팀';
      // Reply-To는 기본적으로 From과 동일하게 설정 (도메인 불일치 방지)
      let replyTo = process.env.SMTP_REPLY_TO || this.fromEmail;

      try {
        const config = await dataService.getConfig();
        const smtpUser = process.env.SMTP_USER || '';
        const smtpUserDomain = smtpUser.split('@')[1] || '';
        if (config.smtp_from_email) {
          fromEmail = config.smtp_from_email;
          const configFromDomain = fromEmail.split('@')[1] || '';
          // Gmail 등: 설정 발신자가 SMTP 계정과 도메인이 다르면 수신 서버가 SPF로 거부할 수 있음 → 초기처럼 SMTP_USER로 발송
          if (smtpUserDomain && configFromDomain && smtpUserDomain !== configFromDomain) {
            logger.warn(`⚠️ [FROM OVERRIDE] Config 발신자(${fromEmail})와 SMTP 계정(${smtpUser}) 도메인이 달라 수신 실패 가능성이 있어, From을 SMTP_USER로 복구합니다.`);
            fromEmail = smtpUser;
          }
        }
        if (config.smtp_from_name) {
          fromName = config.smtp_from_name;
        }
        // Reply-To는 From과 동일한 도메인을 사용하도록 강제 (스팸 필터 회피)
        // config.smtp_reply_to가 있더라도 From과 동일한 도메인인 경우에만 사용
        if (config.smtp_reply_to) {
          const replyToDomain = config.smtp_reply_to.split('@')[1] || '';
          const replyToFromDomain = fromEmail.split('@')[1] || '';
          
          if (replyToDomain === replyToFromDomain) {
            replyTo = config.smtp_reply_to;
            logger.info(`   - Reply-To from config: ${replyTo} (same domain as From)`);
          } else {
            logger.warn(`   ⚠️ Reply-To domain mismatch ignored. Config has ${config.smtp_reply_to} but From is ${fromEmail}`);
            logger.warn(`   - Using Reply-To: ${fromEmail} (same as From to avoid spam filter issues)`);
            replyTo = fromEmail; // From과 동일하게 설정
          }
        } else {
          // config에 Reply-To가 없으면 From과 동일하게 설정
          replyTo = fromEmail;
        }
      } catch (error) {
        // config 조회 실패 시 환경 변수 사용
        logger.debug('Failed to get email config from dataService, using environment variables');
        // 환경 변수도 없으면 From과 동일하게 설정
        if (!process.env.SMTP_REPLY_TO) {
          replyTo = fromEmail;
        }
      }
      
      // 최종 검증: Reply-To가 From과 다른 도메인이면 경고 및 강제 수정
      const finalReplyToDomain = replyTo.split('@')[1] || '';
      const finalFromDomain = fromEmail.split('@')[1] || '';
      if (finalReplyToDomain !== finalFromDomain) {
        logger.warn(`⚠️ [REPLY-TO DOMAIN MISMATCH] Reply-To domain (${finalReplyToDomain}) differs from From domain (${finalFromDomain})`);
        logger.warn(`   - This may cause spam filter issues. Setting Reply-To to ${fromEmail}`);
        replyTo = fromEmail; // From과 동일하게 강제 설정
      }

      // 수신자 없으면 조기 반환 (SMTP 호출 방지)
      if (!options.to || options.to.length === 0) {
        logger.warn('sendEmail: No recipients (to is empty). Skipping send.');
        return;
      }

      // 각 수신자별 상세 검증
      const validatedRecipients: string[] = [];
      options.to.forEach((email, index) => {
        const trimmed = email.trim();
        const normalized = trimmed.toLowerCase();
        logger.info(`   📧 Recipient ${index + 1}: "${email}" -> "${trimmed}" -> "${normalized}"`);
        logger.info(`      - Length: ${normalized.length}, Domain: ${normalized.split('@')[1] || 'N/A'}`);
        
        // 숨겨진 문자 확인
        const hasHiddenChars = /[\u200B-\u200D\uFEFF]/.test(email);
        if (hasHiddenChars) {
          logger.warn(`      ⚠️ Hidden characters detected in email: ${email}`);
        }
        
        validatedRecipients.push(normalized);
      });

      if (validatedRecipients.length === 0) {
        logger.warn('sendEmail: No valid recipients after validation. Skipping send.');
        return;
      }
      
      // SMTP 인증 계정과 발신자 주소 도메인 불일치 확인
      const smtpUser = process.env.SMTP_USER || '';
      const smtpUserDomain = smtpUser.split('@')[1] || '';
      const fromEmailDomain = fromEmail.split('@')[1] || '';
      
      if (smtpUserDomain && fromEmailDomain && smtpUserDomain !== fromEmailDomain) {
        logger.warn(`⚠️ [DOMAIN MISMATCH] SMTP_USER domain (${smtpUserDomain}) differs from From email domain (${fromEmailDomain})`);
        logger.warn(`   - SMTP_USER: ${smtpUser}`);
        logger.warn(`   - From Email: ${fromEmail}`);
        logger.warn(`   - This may cause SPF/DKIM validation failures and emails may be rejected by recipient servers`);
        logger.warn(`   - Solution: Use SMTP_USER domain for From email, or configure Gmail "Send mail as" feature`);
      }
      
      logger.info(`Sending email - From: ${fromEmail}, To: ${validatedRecipients.join(', ')}, Subject: ${options.subject}`);
      logger.info(`   - SMTP_USER: ${smtpUser}`);
      logger.info(`   - SMTP_USER domain: ${smtpUserDomain || 'N/A'}`);
      logger.info(`   - From email domain: ${fromEmailDomain || 'N/A'}`);

      const fromAddress = `${fromName} <${fromEmail}>`;
      
      // Message-ID 생성 (고유한 ID)
      const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2, 15)}@${fromEmail.split('@')[1] || 'ajnetworks.co.kr'}>`;

      // 수신자 주소 정규화 (중복 제거 및 정렬)
      const uniqueRecipients = [...new Set(validatedRecipients)];
      logger.info(`   📬 Final recipient list (${uniqueRecipients.length} unique): ${uniqueRecipients.join(', ')}`);
      
      let htmlBody = options.htmlBody;
      const attachments: nodemailer.SendMailOptions['attachments'] = [];
      if (options.useScheduleButtonImage || htmlBody.includes('cid:scheduleBtn')) {
        try {
          const buttonBuffer = await getScheduleButtonImageBuffer();
          attachments.push({
            filename: 'schedule-button.png',
            content: buttonBuffer,
            cid: 'scheduleBtn',
          });
        } catch (err) {
          logger.warn('Schedule button image attach failed, email will send with link button:', err);
          // 이미지 없이 보내면 cid 깨짐 방지: img 블록을 텍스트 링크 버튼으로 교체 (href는 기존 a 태그에서 추출)
          htmlBody = htmlBody.replace(
            /<a href="([^"]+)"[^>]*>\s*<img[^>]*src="cid:scheduleBtn"[^>]*\/?>\s*<\/a>/gi,
            (_match, href) =>
              `<a href="${href}" target="_blank" style="display:inline-block;padding:16px 32px;background:#2563eb;color:#ffffff !important;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">일정 선택하기</a>`
          );
        }
      }

      const mailOptions = {
        from: fromAddress,
        to: uniqueRecipients.join(', '),
        subject: options.subject,
        html: htmlBody,
        cc: options.cc?.join(', '),
        replyTo: replyTo,
        attachments: attachments.length > 0 ? attachments : undefined,
        // Outlook 스팸 필터 회피를 위한 추가 헤더
        headers: {
          'Message-ID': messageId,
          'X-Mailer': 'AJ Networks Interview System',
          'X-Priority': '3',
          'Importance': 'normal',
          'MIME-Version': '1.0',
          'Date': new Date().toUTCString(),
          // Precedence: bulk 제거 - 수신 서버에서 스팸/대량메일로 분류되어 미도달될 수 있음
          'X-Auto-Response-Suppress': 'All', // Outlook 자동 응답 억제
          'List-Unsubscribe': `<mailto:${replyTo}?subject=unsubscribe>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          'Return-Path': fromEmail,
          'X-Entity-Ref-ID': messageId,
        },
        // 텍스트 버전 추가 (HTML에서 추출)
        text: this.extractTextFromHtml(htmlBody),
        // Outlook 호환성을 위한 추가 설정
        envelope: {
          from: fromEmail,
          to: uniqueRecipients,
        },
      };

      logger.debug(`Mail options prepared - From: ${fromAddress}, To: ${mailOptions.to}`);

      // 각 수신자별로 상세 로깅
      logger.info(`📧 Email sending details:`);
      logger.info(`   - From: ${fromAddress} (${fromEmail})`);
      logger.info(`   - To: ${options.to.join(', ')}`);
      logger.info(`   - Subject: ${options.subject}`);
      logger.info(`   - Reply-To: ${replyTo}`);
      logger.info(`   - Message-ID: ${messageId}`);
      logger.info(`   - Unique recipients: ${uniqueRecipients.length} (${uniqueRecipients.join(', ')})`);
      logger.info(`   - Envelope.to: ${JSON.stringify(mailOptions.envelope.to)}`);

      // SMTP API 호출 전 로깅
      logger.info(`📤 [SMTP API CALL] Calling transporter.sendMail() at ${new Date().toISOString()}`);
      logger.info(`   - This is a SEPARATE SMTP API call for ${uniqueRecipients.length} recipient(s)`);
      
      const info = await this.transporter.sendMail(mailOptions);
      
      // SMTP API 호출 후 로깅
      logger.info(`📥 [SMTP API RESPONSE] Received response at ${new Date().toISOString()}`);
      
      // SMTP 응답 상세 분석
      logger.info(`📬 SMTP Server Response:`);
      logger.info(`   - Message ID: ${info.messageId || 'N/A'}`);
      logger.info(`   - Response: ${info.response || 'N/A'}`);
      logger.info(`   - Accepted: ${info.accepted?.join(', ') || 'N/A'}`);
      logger.info(`   - Rejected: ${info.rejected?.join(', ') || 'N/A'}`);
      logger.info(`   - Pending: ${info.pending?.join(', ') || 'N/A'}`);
      logger.info(`   - Response Code: ${info.responseCode || 'N/A'}`);
      logger.info(`   - Envelope: ${JSON.stringify(info.envelope || {})}`);
      
      // 수신자별 결과 확인
      // info.accepted와 info.rejected는 SMTP 서버가 반환한 값이므로 정규화 필요
      const normalizedAccepted = info.accepted?.map((email: string) => email.trim().toLowerCase()) || [];
      const normalizedRejected = info.rejected?.map((email: string) => email.trim().toLowerCase()) || [];
      
      // 거부된 이메일 확인 (정규화된 주소 기준)
      const rejectedRecipients = uniqueRecipients.filter(recipient => 
        normalizedRejected.includes(recipient.toLowerCase())
      );
      
      if (rejectedRecipients.length > 0) {
        logger.error(`❌ Email rejected for: ${rejectedRecipients.join(', ')}`);
        throw new Error(`이메일이 거부되었습니다: ${rejectedRecipients.join(', ')}`);
      }
      
      // 수락된 이메일 확인 (정규화된 주소 기준)
      const acceptedRecipients = uniqueRecipients.filter(recipient => 
        normalizedAccepted.includes(recipient.toLowerCase())
      );
      
      if (normalizedAccepted.length === 0 && uniqueRecipients.length > 0) {
        logger.warn(`⚠️ No recipients explicitly accepted by SMTP server, but response code indicates success`);
        // Gmail의 경우 accepted 배열이 비어있어도 250 응답이면 성공으로 간주
      } else if (acceptedRecipients.length === 0 && uniqueRecipients.length > 0) {
        logger.error(`❌ No recipients accepted (expected: ${uniqueRecipients.join(', ')}, got: ${normalizedAccepted.join(', ') || 'N/A'})`);
        throw new Error('수신자가 없습니다.');
      }
      
      // Gmail의 경우 응답 코드 확인
      if (info.response && info.response.includes('250')) {
        logger.info('✅ Email accepted by SMTP server (250 OK)');
        logger.info(`   ⚠️ 참고: SMTP 서버에서 수락되었지만, 실제 전달은 수신자 메일 서버 정책에 따라 달라질 수 있습니다.`);
        logger.info(`   ⚠️ 스팸 폴더나 회사 메일 서버 정책을 확인하세요.`);
      } else if (info.response && info.response.includes('250')) {
        logger.warn(`⚠️ SMTP response: ${info.response}`);
      } else {
        logger.warn(`⚠️ Unexpected SMTP response: ${info.response}`);
      }
      
      // 각 수신자별 상세 로깅 (정규화된 주소 기준)
      const recipientStatuses: Array<{ email: string; accepted: boolean; rejected: boolean; status: string }> = [];
      
      uniqueRecipients.forEach((normalizedEmail) => {
        // 정규화된 accepted/rejected 리스트와 비교
        const wasAccepted = normalizedAccepted.includes(normalizedEmail.toLowerCase());
        const wasRejected = normalizedRejected.includes(normalizedEmail.toLowerCase());
        
        // 원본 이메일 주소 찾기 (로깅용)
        const originalEmail = options.to.find(to => 
          to.trim().toLowerCase() === normalizedEmail
        ) || normalizedEmail;
        
        let status = '⚠️ Unknown status';
        if (wasAccepted) {
          status = '✅ Accepted by SMTP';
        } else if (wasRejected) {
          status = '❌ Rejected by SMTP';
        } else if (info.response && info.response.includes('250')) {
          status = '⚠️ Status unclear but 250 OK (may be silently rejected by recipient server)';
        } else {
          status = '⚠️ Status unclear';
        }
        
        recipientStatuses.push({
          email: originalEmail,
          accepted: wasAccepted,
          rejected: wasRejected,
          status,
        });
        
        logger.info(`   📧 ${originalEmail} (normalized: ${normalizedEmail}): ${status}`);
        
        if (!wasAccepted && !wasRejected) {
          // Gmail의 경우 accepted 배열이 비어있을 수 있지만, 250 응답이면 성공으로 간주
          if (info.response && info.response.includes('250')) {
            logger.warn(`      ⚠️ WARNING: Email status is unclear. SMTP returned 250 OK, but recipient is not in accepted list.`);
            logger.warn(`      ⚠️ This email may be silently rejected by the recipient mail server (spam filter, policy, etc.)`);
            logger.warn(`      ⚠️ Check recipient's spam folder or mail server logs.`);
          } else {
            logger.warn(`      ⚠️ Email status unclear. Accepted list: ${normalizedAccepted.join(', ') || 'N/A'}, Rejected list: ${normalizedRejected.join(', ') || 'N/A'}`);
          }
        }
      });
      
      // 최종 요약 로깅
      const acceptedCount = recipientStatuses.filter(r => r.accepted).length;
      const rejectedCount = recipientStatuses.filter(r => r.rejected).length;
      const unclearCount = recipientStatuses.filter(r => !r.accepted && !r.rejected).length;
      
      logger.info(`📊 Email delivery summary:`);
      logger.info(`   - Total recipients: ${uniqueRecipients.length}`);
      logger.info(`   - ✅ Explicitly accepted: ${acceptedCount}`);
      logger.info(`   - ❌ Explicitly rejected: ${rejectedCount}`);
      logger.info(`   - ⚠️ Status unclear: ${unclearCount}`);
      
      if (unclearCount > 0) {
        logger.warn(`   ⚠️ ${unclearCount} recipient(s) have unclear status. These emails may not be delivered.`);
        recipientStatuses.filter(r => !r.accepted && !r.rejected).forEach(r => {
          logger.warn(`      - ${r.email}: ${r.status}`);
        });
      }
      
      logger.info(`✅ Email sent successfully to ${uniqueRecipients.join(', ')}`);
    } catch (error: any) {
      // 상세한 에러 정보 로깅
      const errorDetails = {
        message: error.message,
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode,
        errno: error.errno,
        syscall: error.syscall,
        hostname: error.hostname,
        port: error.port,
        stack: error.stack,
        to: options.to,
        subject: options.subject,
        from: fromEmail,
      };
      
      logger.error('Error sending email - Full details:', JSON.stringify(errorDetails, null, 2));
      
      // Gmail 특정 에러 메시지
      if (error.responseCode === 535 || error.code === 'EAUTH') {
        throw new Error('Gmail 인증 실패: 앱 비밀번호가 올바른지 확인하세요. (응답 코드: ' + (error.responseCode || error.code) + ')');
      } else if (error.responseCode === 550 || error.responseCode === 553) {
        throw new Error(`발신자 주소(${fromEmail})가 거부되었습니다. Gmail에서는 SMTP_USER(${process.env.SMTP_USER})와 동일한 주소를 사용하거나, Gmail의 '다른 주소로 보내기' 기능을 설정하세요.`);
      } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
        throw new Error(`SMTP 서버 연결 실패: ${process.env.SMTP_HOST || 'smtp.gmail.com'}:${process.env.SMTP_PORT || '587'}에 연결할 수 없습니다. 방화벽이나 네트워크 설정을 확인하세요.`);
      } else if (error.code === 'EENVELOPE') {
        throw new Error(`수신자 주소가 잘못되었습니다: ${options.to.join(', ')}`);
      }
      
      throw new Error(`이메일 발송 실패: ${error.message} (코드: ${error.code || error.responseCode || 'N/A'})`);
    }
  }

  /**
   * HTML에서 텍스트 추출 (스팸 필터 회피를 위한 텍스트 버전 제공)
   */
  private extractTextFromHtml(html: string): string {
    // 간단한 HTML 태그 제거
    let text = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // 특수 문자 디코딩
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    return text;
  }

  async sendInterviewInvitation(
    interviewerEmail: string,
    interviewerName: string,
    _interviewId: string,
    mainNotice: string,
    teamName: string,
    proposedSlots: Array<{ date: string; startTime: string; endTime: string }>,
    candidates: string[],
    token: string
  ): Promise<void> {
    const confirmPath = `/confirm/${token}`;
    const confirmUrl = buildFrontendUrl(confirmPath);
    const loginUrl = buildInterviewerLoginLink(confirmPath);

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #1890ff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background-color: #1890ff; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .info-table td { padding: 8px; border-bottom: 1px solid #ddd; }
          .info-table td:first-child { font-weight: bold; width: 150px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>면접 일정 확인 요청</h1>
          </div>
          <div class="content">
            <p>안녕하세요, ${interviewerName}님</p>
            <p>아래 면접의 가능한 일정을 선택해 주시기 바랍니다.</p>
            
            <table class="info-table">
              <tr>
                <td>공고명</td>
                <td>${mainNotice}</td>
              </tr>
              <tr>
                <td>팀명</td>
                <td>${teamName}</td>
              </tr>
              <tr>
                <td>면접자</td>
                <td>${candidates.join(', ')}</td>
              </tr>
              <tr>
                <td>제안 일정 목록</td>
                <td>
                  <ol style="margin:0;padding-left:18px;">
                    ${proposedSlots.map((slot) => `<li>${slot.date} ${slot.startTime} ~ ${slot.endTime}</li>`).join('')}
                  </ol>
                </td>
              </tr>
            </table>

            <div style="text-align: center;">
              <a href="${loginUrl}" class="button">면접관 로그인 후 일정 선택</a>
            </div>

            <p style="margin-top: 30px; font-size: 12px; color: #666;">
              링크가 작동하지 않는 경우 아래 주소를 복사해 접속해 주세요.<br>
              로그인 페이지: ${loginUrl}<br>
              직접 일정 선택: ${confirmUrl}
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: [interviewerEmail],
      subject: `[면접 일정 확인] ${mainNotice} - ${teamName}`,
      htmlBody,
    });
  }

  async sendReminderEmail(
    interviewerEmail: string,
    interviewerName: string,
    interviewId: string,
    mainNotice: string,
    teamName: string,
    token: string
  ): Promise<void> {
    const confirmPath = `/confirm/${token}`;
    const confirmUrl = buildFrontendUrl(confirmPath);
    const loginUrl = buildInterviewerLoginLink(confirmPath);

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #ff9800; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background-color: #ff9800; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>면접 일정 확인 리마인더</h1>
          </div>
          <div class="content">
            <p>안녕하세요, ${interviewerName}님</p>
            <p><strong>${mainNotice} - ${teamName}</strong> 면접의 일정 확인이 아직 완료되지 않았습니다.</p>
            <p>가능한 일정을 선택해 주시기 바랍니다.</p>

            <div style="text-align: center;">
              <a href="${loginUrl}" class="button">면접관 로그인 후 일정 선택</a>
            </div>

            <p style="margin-top: 30px; font-size: 12px; color: #666;">
              링크가 작동하지 않는 경우 아래 주소를 복사해 접속해 주세요.<br>
              로그인 페이지: ${loginUrl}<br>
              직접 일정 선택: ${confirmUrl}
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: [interviewerEmail],
      subject: `[리마인더] 면접 일정 확인 요청 - ${mainNotice}`,
      htmlBody,
    });
  }

  async sendConfirmationEmail(
    emails: string[],
    mainNotice: string,
    teamName: string,
    confirmedDate: string,
    confirmedStartTime: string,
    confirmedEndTime: string,
    candidates: string[]
  ): Promise<void> {
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #52c41a; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .confirmed-box { background-color: #e6f7ff; border-left: 4px solid #1890ff; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>면접 일정 확정 안내</h1>
          </div>
          <div class="content">
            <p>안녕하세요,</p>
            <p><strong>${mainNotice} - ${teamName}</strong> 면접 일정이 확정되었습니다.</p>
            
            <div class="confirmed-box">
              <h2 style="margin-top: 0;">확정 일정</h2>
              <p><strong>날짜:</strong> ${confirmedDate}</p>
              <p><strong>시간:</strong> ${confirmedStartTime} ~ ${confirmedEndTime}</p>
              <p><strong>면접자:</strong> ${candidates.join(', ')}</p>
            </div>

            <p>확정된 일정에 참석 가능하신지 확인 부탁드립니다.</p>
            <p>일정 변경이 필요한 경우 인사팀으로 연락 주시기 바랍니다.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to: emails,
      subject: `[일정 확정] ${mainNotice} - ${teamName}`,
      htmlBody,
    });
  }
}

export const emailService = new EmailService();
