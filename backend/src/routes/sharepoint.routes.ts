import { Router, Request, Response } from 'express';
import { adminAuth } from '../middlewares/auth.middleware';
import { AppError } from '../middlewares/errorHandler';
import { extractSharePointInfo } from '../utils/sharePointInfo';
import { logger } from '../utils/logger';
import { dataService } from '../services/dataService';
import { SharePointRestService } from '../services/sharePointRest.service';

export const sharepointRouter = Router();

/**
 * SharePoint URL에서 정보 추출
 * POST /api/sharepoint/extract-info
 */
sharepointRouter.post('/extract-info', adminAuth, async (req: Request, res: Response) => {
  try {
    const { url, accessToken, fileName } = req.body;

    if (!url) {
      throw new AppError(400, 'SharePoint URL이 필요합니다');
    }

    if (!accessToken) {
      throw new AppError(400, 'Access Token이 필요합니다');
    }

    const info = await extractSharePointInfo(
      url,
      accessToken,
      fileName || 'AJ_Networks_면접_자동화.xlsx'
    );

    res.json({
      success: true,
      data: {
        ...info,
        // 환경 변수 형식으로도 제공
        envFormat: {
          SHAREPOINT_SITE_ID: info.siteId,
          SHAREPOINT_DRIVE_ID: info.driveId,
          SHAREPOINT_FILE_ID: info.fileId,
        },
      },
    });
  } catch (error: any) {
    logger.error('Error extracting SharePoint info:', error);
    throw new AppError(500, `정보 추출 실패: ${error.message}`);
  }
});

/**
 * SharePoint 토큰/설정 상태 확인 (REST API 사용 시 유용)
 * GET /api/sharepoint/status
 */
sharepointRouter.get('/status', adminAuth, async (req: Request, res: Response) => {
  const useSharePoint = process.env.SHAREPOINT_ENABLED === 'true';
  const useRestApi = process.env.SHAREPOINT_USE_REST_API === 'true';

  const base = {
    useSharePoint,
    useRestApi,
    hasEnvAccessToken: Boolean(process.env.SHAREPOINT_ACCESS_TOKEN),
    hasEnvRefreshToken: Boolean(process.env.SHAREPOINT_REFRESH_TOKEN),
    siteUrl: process.env.SHAREPOINT_SITE_URL || null,
    filePath: process.env.SHAREPOINT_FILE_PATH || null,
  };

  // dataService가 SharePointRestService인 경우 더 상세 정보 제공
  const svc = dataService as unknown as SharePointRestService;
  if (typeof (svc as any)?.getTokenStatus === 'function') {
    return res.json({
      success: true,
      data: {
        ...base,
        runtime: svc.getTokenStatus(),
      },
    });
  }

  return res.json({
    success: true,
    data: base,
  });
});

/**
 * (관리자용) Refresh Token으로 강제 갱신 시도
 * POST /api/sharepoint/refresh-now
 */
sharepointRouter.post('/refresh-now', adminAuth, async (req: Request, res: Response) => {
  try {
    const svc = dataService as unknown as SharePointRestService;
    if (typeof (svc as any)?.refreshNow !== 'function') {
      throw new AppError(400, '현재 데이터 스토리지가 SharePoint REST API가 아닙니다 (refresh-now 사용 불가)');
    }

    const result = await svc.refreshNow();
    return res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Error refreshing SharePoint token:', error);
    throw new AppError(500, `토큰 갱신 실패: ${error.message}`);
  }
});
