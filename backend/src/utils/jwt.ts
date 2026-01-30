import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { AuthUser } from '../middlewares/auth.middleware';
import { logger } from './logger';

// 환경 변수 로드
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  logger.error('JWT_SECRET is not set in environment variables');
  throw new Error('JWT_SECRET environment variable is required');
}

/**
 * JWT 토큰 생성
 * @param payload 토큰 페이로드
 * @param expiresIn 만료 시간 (기본값: 역할에 따라 자동 설정)
 *   - INTERVIEWER: 90일 (면접 확정까지 시간이 걸릴 수 있음)
 *   - ADMIN: 7일 (보안상 짧게 유지)
 */
export function generateJWT(payload: Partial<AuthUser>, expiresIn?: string): string {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  
  // 만료 시간이 지정되지 않으면 역할에 따라 자동 설정
  if (!expiresIn) {
    if (payload.role === 'INTERVIEWER') {
      // 면접관 토큰: 환경 변수 또는 기본값 90일
      expiresIn = process.env.INTERVIEWER_TOKEN_EXPIRES || '90d';
    } else {
      // 관리자 토큰: 환경 변수 또는 기본값 7일
      expiresIn = process.env.ADMIN_TOKEN_EXPIRES || '7d';
    }
  }
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyJWT(token: string): AuthUser {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.verify(token, JWT_SECRET) as AuthUser;
}
