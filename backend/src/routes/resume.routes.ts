import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs/promises';
import { dataService } from '../services/dataService';
import { adminAuth } from '../middlewares/auth.middleware';
import { AppError } from '../middlewares/errorHandler';
import { logger } from '../utils/logger';

export const resumeRouter = Router();

// 업로드 디렉토리: OneDrive 사용 시 Excel과 같은 동기화 폴더의 resumes 하위 폴더에 저장
function getResumeUploadDir(): string {
  if (process.env.ONEDRIVE_ENABLED === 'true' && process.env.ONEDRIVE_EXCEL_PATH) {
    const excelDir = path.dirname(path.resolve(process.env.ONEDRIVE_EXCEL_PATH));
    return path.join(excelDir, 'resumes');
  }
  return process.env.RESUME_UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'resumes');
}
const UPLOAD_DIR = getResumeUploadDir();

// 업로드 디렉토리 생성 (없으면)
async function ensureUploadDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    logger.error('Failed to create upload directory:', error);
  }
}

ensureUploadDir();

// Multer 설정
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await ensureUploadDir();
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // 파일명: candidateId_timestamp_원본파일명
    const candidateId = req.body.candidateId || 'unknown';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9가-힣._-]/g, '_');
    const filename = `${candidateId}_${timestamp}_${sanitizedBaseName}${ext}`;
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB 제한
  },
  fileFilter: (req, file, cb) => {
    // 허용된 파일 확장자
    const allowedExts = ['.pdf', '.doc', '.docx', '.hwp', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new AppError(400, `허용되지 않는 파일 형식입니다. 허용 형식: ${allowedExts.join(', ')}`));
    }
  },
});

// 이력서 업로드
resumeRouter.post('/upload', adminAuth, upload.single('resume'), async (req: Request, res: Response) => {
  try {
    // 400 원인 파악용 로그 (multipart 시 body는 multer가 채움)
    const bodyKeys = req.body ? Object.keys(req.body) : [];
    const hasFile = !!req.file;
    if (!hasFile || !req.body?.candidateId) {
      logger.warn('Resume upload 400', {
        hasFile,
        bodyKeys,
        candidateId: req.body?.candidateId ?? '(없음)',
      });
    }

    if (!req.file) {
      throw new AppError(400, '이력서 파일을 업로드해주세요');
    }

    const { candidateId } = req.body;
    if (!candidateId) {
      // 업로드된 파일 삭제
      await fs.unlink(req.file.path).catch(() => {});
      throw new AppError(400, '면접자 ID가 필요합니다');
    }

    // 파일 URL 생성 (상대 경로)
    const fileUrl = `/api/resumes/${path.basename(req.file.path)}`;

    // Candidate 정보 업데이트
    await dataService.updateCandidate(candidateId, {
      resume_url: fileUrl,
    });

    logger.info(`Resume uploaded for candidate ${candidateId}: ${req.file.filename}`);

    res.json({
      success: true,
      data: {
        candidateId,
        resumeUrl: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
      },
    });
  } catch (error) {
    // 업로드된 파일이 있으면 삭제
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    if (error instanceof AppError) {
      throw error;
    }

    logger.error('Resume upload error:', error);
    throw new AppError(500, '이력서 업로드에 실패했습니다');
  }
});

// 이력서 다운로드
resumeRouter.get('/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(UPLOAD_DIR, filename);

    // 경로 탐색 공격 방지
    if (!path.resolve(filePath).startsWith(path.resolve(UPLOAD_DIR))) {
      throw new AppError(400, '잘못된 파일 경로입니다');
    }

    // 파일 존재 확인
    try {
      await fs.access(filePath);
    } catch {
      throw new AppError(404, '파일을 찾을 수 없습니다');
    }

    // 파일 전송
    res.sendFile(filePath);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    logger.error('Resume download error:', error);
    throw new AppError(500, '이력서 다운로드에 실패했습니다');
  }
});

// 이력서 삭제
resumeRouter.delete('/:candidateId', adminAuth, async (req: Request, res: Response) => {
  try {
    const { candidateId } = req.params;

    // Candidate 정보 조회
    const candidate = await dataService.getCandidateById(candidateId);
    if (!candidate) {
      throw new AppError(404, '면접자를 찾을 수 없습니다');
    }

    // 파일 삭제
    if (candidate.resume_url) {
      const filename = path.basename(candidate.resume_url);
      const filePath = path.join(UPLOAD_DIR, filename);
      
      try {
        await fs.unlink(filePath);
        logger.info(`Resume deleted for candidate ${candidateId}: ${filename}`);
      } catch (error) {
        logger.warn(`Failed to delete resume file: ${filePath}`, error);
        // 파일 삭제 실패해도 DB 업데이트는 진행
      }
    }

    // Candidate 정보 업데이트
    await dataService.updateCandidate(candidateId, {
      resume_url: '',
    });

    res.json({
      success: true,
      message: '이력서가 삭제되었습니다',
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    logger.error('Resume delete error:', error);
    throw new AppError(500, '이력서 삭제에 실패했습니다');
  }
});
