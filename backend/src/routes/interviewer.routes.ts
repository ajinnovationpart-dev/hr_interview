import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { adminAuth } from '../middlewares/auth.middleware';
import { AppError } from '../middlewares/errorHandler';
import { dataService } from '../services/dataService';
import { logger } from '../utils/logger';
import { hashPassword, generateTemporaryPassword } from '../utils/password';

export const interviewerRouter = Router();

// Multer 설정 (메모리 저장)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Excel 파일만 업로드 가능합니다'));
    }
  },
});

// 면접관 목록 조회
interviewerRouter.get('/', adminAuth, async (req: Request, res: Response) => {
  try {
    const interviewers = await dataService.getAllInterviewers();
    
    // 디버깅: 김희수, 정주연 면접관 정보 로깅
    const kimhs = interviewers.find(iv => iv.name?.includes('희수') || iv.email?.includes('kimhs'));
    const jyjeong = interviewers.find(iv => iv.name?.includes('주연') || iv.email?.includes('jyjeong'));
    
    if (kimhs) {
      logger.info(`🔍 Found 김희수: ID=${kimhs.interviewer_id}, Name=${kimhs.name}, Email=${kimhs.email}, Active=${kimhs.is_active}`);
    } else {
      logger.warn(`⚠️ 김희수 면접관을 찾을 수 없습니다`);
    }
    
    if (jyjeong) {
      logger.info(`🔍 Found 정주연: ID=${jyjeong.interviewer_id}, Name=${jyjeong.name}, Email=${jyjeong.email}, Active=${jyjeong.is_active}`);
    } else {
      logger.warn(`⚠️ 정주연 면접관을 찾을 수 없습니다`);
    }
    
    res.json({
      success: true,
      data: interviewers,
    });
  } catch (error) {
    throw new AppError(500, '면접관 목록 조회 실패');
  }
});

// 면접관 정보 상세 조회 (디버깅용)
interviewerRouter.get('/debug/:name', adminAuth, async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const interviewers = await dataService.getAllInterviewers();
    
    // 이름 또는 이메일로 검색
    const found = interviewers.filter(iv => 
      iv.name?.includes(name) || 
      iv.email?.includes(name.toLowerCase())
    );
    
    logger.info(`🔍 Searching for interviewer: "${name}"`);
    logger.info(`   Found ${found.length} matches:`);
    found.forEach(iv => {
      logger.info(`   - ID: ${iv.interviewer_id}, Name: ${iv.name}, Email: ${iv.email}, Active: ${iv.is_active}`);
    });
    
    res.json({
      success: true,
      data: found,
      count: found.length,
    });
  } catch (error) {
    logger.error('Error in debug endpoint:', error);
    throw new AppError(500, '면접관 디버깅 조회 실패');
  }
});

