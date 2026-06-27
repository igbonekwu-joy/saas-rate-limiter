import { Injectable } from '@nestjs/common';
import { RateLimitCounter } from './entities/rate-limit-counter.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  currentCount: number;
  remaining: number;
  resetAt: Date;       // when the current bucket resets
  retryAfter: number;  // seconds to wait (only meaningful when blocked)
}

@Injectable()
export class RateLimitCountersService {
    constructor(
        @InjectRepository(RateLimitCounter)
        private counterRepository: Repository<RateLimitCounter>,
    ) {}

    private getCurrentBucket(windowSeconds: number): Date {
        const now: any = new Date();
        // now.setSeconds(0, 0); // set to the beginning of the minute (11:45 AM -> 11:00 AM)
        // return now;

        // the windowSeconds is now dynamic
        // floor to the nearest bucket boundary
        // e.g. for 60s: 12:00:45 → 12:00:00
        // e.g. for 1s:  12:00:45.300 → 12:00:45.000
        const bucketMs = windowSeconds * 1000;
        return new Date(Math.floor(now / bucketMs) * bucketMs);
    }

    private getPreviousBucket(windowSeconds: number): Date {
        // const prev = this.getCurrentBucket();
        // prev.setMinutes(prev.getMinutes() - 1); // go back by one minute
        // return prev;

        const current = this.getCurrentBucket(windowSeconds);
        return new Date(current.getTime() - windowSeconds * 1000);
    }

    private getOverlapRatio(windowSeconds: number): number {
        // const secondsIntoCurrentBucket = new Date().getSeconds();

        // // check how much of the previous bucket is still in the 60s window
        // return (60 - secondsIntoCurrentBucket) / 60;

        const bucketMs = windowSeconds * 1000;
        const msIntoBucket = Date.now() % bucketMs;
        return (bucketMs - msIntoBucket) / bucketMs;
    }

    async incrementAndCheck(
        apiKeyId: string, 
        limit: number,
        windowSeconds:number
    ): Promise<RateLimitResult> {
        const currentBucket = this.getCurrentBucket(windowSeconds);
        const prevBucket = this.getPreviousBucket(windowSeconds);

        // upsert. insert count = 1 or increment by 1 if it exists.
        await this.counterRepository.query(
            `INSERT INTO rate_limit_counter ("apiKeyId", "bucketTime", count)
            VALUES ($1, $2, 1)
            ON CONFLICT ("apiKeyId", "bucketTime")
            DO UPDATE SET count = rate_limit_counter.count + 1`,
            [apiKeyId, currentBucket]
        );

        const [currentRow, previousRow] = await Promise.all([
            this.counterRepository.findOne({
                where: { apiKeyId, bucketTime: currentBucket },
            }),
            this.counterRepository.findOne({
                where: { apiKeyId, bucketTime: prevBucket },
            }),
        ]);

        const currentCount = currentRow?.count ?? 0;
        const previousCount = previousRow?.count ?? 0;
        const overlapRatio = this.getOverlapRatio(windowSeconds); 

        const estimatedCount = Math.ceil(
            previousCount * overlapRatio + currentCount
        );

        // when does the current bucket end? that's when the window resets
        const resetAt = new Date(
            currentBucket.getTime() + windowSeconds * 1000,
        );

        const remaining = Math.max(0, limit - estimatedCount);
        const retryAfter = Math.ceil(
            (resetAt.getTime() - Date.now()) / 1000,
        );

        return {
            allowed: estimatedCount < limit,
            currentCount: estimatedCount,
            limit,
            remaining,
            resetAt,
            retryAfter,
        }
    }

    async recordRejection(
        apiKeyId: string,
        windowSeconds: number = 60,
    ): Promise<void> {
        const currentBucket = this.getCurrentBucket(windowSeconds);

        await this.counterRepository.query(
            `INSERT INTO rate_limit_counter ("apiKeyId", "bucketTime", count, "rejectedCount")
            VALUES ($1, $2, 0, 1)
            ON CONFLICT ("apiKeyId", "bucketTime")
            DO UPDATE SET "rejectedCount" = rate_limit_counter."rejectedCount" + 1`,
            [apiKeyId, currentBucket],
        );
    }

    // delete old buckets that have been rolled up
    // automatically runs every minute
    @Cron(CronExpression.EVERY_MINUTE)
    async deleteOldBuckets(): Promise<void> {
        //const cutOff = new Date(Date.now() - 3 *60 * 60 * 1000);
        await this.counterRepository
            .createQueryBuilder()
            .delete()
            .where('"rolledUpAt" IS NOT NULL')
            .execute();
    }
}
