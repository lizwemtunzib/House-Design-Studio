import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '8080', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  adminEmails: (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),

  database: {
    url: process.env.DATABASE_URL || '',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: 'claude-opus-4-8',
    planningModel: 'claude-sonnet-4-6',
  },

  imageGen: {
    provider: (process.env.IMAGE_GEN_PROVIDER || 'mock') as 'openai' | 'stability' | 'replicate' | 'mock',
    openaiKey: process.env.OPENAI_API_KEY || '',
    stabilityKey: process.env.STABILITY_API_KEY || '',
    replicateToken: process.env.REPLICATE_API_TOKEN || '',
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    plans: {
      pro: process.env.STRIPE_PLAN_PRO || 'price_pro',
      enterprise: process.env.STRIPE_PLAN_ENTERPRISE || 'price_enterprise',
    },
  },

  upload: {
    maxSizeMB: parseInt(process.env.MAX_UPLOAD_SIZE_MB || '10', 10),
  },

  isDev: () => config.nodeEnv === 'development',
  isProd: () => config.nodeEnv === 'production',
};
