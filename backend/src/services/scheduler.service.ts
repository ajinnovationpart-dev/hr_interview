import cron from 'node-cron';
import dayjs from 'dayjs';
import { logger } from '../utils/logger';
import { dataService } from './dataService';
import { emailService } from './email.service';
import { EmailTemplateService } from './emailTemplate.service';
import { commonSlotService } from './commonSlot.service';
import { generateJWT } from '../utils/jwt';
import { buildFrontendUrl, buildInterviewerLoginLink } from '../utils/frontendUrl';

export class SchedulerService {
  private jobs: cron.ScheduledTask[] = [];

  start() {
    // 리마인더 발송: 매시간 실행
    const reminderJob = cron.schedule('0 * * * *', async () => {
      logger.info('Running reminder job...');
      await this.sendReminders();
    });
    this.jobs.push(reminderJob);

    // D-1 리마인더: 매일 오후 5시 실행
    const dMinus1Job = cron.schedule('0 17 * * *', async () => {
      logger.info('Running D-1 reminder job...');
      await this.sendDMinus1Reminders();
    });
    this.jobs.push(dMinus1Job);

    // 자동 확정: 매일 오전 9시 실행
    const autoConfirmJob = cron.schedule('0 9 * * *', async () => {
      logger.info('Running auto-confirm job...');
      await this.autoConfirmInterviews();
    });
    this.jobs.push(autoConfirmJob);

    logger.info('Scheduler jobs started');
  }

  stop() {
    this.jobs.forEach(job => job.stop());
    logger.info('Scheduler jobs stopped');
  }

  /**
   * 미응답자에게 리마인더 이메일 발송
   */
  private async sendReminders() {
    try {
        const config = await dataService.getConfig();
        const firstReminderHours = parseInt(config.reminder_first_hours || '48');
        const secondReminderHours = parseInt(config.reminder_second_hours || '72');
        const maxCount = parseInt(config.reminder_max_count || '2');

        const interviews = await dataService.getAllInterviews();
      const now = new Date();

      for (const interview of interviews) {
        // PENDING 또는 PARTIAL 상태만 처리
        if (interview.status !== 'PENDING' && interview.status !== 'PARTIAL') {
          continue;
        }

        const createdAt = new Date(interview.created_at);
        const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

          // 미응답 면접관 찾기
          const mappings = await dataService.getInterviewInterviewers(interview.interview_id);
        const nonResponders = mappings.filter(m => 
          !m.responded_at && 
          m.reminder_sent_count < maxCount
        );

        if (nonResponders.length === 0) {
          continue;
        }

          // 면접관 정보 조회
          const allInterviewers = await dataService.getAllInterviewers();
        const interviewerMap = new Map(allInterviewers.map(iv => [iv.interviewer_id, iv]));

        // 면접자 정보 조회
        const candidates = await dataService.getCandidatesByInterview(interview.interview_id);

        for (const mapping of nonResponders) {
          const interviewer = interviewerMap.get(mapping.interviewer_id);
          if (!interviewer || !interviewer.is_active) {
            continue;
          }

          const lastReminderSentAt = mapping.last_reminder_sent_at 
            ? new Date(mapping.last_reminder_sent_at) 
            : null;
          const currentReminderCount = mapping.reminder_sent_count;
          
          let shouldSend = false;
          
          // 1차 리마인더 (48시간)
          if (currentReminderCount === 0 && hoursSinceCreation >= firstReminderHours) {
            shouldSend = true;
          }
          // 2차 리마인더 (72시간)
          else if (currentReminderCount === 1 && lastReminderSentAt) {
            const hoursSinceLastReminder = (now.getTime() - lastReminderSentAt.getTime()) / (1000 * 60 * 60);
            const hoursBetweenReminders = secondReminderHours - firstReminderHours;
            if (hoursSinceLastReminder >= hoursBetweenReminders) {
              shouldSend = true;
            }
          }

          if (shouldSend) {
            try {
              // JWT 토큰 생성
              const token = generateJWT({
                email: interviewer.email,
                role: 'INTERVIEWER',
                interviewerId: interviewer.interviewer_id,
                interviewId: interview.interview_id,
              });

              const confirmPath = `/confirm/${token}`;
              const confirmLink = buildFrontendUrl(confirmPath);
              const loginLink = buildInterviewerLoginLink(confirmPath);

              // 이 면접자가 담당하는 면접자 정보
              const assignedCandidates: Array<{ name: string; positionApplied: string; time: string }> = [];
              
              for (const candidate of candidates) {
                const candidateInterviewers = await dataService.getCandidateInterviewers(
                  interview.interview_id,
                  candidate.candidate_id
                );
                
                if (candidateInterviewers.some(ci => ci.interviewer_id === interviewer.interviewer_id)) {
                  const interviewCandidates = await dataService.getInterviewCandidates(interview.interview_id);
                  const candidateMapping = interviewCandidates.find(ic => ic.candidate_id === candidate.candidate_id);
                  
                  assignedCandidates.push({
                    name: candidate.name,
                    positionApplied: candidate.position_applied,
                    time: candidateMapping 
                      ? `${candidateMapping.scheduled_start_time} ~ ${candidateMapping.scheduled_end_time}`
                      : ''
                  });
                }
              }

              // 템플릿 서비스 인스턴스 생성
              const config = await dataService.getConfig();
              const templateService = new EmailTemplateService({
                company_logo_url: config.company_logo_url,
                company_address: config.company_address,
                parking_info: config.parking_info,
                dress_code: config.dress_code || '비즈니스 캐주얼',
                email_greeting: config.email_greeting,
                email_company_name: config.email_company_name,
                email_department_name: config.email_department_name,
                email_contact_email: config.email_contact_email,
                email_footer_text: config.email_footer_text,
              });

              const template = templateService.generateReminderEmail({
                interviewerName: interviewer.name,
                mainNotice: interview.main_notice,
                teamName: interview.team_name,
                confirmLink,
                loginLink,
                reminderCount: currentReminderCount + 1
              });

              await emailService.sendEmail({
                to: [interviewer.email],
                subject: `[리마인더 ${currentReminderCount + 1}차] 면접 일정 조율 - ${interview.main_notice}`,
                htmlBody: template,
              });

              // 리마인더 발송 기록 업데이트
              await dataService.updateReminderSent(interview.interview_id, interviewer.interviewer_id);

              logger.info(`Reminder sent to ${interviewer.email} for interview ${interview.interview_id} (${currentReminderCount + 1}차)`);
            } catch (error) {
              logger.error(`Failed to send reminder to ${interviewer.email}:`, error);
            }
          }
        }
      }
    } catch (error) {
      logger.error('Error in reminder job:', error);
    }
  }

