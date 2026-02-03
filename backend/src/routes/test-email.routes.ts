import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { emailService } from '../services/email.service';
import { AppError } from '../middlewares/errorHandler';

const testEmailRouter = Router();

// 테스트 메일 발송 엔드포인트 (인증 없이 접근 가능 - 개발용)
testEmailRouter.post('/test-email', async (req: Request, res: Response) => {
  try {
    const { to, subject } = req.body;
    
    if (!to) {
      throw new AppError(400, '수신자 이메일 주소가 필요합니다');
    }

    const testEmailContent = `
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 8px; }
            .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: white; padding: 20px; border-radius: 0 0 8px 8px; }
            .info { background-color: #e6f7ff; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>이메일 발송 테스트</h2>
            </div>
            <div class="content">
              <p>안녕하세요,</p>
              <p>이것은 이메일 발송 테스트 메일입니다.</p>
              <div class="info">
                <p><strong>발송 시간:</strong> ${new Date().toLocaleString('ko-KR')}</p>
                <p><strong>수신자:</strong> ${to}</p>
                <p><strong>상태:</strong> 정상 발송됨</p>
              </div>
              <p>이 메일을 받으셨다면 이메일 발송 시스템이 정상적으로 작동하는 것입니다.</p>
              <p>감사합니다.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    logger.info(`🧪 [TEST EMAIL] Starting test email to: ${to}`);
    logger.info(`   - Subject: ${subject || '[테스트] 이메일 발송 테스트'}`);
    logger.info(`   - Timestamp: ${new Date().toISOString()}`);

    await emailService.sendEmail({
      to: Array.isArray(to) ? to : [to],
      subject: subject || '[테스트] 이메일 발송 테스트',
      htmlBody: testEmailContent,
    });

    logger.info(`✅ [TEST EMAIL] Test email sent successfully to: ${to}`);

    res.json({
      success: true,
      message: `테스트 이메일이 ${to}로 발송되었습니다.`,
      data: {
        to,
        subject: subject || '[테스트] 이메일 발송 테스트',
        sentAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    logger.error('❌ [TEST EMAIL] Error sending test email:', {
      message: error.message,
      code: error.code,
      responseCode: error.responseCode,
      stack: error.stack,
    });

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(500, `테스트 이메일 발송 실패: ${error.message}`);
  }
});

export { testEmailRouter };
