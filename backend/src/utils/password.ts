/**
 * 비밀번호 해싱 유틸리티
 */
import bcrypt from 'bcrypt';
import { logger } from './logger';

const SALT_ROUNDS = 10;

/**
 * 비밀번호를 해시화
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    return hash;
  } catch (error) {
    logger.error('Password hashing error:', error);
    throw new Error('비밀번호 해싱 실패');
  }
}

/**
 * 비밀번호 검증
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    const isValid = await bcrypt.compare(password, hash);
    return isValid;
  } catch (error) {
    logger.error('Password verification error:', error);
    return false;
  }
}

/**
 * 임시 비밀번호 생성 (8자리 랜덤)
 */
export function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'; // 혼동되는 문자 제외
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
