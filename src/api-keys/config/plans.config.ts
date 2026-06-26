import { Plan } from '../entities/api-key.entity';

export const PLAN_LIMITS: Record<Plan, {
  rateLimitPerMinute: number;
  burstLimitPerSecond: number;
}> = {
  [Plan.FREE]: {
    rateLimitPerMinute: 100,
    burstLimitPerSecond: 20,
  },
  [Plan.PAID]: {
    rateLimitPerMinute: 10000,
    burstLimitPerSecond: 200,
  },
};