import { Router, Request, Response } from 'express';
import dotenv from 'dotenv';
import { generateJWT } from '../utils/jwt';
import { AppError } from '../middlewares/errorHandler';
import { adminAuth } from '../middlewares/auth.middleware';
import { logger } from '../utils/logger';

// 환경 변수 로드
dotenv.config();

export const authRouter = Router();

// 로그인 엔드포인트 테스트
authRouter.get('/test', (req: Request, res: Response) => {
  res.json({ success: true, message: 'Auth router is working' });
});

// 간단한 로그인 (이메일 기반)
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    // 간단한 검증 (실제로는 더 강력한 인증 필요)
    const allowedEmailsRaw = process.env.ALLOWED_ADMIN_EMAILS || '';
    const allowedEmails = allowedEmailsRaw
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(e => e.length > 0); // 빈 문자열 제거
    const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    // 디버깅 로그
    logger.info('🔐 Login attempt:', {
      email: email,
      emailLower: email?.toLowerCase(),
      passwordLength: password?.length,
      passwordReceived: password,
      passwordExpected: defaultPassword,
      passwordMatch: password === defaultPassword,
      allowedEmails: allowedEmails,
      allowedEmailsCount: allowedEmails.length,
      allowedEmailsRaw: allowedEmailsRaw,
      defaultPassword: defaultPassword ? 'SET' : 'NOT SET',
      env_ALLOWED_ADMIN_EMAILS: process.env.ALLOWED_ADMIN_EMAILS,
      env_ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ? 'SET' : 'NOT SET',
    });
    
    if (!email) {
      throw new AppError(400, '이메일을 입력해주세요');
    }
    
    const emailLower = email.toLowerCase();
    
    // 허용된 이메일 확인 (또는 HR_EMAIL과 비교)
    const hrEmail = process.env.HR_EMAIL || 'hr@ajnetworks.co.kr';
    if (allowedEmails.length > 0 && !allowedEmails.includes(emailLower)) {
      logger.warn(`❌ Email not allowed: ${emailLower}, Allowed: ${allowedEmails.join(', ')}`);
      throw new AppError(403, '접근 권한이 없습니다');
    }
    
    // 비밀번호 확인 (간단한 방식)
    if (password !== defaultPassword) {
      logger.warn(`❌ Password mismatch. Expected length: ${defaultPassword.length}, Received length: ${password?.length}`);
      throw new AppError(401, '비밀번호가 일치하지 않습니다');
    }
    
    logger.info(`✅ Login successful for: ${emailLower}`);

    const accessToken = generateJWT({
      email: email.toLowerCase(),
      role: 'ADMIN',
    });

    res.json({
      success: true,
      data: {
        accessToken,
        user: {
          email: email.toLowerCase(),
          name: '인사팀',
          role: 'ADMIN',
        },
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error in login:', error);
    throw new AppError(500, '로그인 실패');
  }
});

// 면접관 로그인
authRouter.post('/interviewer/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      throw new AppError(400, '이메일과 비밀번호를 입력해주세요');
    }

    // 면접관 조회 (비밀번호 해시 포함)
    const interviewer = await dataService.getInterviewerByEmailWithPassword(email.toLowerCase());
    
    if (!interviewer) {
      logger.warn(`❌ Interviewer not found: ${email}`);
      throw new AppError(401, '이메일 또는 비밀번호가 일치하지 않습니다');
    }

    // 비활성화된 면접관 확인
    if (!interviewer.is_active) {
      logger.warn(`❌ Inactive interviewer login attempt: ${email}`);
      throw new AppError(403, '비활성화된 계정입니다. 관리자에게 문의하세요');
    }

    // 비밀번호 확인
    if (!interviewer.password_hash) {
      logger.warn(`❌ No password set for interviewer: ${email}`);
      throw new AppError(401, '비밀번호가 설정되지 않았습니다. 관리자에게 문의하세요');
    }

    const isValidPassword = await verifyPassword(password, interviewer.password_hash);
    
    if (!isValidPassword) {
      logger.warn(`❌ Invalid password for interviewer: ${email}`);
      throw new AppError(401, '이메일 또는 비밀번호가 일치하지 않습니다');
    }

    logger.info(`✅ Interviewer login successful: ${email}`);

    const accessToken = generateJWT({
      email: interviewer.email.toLowerCase(),
      role: 'INTERVIEWER',
      interviewerId: interviewer.interviewer_id,
    });

    res.json({
      success: true,
      data: {
        accessToken,
        user: {
          interviewer_id: interviewer.interviewer_id,
          email: interviewer.email,
          name: interviewer.name,
          department: interviewer.department,
          position: interviewer.position,
          role: 'INTERVIEWER',
        },
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error in interviewer login:', error);
    throw new AppError(500, '로그인 실패');
  }
});

// 현재 사용자 정보 조회
authRouter.get('/me', adminAuth, async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      user: req.user,
    },
  });
});