  /**
   * D-1 리마인더 발송 (면접 전날 오후 5시)
   */
  private async sendDMinus1Reminders() {
      try {
        const interviews = await dataService.getAllInterviews();
        const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');

        for (const interview of interviews) {
          if (interview.status !== 'CONFIRMED') continue;
          
          // 확정 일정 조회
          const confirmedSchedule = await dataService.getConfirmedSchedule(interview.interview_id);
        if (!confirmedSchedule) continue;

        // 내일 면접인지 확인
        if (dayjs(confirmedSchedule.confirmed_date).format('YYYY-MM-DD') !== tomorrow) continue;

          // 면접자 정보
          const candidates = await dataService.getCandidatesByInterview(interview.interview_id);
          const interviewCandidates = await dataService.getInterviewCandidates(interview.interview_id);

          // 면접관들에게 D-1 리마인더 발송
          const mappings = await dataService.getInterviewInterviewers(interview.interview_id);
          const allInterviewers = await dataService.getAllInterviewers();
        const interviewerMap = new Map(allInterviewers.map(iv => [iv.interviewer_id, iv]));

        for (const mapping of mappings) {
          const interviewer = interviewerMap.get(mapping.interviewer_id);
          if (!interviewer || !interviewer.is_active) continue;

          try {
            const candidateNames = candidates.map(c => c.name);
            const interviewTime = `${confirmedSchedule.confirmed_start_time} ~ ${confirmedSchedule.confirmed_end_time}`;

            // 템플릿 서비스 인스턴스 생성
            const config = await dataService.getConfig();
            const templateService = new EmailTemplateService({
              company_logo_url: config.company_logo_url,
              company_address: config.company_address,
              parking_info: config.parking_info,
              dress_code: config.dress_code || '비즈니스 캐주얼',
              email_greeting: config.email_greeting,
              email_company_name: config.email_company_name,
              email_department_name: config.email_department_name,
              email_contact_email: config.email_contact_email,
              email_footer_text: config.email_footer_text,
            });

            const template = templateService.generateDMinus1Reminder({
              recipientName: interviewer.name,
              mainNotice: interview.main_notice,
              interviewDate: dayjs(confirmedSchedule.confirmed_date).format('YYYY년 MM월 DD일 (ddd)'),
              interviewTime,
              candidates: candidateNames
            });

            await emailService.sendEmail({
              to: [interviewer.email],
              subject: `[내일 면접] ${interview.main_notice}`,
              htmlBody: template,
            });

            logger.info(`D-1 reminder sent to ${interviewer.email} for interview ${interview.interview_id}`);
          } catch (error) {
            logger.error(`Failed to send D-1 reminder to ${interviewer.email}:`, error);
          }
        }
      }
    } catch (error) {
      logger.error('Error in D-1 reminder job:', error);
    }
  }

