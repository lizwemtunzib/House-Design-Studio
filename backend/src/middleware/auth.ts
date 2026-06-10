import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    subscriptionTier: string;
  };
}

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  subscriptionTier: string;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, config.jwt.secret) as JWTPayload;
    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
      subscriptionTier: payload.subscriptionTier,
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

export function requirePro(req: AuthRequest, res: Response, next: NextFunction) {
  const tier = req.user?.subscriptionTier;
  if (tier !== 'PRO' && tier !== 'ENTERPRISE') {
    return res.status(403).json({
      error: 'Pro subscription required',
      upgradeUrl: '/pricing',
    });
  }
  next();
}
