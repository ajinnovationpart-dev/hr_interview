import { Router, Request, Response } from 'express';
import { adminAuth } from '../middlewares/auth.middleware';
import { AppError } from '../middlewares/errorHandler';
import { dataService } from '../services/dataService';
import { logger } from '../utils/logger';

export const configRouter = Router();

// 설정 조회
configRouter.get('/', adminAuth, async (req: Request, res: Response) => {
  try {
    const config = await dataService.getConfig();
    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    logger.error('Error getting config:', error);
    throw new AppError(500, '설정 조회 실패');
  }
});

// 설정 업데이트
configRouter.put('/', adminAuth, async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    
    // 유효한 설정 키만 업데이트
    const validKeys = [
      'interview_duration_minutes',
      'work_start_time',
      'work_end_time',
      'lunch_start_time',
      'lunch_end_time',
      'time_slot_interval',
      'reminder_first_hours',
      'reminder_second_hours',
      'reminder_max_count',
      'd_minus_1_reminder_time',
      'min_interviewers',
      'max_interviewers',
      'require_team_lead',
      'min_notice_hours',
      'data_retention_years',
      'email_retry_count',
      'company_logo_url',
      'company_address',
      'parking_info',
      'dress_code',
      'smtp_from_email',
      'smtp_from_name',
      'smtp_reply_to',
      'email_greeting',
      'email_company_name',
      'email_department_name',
      'email_contact_email',
      'email_footer_text',
    ];

    const filteredUpdates: Record<string, string> = {};
    Object.keys(updates).forEach(key => {
      if (validKeys.includes(key)) {
        filteredUpdates[key] = String(updates[key]);
      }
    });

    const result = await dataService.updateConfig(filteredUpdates);
    
    res.json({
      success: true,
      message: '설정이 업데이트되었습니다',
      data: result,
    });
  } catch (error) {
    logger.error('Error updating config:', error);
    throw new AppError(500, '설정 업데이트 실패');
  }
});