  /**
   * 모든 면접관이 응답한 면접의 공통 일정을 자동 확정
   */
  private async autoConfirmInterviews() {
      try {
        const interviews = await dataService.getAllInterviews();

        for (const interview of interviews) {
          // PARTIAL 상태만 처리
          if (interview.status !== 'PARTIAL') {
            continue;
          }

          const mappings = await dataService.getInterviewInterviewers(interview.interview_id);
        const totalInterviewers = mappings.length;
        const respondedCount = mappings.filter(m => m.responded_at).length;

        // 모든 면접관이 응답했는지 확인
        if (respondedCount < totalInterviewers) {
          continue;
        }

        // 공통 일정 찾기
        const result = await commonSlotService.findCommonSlots(interview.interview_id);

        if (result.hasCommon && result.commonSlots.length > 0) {
          // 첫 번째 공통 시간대로 확정
          const firstSlot = commonSlotService.sortSlots(result.commonSlots)[0];

          // 면접자별 확정 일정 저장
          const candidates = await dataService.getCandidatesByInterview(interview.interview_id);
          const interviewCandidates = await dataService.getInterviewCandidates(interview.interview_id);

          for (const candidate of candidates) {
            const candidateMapping = interviewCandidates.find(ic => ic.candidate_id === candidate.candidate_id);
            if (candidateMapping) {
              await dataService.createConfirmedSchedule({
                interview_id: interview.interview_id,
                candidate_id: candidate.candidate_id,
                confirmed_date: firstSlot.date,
                confirmed_start_time: candidateMapping.scheduled_start_time,
                confirmed_end_time: candidateMapping.scheduled_end_time,
              });
            }
          }

          // 상태 업데이트
          await dataService.updateInterviewStatus(interview.interview_id, 'CONFIRMED');

          // 확정 메일 발송
          const allInterviewers = await dataService.getAllInterviewers();
          const interviewerMap = new Map(allInterviewers.map(iv => [iv.interviewer_id, iv]));
          const interviewerEmails = mappings
            .map(m => interviewerMap.get(m.interviewer_id)?.email)
            .filter(Boolean) as string[];

          const config = await dataService.getConfig();
          const templateService = new EmailTemplateService({
            company_logo_url: config.company_logo_url,
            company_address: config.company_address,
            parking_info: config.parking_info,
            dress_code: config.dress_code,
            email_greeting: config.email_greeting,
            email_company_name: config.email_company_name,
            email_department_name: config.email_department_name,
            email_contact_email: config.email_contact_email,
            email_footer_text: config.email_footer_text,
          });

          const candidateSchedules = interviewCandidates.map(ic => ({
            name: candidates.find(c => c.candidate_id === ic.candidate_id)?.name || '',
            time: `${ic.scheduled_start_time} ~ ${ic.scheduled_end_time}`
          }));

          try {
            await emailService.sendEmail({
              to: interviewerEmails,
              subject: `[일정 확정] ${interview.main_notice} - ${interview.team_name}`,
              htmlBody: templateService.generateConfirmationEmail({
                recipientName: '면접관',
                recipientType: 'INTERVIEWER',
                mainNotice: interview.main_notice,
                teamName: interview.team_name,
                candidates: candidateSchedules,
                confirmedDate: dayjs(firstSlot.date).format('YYYY년 MM월 DD일 (ddd)'),
              }),
            });
          } catch (error) {
            logger.error('Failed to send confirmation email:', error);
          }

          logger.info(`Interview ${interview.interview_id} auto-confirmed`);
        } else {
          // 공통 일정이 없으면 NO_COMMON 상태로 업데이트
          await dataService.updateInterviewStatus(interview.interview_id, 'NO_COMMON');
          logger.info(`Interview ${interview.interview_id} has no common slots`);
        }
      }
    } catch (error) {
      logger.error('Error in auto-confirm job:', error);
    }
  }
}

export const schedulerService = new SchedulerService();