// 면접관 등록
interviewerRouter.post('/', adminAuth, async (req: Request, res: Response) => {
  try {
    const { name, email, department, position, phone, is_team_lead, is_active, password, generatePassword } = req.body;

    if (!name || !email) {
      throw new AppError(400, '이름과 이메일은 필수입니다');
    }

    // 이메일 중복 확인
    const existing = await dataService.getInterviewerByEmail(email);
    if (existing) {
      throw new AppError(400, '이미 등록된 이메일입니다');
    }

    // 비밀번호 처리
    let passwordHash = '';
    let tempPassword = '';
    if (generatePassword !== false) {
      // 임시 비밀번호 생성 (기본값)
      tempPassword = generateTemporaryPassword();
      passwordHash = await hashPassword(tempPassword);
    } else if (password) {
      // 사용자 지정 비밀번호
      if (password.length < 6) {
        throw new AppError(400, '비밀번호는 최소 6자 이상이어야 합니다');
      }
      passwordHash = await hashPassword(password);
    } else {
      // 비밀번호 없이 생성 (나중에 설정 가능)
      tempPassword = generateTemporaryPassword();
      passwordHash = await hashPassword(tempPassword);
    }

    const interviewerId = `IV_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const interviewer = {
      interviewer_id: interviewerId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      department: department?.trim() || '',
      position: position?.trim() || '',
      phone: phone?.trim() || '',
      is_team_lead: is_team_lead === true || is_team_lead === 'true',
      is_active: is_active !== false && is_active !== 'false',
      password_hash: passwordHash,
    };

    const result = await dataService.createOrUpdateInterviewers([interviewer]);

    res.json({
      success: true,
      data: {
        interviewer_id: interviewerId,
        created: result.created,
        updated: result.updated,
        temporaryPassword: tempPassword || undefined, // 임시 비밀번호 반환 (처음 한 번만)
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error creating interviewer:', error);
    throw new AppError(500, '면접관 등록 실패');
  }
});

// 면접관 비밀번호 변경 (관리자)
interviewerRouter.put('/:id/password', adminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { password, generatePassword } = req.body;

    const existing = await dataService.getInterviewerById(id);
    if (!existing) {
      throw new AppError(404, '면접관을 찾을 수 없습니다');
    }

    let passwordHash = '';
    let tempPassword = '';
    
    if (generatePassword) {
      // 임시 비밀번호 생성
      tempPassword = generateTemporaryPassword();
      passwordHash = await hashPassword(tempPassword);
    } else if (password) {
      // 사용자 지정 비밀번호
      if (password.length < 6) {
        throw new AppError(400, '비밀번호는 최소 6자 이상이어야 합니다');
      }
      passwordHash = await hashPassword(password);
    } else {
      throw new AppError(400, '비밀번호 또는 generatePassword가 필요합니다');
    }

    await dataService.updateInterviewerPassword(id, passwordHash);

    res.json({
      success: true,
      data: {
        interviewer_id: id,
        temporaryPassword: tempPassword || undefined,
        message: tempPassword ? '임시 비밀번호가 생성되었습니다' : '비밀번호가 변경되었습니다',
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error updating interviewer password:', error);
    throw new AppError(500, '비밀번호 변경 실패');
  }
});

// 면접관 수정
interviewerRouter.put('/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, department, position, phone, is_team_lead, is_active } = req.body;

    logger.debug(`Updating interviewer with ID: ${id}`);
    let existing = await dataService.getInterviewerById(id);
    
    // ID로 찾지 못하면 이메일로 찾기 시도
    if (!existing && email) {
      logger.debug(`Interviewer not found by ID, trying to find by email: ${email}`);
      existing = await dataService.getInterviewerByEmail(email);
      if (existing) {
        logger.info(`Found interviewer by email, using existing ID: ${existing.interviewer_id}`);
        // ID를 기존 ID로 업데이트
        id = existing.interviewer_id;
      }
    }

    if (!existing) {
      // 디버깅: 모든 면접관 ID 확인
      const allInterviewers = await dataService.getAllInterviewers();
      const allIds = allInterviewers.map(iv => iv.interviewer_id);
      logger.warn(`Interviewer not found. Requested ID: ${id}, Available IDs: ${allIds.slice(0, 5).join(', ')}...`);
      
      // 면접관이 없으면 새로 생성
      if (!name || !email) {
        throw new AppError(400, '면접관을 찾을 수 없고, 이름과 이메일이 없어 새로 생성할 수 없습니다');
      }
      
      logger.info(`Creating new interviewer with ID: ${id}`);
      const newInterviewer = {
        interviewer_id: id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        department: department?.trim() || '',
        position: position?.trim() || '',
        phone: phone?.trim() || '',
        is_team_lead: is_team_lead === true || is_team_lead === 'true',
        is_active: is_active !== false && is_active !== 'false',
      };
      
      const result = await dataService.createOrUpdateInterviewers([newInterviewer]);
      
      res.json({
        success: true,
        message: '면접관이 새로 생성되었습니다',
        data: {
          interviewer_id: id,
          created: result.created,
          updated: result.updated,
        },
      });
      return;
    }

    // 이메일 변경 시 중복 확인
    if (email && email.toLowerCase() !== existing.email.toLowerCase()) {
      const emailExists = await dataService.getInterviewerByEmail(email);
      if (emailExists && emailExists.interviewer_id !== id) {
        throw new AppError(400, '이미 등록된 이메일입니다');
      }
    }

    const interviewer = {
      interviewer_id: id,
      name: name?.trim() || existing.name,
      email: email?.trim().toLowerCase() || existing.email,
      department: department?.trim() || existing.department || '',
      position: position?.trim() || existing.position || '',
      phone: phone?.trim() || existing.phone || '',
      is_team_lead: is_team_lead !== undefined ? (is_team_lead === true || is_team_lead === 'true') : existing.is_team_lead,
      is_active: is_active !== undefined ? (is_active !== false && is_active !== 'false') : existing.is_active,
    };

    const result = await dataService.createOrUpdateInterviewers([interviewer]);

    res.json({
      success: true,
      data: {
        interviewer_id: id,
        updated: result.updated,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error updating interviewer:', error);
    throw new AppError(500, '면접관 수정 실패');
  }
});

// 면접관 삭제 (비활성화)
interviewerRouter.delete('/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    logger.debug(`Deleting interviewer with ID: ${id}`);
    const existing = await dataService.getInterviewerById(id);
    if (!existing) {
      // 디버깅: 모든 면접관 ID 확인
      const allInterviewers = await dataService.getAllInterviewers();
      const allIds = allInterviewers.map(iv => iv.interviewer_id);
      logger.warn(`Interviewer not found. Requested ID: ${id}, Available IDs: ${allIds.join(', ')}`);
      throw new AppError(404, `면접관을 찾을 수 없습니다 (ID: ${id})`);
    }

    // 삭제 대신 비활성화
    const interviewer = {
      interviewer_id: id,
      name: existing.name,
      email: existing.email,
      department: existing.department || '',
      position: existing.position || '',
      phone: existing.phone || '',
      is_team_lead: existing.is_team_lead,
      is_active: false,
    };

    const result = await dataService.createOrUpdateInterviewers([interviewer]);

    res.json({
      success: true,
      message: '면접관이 비활성화되었습니다',
      data: {
        interviewer_id: id,
        updated: result.updated,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error deleting interviewer:', error);
    throw new AppError(500, '면접관 삭제 실패');
  }
});

// 면접관 이메일 테스트 발송 (간단한 텍스트 이메일)
interviewerRouter.post('/:id/test-email', adminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const interviewer = await dataService.getInterviewerById(id);
    if (!interviewer) {
      throw new AppError(404, '면접관을 찾을 수 없습니다');
    }
    
    if (!interviewer.email || !interviewer.email.trim()) {
      throw new AppError(400, '면접관의 이메일 주소가 없습니다');
    }
    
    const { emailService } = await import('../services/email.service');
    
    // 간단한 텍스트 이메일로 테스트
    const testEmailContent = `
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>이메일 발송 테스트</h2>
          <p>안녕하세요, ${interviewer.name}님</p>
          <p>이것은 이메일 발송 테스트 메일입니다.</p>
          <p>이 메일을 받으셨다면 이메일 발송이 정상적으로 작동하는 것입니다.</p>
          <p><strong>면접관 정보:</strong></p>
          <ul>
            <li>이름: ${interviewer.name}</li>
            <li>이메일: ${interviewer.email}</li>
            <li>부서: ${interviewer.department || 'N/A'}</li>
            <li>직책: ${interviewer.position || 'N/A'}</li>
          </ul>
          <p>테스트 시간: ${new Date().toLocaleString('ko-KR')}</p>
        </body>
      </html>
    `;
    
    const rawEmail = interviewer.email.trim();
    const emailToSend = rawEmail.toLowerCase();
    
    logger.info(`🧪 Test email - Sending to: ${emailToSend} (${interviewer.name}, ID: ${id})`);
    logger.info(`   - Original: "${rawEmail}"`);
    logger.info(`   - Normalized: "${emailToSend}"`);
    logger.info(`   - Length: ${emailToSend.length}`);
    logger.info(`   - Domain: ${emailToSend.split('@')[1] || 'N/A'}`);
    
    await emailService.sendEmail({
      to: [emailToSend],
      subject: '[테스트] 이메일 발송 테스트',
      htmlBody: testEmailContent,
    });
    
    logger.info(`✅ Test email sent successfully to ${interviewer.name} (${emailToSend})`);
    
    res.json({
      success: true,
      message: `테스트 이메일이 ${emailToSend}로 발송되었습니다.`,
      data: {
        interviewerId: interviewer.interviewer_id,
        name: interviewer.name,
        email: emailToSend,
        originalEmail: rawEmail,
        emailLength: emailToSend.length,
        domain: emailToSend.split('@')[1] || 'N/A',
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error sending test email:', error);
    throw new AppError(500, '테스트 이메일 발송 실패');
  }
});

// Excel 업로드
interviewerRouter.post('/upload', adminAuth, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      throw new AppError(400, '파일이 업로드되지 않았습니다');
    }

    // Excel 파일 파싱
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    if (rows.length < 2) {
      throw new AppError(400, '데이터가 없습니다');
    }

    // 헤더 확인 (예상: 이름, 이메일, 부서, 직책, 연락처)
    const headers = rows[0].map((h: string) => String(h).toLowerCase());
    const nameIndex = headers.findIndex(h => h.includes('이름') || h.includes('name'));
    const emailIndex = headers.findIndex(h => h.includes('이메일') || h.includes('email'));
    const deptIndex = headers.findIndex(h => h.includes('부서') || h.includes('department'));
    const positionIndex = headers.findIndex(h => h.includes('직책') || h.includes('position'));
    const phoneIndex = headers.findIndex(h => h.includes('연락처') || h.includes('phone'));

    if (nameIndex === -1 || emailIndex === -1) {
      throw new AppError(400, '필수 컬럼(이름, 이메일)이 없습니다');
    }

    // 데이터 변환
    const interviewers = rows.slice(1)
      .filter(row => row[nameIndex] && row[emailIndex]) // 빈 행 제외
      .map((row, index) => {
        const email = String(row[emailIndex]).trim().toLowerCase();
        const interviewerId = `IV_${Date.now()}_${index}`;

        return {
          interviewer_id: interviewerId,
          name: String(row[nameIndex]).trim(),
          email,
          department: deptIndex !== -1 ? String(row[deptIndex] || '').trim() : '',
          position: positionIndex !== -1 ? String(row[positionIndex] || '').trim() : '',
          phone: phoneIndex !== -1 ? String(row[phoneIndex] || '').trim() : '',
          is_active: 'TRUE',
        };
      });

    if (interviewers.length === 0) {
      throw new AppError(400, '유효한 데이터가 없습니다');
    }

    // Google Sheets에 저장
    const result = await dataService.createOrUpdateInterviewers(interviewers);

    res.json({
      success: true,
      data: {
        total: interviewers.length,
        created: result.created,
        updated: result.updated,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error uploading interviewers:', error);
    throw new AppError(500, '면접관 업로드 실패');
  }
});
