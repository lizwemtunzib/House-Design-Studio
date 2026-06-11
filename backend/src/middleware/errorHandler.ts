import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { config } from '../config';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: err.errors[0]?.message ?? 'Invalid request',
      issues: err.errors,
    });
  }

  // Prisma errors
  if (err.constructor.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as any;
    if (prismaErr.code === 'P2002') {
      return res.status(409).json({ error: 'Record already exists', field: prismaErr.meta?.target });
    }
    if (prismaErr.code === 'P2025') {
      return res.status(404).json({ error: 'Record not found' });
    }
  }

  console.error('[ERROR]', err);

  res.status(500).json({
    error: config.isDev() ? err.message : 'Internal server error',
    ...(config.isDev() && { stack: err.stack }),
  });
}
