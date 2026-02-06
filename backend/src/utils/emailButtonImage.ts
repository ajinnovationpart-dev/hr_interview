/**
 * 아웃룩 PC 등에서 버튼이 깨지지 않도록 메일용 "일정 선택하기" 버튼 이미지 생성
 */
import sharp from 'sharp';
import { logger } from './logger';

const BUTTON_WIDTH = 220;
const BUTTON_HEIGHT = 56;
const BG = { r: 37, g: 99, b: 235 }; // #2563eb

let cachedBuffer: Buffer | null = null;

export async function getScheduleButtonImageBuffer(): Promise<Buffer> {
  if (cachedBuffer) return cachedBuffer;
  try {
    const buffer = await sharp({
      create: {
        width: BUTTON_WIDTH,
        height: BUTTON_HEIGHT,
        channels: 4,
        background: { ...BG, alpha: 1 },
      },
    })
      .png()
      .toBuffer();
    cachedBuffer = buffer;
    return buffer;
  } catch (error) {
    logger.error('Failed to generate schedule button image:', error);
    throw error;
  }
}
