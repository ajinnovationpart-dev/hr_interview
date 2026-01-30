import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { errorHandler } from './middlewares/errorHandler';
import { authRouter } from './routes/auth.routes';
import { interviewRouter } from './routes/interview.routes';
import { interviewerRouter } from './routes/interviewer.routes';
import { confirmRouter } from './routes/confirm.routes';
import { configRouter } from './routes/config.routes';
import { sharepointRouter } from './routes/sharepoint.routes';
import { schedulerService } from './services/scheduler.service';

// 데이터 저장소 선택 (환경 변수로 제어)
const useSharePoint = process.env.SHAREPOINT_ENABLED === 'true';
if (useSharePoint) {
  logger.info('Using SharePoint Excel as data storage');
} else {
  logger.info('Using Google Sheets as data storage');
}

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS 설정 (개발 환경에서는 모든 origin 허용)
const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : [
      'http://localhost:5173', 
      'http://192.10.10.76:5173',
      'https://ajinnovationpart-dev.github.io', // GitHub Pages
    ];

app.use(cors({
  origin: (origin, callback) => {
    // 개발 환경에서는 모든 origin 허용
    if (process.env.NODE_ENV === 'development') {
      callback(null, true);
      return;
    }
    
    // origin이 없으면 (예: Postman, curl 등) 허용
    if (!origin) {
      callback(null, true);
      return;
    }
    
    // 프로덕션에서는 허용된 origin만 허용
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use('/api', limiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/interviews', interviewRouter);
app.use('/api/interviewers', interviewerRouter);
app.use('/api/confirm', confirmRouter);
app.use('/api/config', configRouter);
app.use('/api/sharepoint', sharepointRouter);

// Error handler
app.use(errorHandler);

// Uncaught Exception 핸들러 (서버가 종료되지 않도록)
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', {
    message: error.message,
    stack: error.stack,
    name: error.name,
  });
  // 서버를 종료하지 않고 계속 실행
  // 프로덕션에서는 서버 재시작을 고려할 수 있음
});

// Unhandled Rejection 핸들러
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection:', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  // 서버를 종료하지 않고 계속 실행
});

// SIGTERM, SIGINT 핸들러 (Graceful shutdown)
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  schedulerService.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  schedulerService.stop();
  process.exit(0);
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server is running on port ${PORT}`);
  logger.info(`Access from network: http://[YOUR_IP]:${PORT}`);
  
  // Start scheduler
  schedulerService.start();
  logger.info('Scheduler service started');
});

// Graceful shutdown을 위한 서버 종료 함수
const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully...`);
  
  server.close(() => {
    logger.info('HTTP server closed');
    schedulerService.stop();
    process.exit(0);
  });
  
  // 강제 종료 타임아웃 (10초)
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};
