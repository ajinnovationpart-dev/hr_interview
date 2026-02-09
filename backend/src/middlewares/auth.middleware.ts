import dotenv from 'dotenv';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';
import { logger } from '../utils/logger';

// 환경 변수 로드
dotenv.config();

export interface AuthUser {
  email: string;
  role: 'ADMIN' | 'INTERVIEWER';
  interviewerId?: string;
  interviewId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function adminAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, '인증이 필요합니다');
    }

    const token = authHeader.split(' ')[1];
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!jwtSecret) {
      logger.error('JWT_SECRET is not set in environment variables');
      throw new AppError(500, '서버 설정 오류: JWT_SECRET이 설정되지 않았습니다');
    }

    const decoded = jwt.verify(token, jwtSecret) as AuthUser;

    if (decoded.role !== 'ADMIN') {
      throw new AppError(403, '관리자 권한이 필요합니다');
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    if (error instanceof jwt.JsonWebTokenError) {
      logger.error('JWT verification error:', error.message);
      return next(new AppError(401, `토큰 검증 실패: ${error.message}`));
    }
    if (error instanceof jwt.TokenExpiredError) {
      logger.error('JWT token expired');
      return next(new AppError(401, '토큰이 만료되었습니다'));
    }
    logger.error('Auth error:', error);
    return next(new AppError(401, '유효하지 않은 토큰입니다'));
  }
}

// 면접관 인증 미들웨어
export function interviewerAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, '인증이 필요합니다');
    }

    const token = authHeader.split(' ')[1];
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!jwtSecret) {
      logger.error('JWT_SECRET is not set in environment variables');
      throw new AppError(500, '서버 설정 오류: JWT_SECRET이 설정되지 않았습니다');
    }

    const decoded = jwt.verify(token, jwtSecret) as AuthUser;

    if (decoded.role !== 'INTERVIEWER') {
      throw new AppError(403, '면접관 권한이 필요합니다');
    }

    if (!decoded.interviewerId) {
      throw new AppError(403, '면접관 ID가 없습니다');
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    if (error instanceof jwt.JsonWebTokenError) {
      logger.error('JWT verification error:', error.message);
      return next(new AppError(401, `토큰 검증 실패: ${error.message}`));
    }
    if (error instanceof jwt.TokenExpiredError) {
      logger.error('JWT token expired');
      return next(new AppError(401, '토큰이 만료되었습니다'));
    }
    logger.error('Auth error:', error);
    return next(new AppError(401, '유효하지 않은 토큰입니다'));
  }
}

/** 관리자 또는 면접관 로그인 시 발급된 Bearer 토큰만 허용 (챗봇 등 공통 API용) */
export function adminOrInterviewerAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, '인증이 필요합니다');
    }
    const token = authHeader.split(' ')[1];
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new AppError(500, '서버 설정 오류: JWT_SECRET이 설정되지 않았습니다');
    }
    const decoded = jwt.verify(token, jwtSecret) as AuthUser;
    if (decoded.role !== 'ADMIN' && decoded.role !== 'INTERVIEWER') {
      throw new AppError(403, '관리자 또는 면접관으로 로그인해 주세요');
    }
    if (decoded.role === 'INTERVIEWER' && !decoded.interviewerId) {
      throw new AppError(403, '면접관 ID가 없습니다');
    }
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError(401, `토큰 검증 실패: ${error.message}`));
    }
    if (error instanceof jwt.TokenExpiredError) {
      return next(new AppError(401, '토큰이 만료되었습니다'));
    }
    return next(new AppError(401, '유효하지 않은 토큰입니다'));
  }
}

export function verifyToken(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.params.token || req.query.token as string;
    if (!token) {
      throw new AppError(401, '토큰이 필요합니다');
    }

    const jwtSecret = process.env.JWT_SECRET;
    
    if (!jwtSecret) {
      logger.error('JWT_SECRET is not set in environment variables');
      throw new AppError(500, '서버 설정 오류: JWT_SECRET이 설정되지 않았습니다');
    }

    const decoded = jwt.verify(token, jwtSecret) as AuthUser;
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    if (error instanceof jwt.JsonWebTokenError) {
      logger.error('JWT verification error:', error.message);
      return next(new AppError(401, `토큰 검증 실패: ${error.message}`));
    }
    if (error instanceof jwt.TokenExpiredError) {
      logger.error('JWT token expired');
      return next(new AppError(401, '토큰이 만료되었습니다. 새 링크를 요청해주세요'));
    }
    logger.error('Token verification error:', error);
    return next(new AppError(401, '유효하지 않은 토큰입니다'));
  }
}
