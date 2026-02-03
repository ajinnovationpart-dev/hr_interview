import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { adminAuth } from '../middlewares/auth.middleware';
import { AppError } from '../middlewares/errorHandler';
import { dataService } from '../services/dataService';
import { logger } from '../utils/logger';

export const roomsRouter = Router();

// 면접실 생성 스키마
const createRoomSchema = z.object({
  room_name: z.string().min(1, '면접실 이름을 입력해주세요'),
  location: z.string().min(1, '위치를 입력해주세요'),
  capacity: z.number().int().min(1, '수용 인원은 1명 이상이어야 합니다'),
  facilities: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

// 면접실 수정 스키마
const updateRoomSchema = z.object({
  room_name: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  capacity: z.number().int().min(1).optional(),
  facilities: z.array(z.string()).optional(),
  status: z.enum(['available', 'maintenance', 'reserved']).optional(),
  notes: z.string().optional(),
});

// 면접실 목록 조회
roomsRouter.get('/', adminAuth, async (req: Request, res: Response) => {
  try {
    const rooms = await dataService.getAllRooms();
    res.json({
      success: true,
      data: rooms,
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error getting rooms:', error);
    throw new AppError(500, '면접실 목록 조회 실패');
  }
});

// 면접실 상세 조회
roomsRouter.get('/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    const roomId = req.params.id;
    const room = await dataService.getRoomById(roomId);
    
    if (!room) {
      throw new AppError(404, '면접실을 찾을 수 없습니다');
    }
    
    res.json({
      success: true,
      data: room,
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error getting room:', error);
    throw new AppError(500, '면접실 조회 실패');
  }
});

// 면접실 등록
roomsRouter.post('/', adminAuth, async (req: Request, res: Response) => {
  try {
    const validated = createRoomSchema.parse(req.body);
    const roomId = `ROOM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await dataService.createRoom({
      room_id: roomId,
      room_name: validated.room_name,
      location: validated.location,
      capacity: validated.capacity,
      facilities: validated.facilities || [],
      status: 'available',
      notes: validated.notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    
    logger.info(`Room created: ${roomId}`);
    
    res.json({
      success: true,
      data: { room_id: roomId },
      message: '면접실이 등록되었습니다',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw error;
    }
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error creating room:', error);
    throw new AppError(500, '면접실 등록 실패');
  }
});

// 면접실 수정
roomsRouter.put('/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    const roomId = req.params.id;
    const validated = updateRoomSchema.parse(req.body);
    
    const room = await dataService.getRoomById(roomId);
    if (!room) {
      throw new AppError(404, '면접실을 찾을 수 없습니다');
    }
    
    await dataService.updateRoom(roomId, {
      ...validated,
      updated_at: new Date().toISOString(),
    });
    
    logger.info(`Room updated: ${roomId}`);
    
    res.json({
      success: true,
      message: '면접실 정보가 수정되었습니다',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw error;
    }
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error updating room:', error);
    throw new AppError(500, '면접실 수정 실패');
  }
});

// 면접실 삭제
roomsRouter.delete('/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    const roomId = req.params.id;
    
    const room = await dataService.getRoomById(roomId);
    if (!room) {
      throw new AppError(404, '면접실을 찾을 수 없습니다');
    }
    
    await dataService.deleteRoom(roomId);
    
    logger.info(`Room deleted: ${roomId}`);
    
    res.json({
      success: true,
      message: '면접실이 삭제되었습니다',
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error deleting room:', error);
    throw new AppError(500, '면접실 삭제 실패');
  }
});

// 면접실 가용성 조회
roomsRouter.get('/:id/availability', adminAuth, async (req: Request, res: Response) => {
  try {
    const roomId = req.params.id;
    const date = req.query.date as string;
    
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new AppError(400, '올바른 날짜 형식이 필요합니다 (YYYY-MM-DD)');
    }
    
    const room = await dataService.getRoomById(roomId);
    if (!room) {
      throw new AppError(404, '면접실을 찾을 수 없습니다');
    }
    
    const availability = await dataService.getRoomAvailability(roomId, date);
    
    res.json({
      success: true,
      data: {
        room,
        date,
        availableSlots: availability,
      },
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error getting room availability:', error);
    throw new AppError(500, '면접실 가용성 조회 실패');
  }
});
