import { Injectable } from '@nestjs/common';
import { RateLimitCounter } from './entities/rate-limit-counter.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class RateLimitCountersService {
    constructor(
        @InjectRepository(RateLimitCounter)
        private counterRepository: Repository<RateLimitCounter>,
    ) {}

    private getCurrentBucket(): Date {
        const now = new Date();
        now.setSeconds(0, 0); // set to the beginning of the minute (11:45 AM -> 11:00 AM)
        return now;
    }

    private getPreviousBucket(): Date {
        const prev = this.getCurrentBucket();
        prev.setMinutes(prev.getMinutes() - 1); // go back by one minute
        return prev;
    }

    private getOverlapRatio(): number {
        const secondsIntoCurrentBucket = new Date().getSeconds();

        // check how much of the previous bucket is still in the 60s window
        return (60 - secondsIntoCurrentBucket) / 60;
    }

    async incrementAndCheck(
        apiKeyId: string, limit: number
    ): Promise<{ allowed: boolean, currentCount: number, limit: number }> {
        const currentBucket = this.getCurrentBucket();
        const prevBucket = this.getPreviousBucket();

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
        const overlapRatio = this.getOverlapRatio(); 

        const estimatedCount = Math.ceil(
            previousCount * overlapRatio + currentCount
        );

        return {
            allowed: estimatedCount < limit,
            currentCount,
            limit
        }
    }

    // delete old buckets older than 2 minutes
    // automatically runs every minute
    @Cron(CronExpression.EVERY_MINUTE)
    async deleteOldBuckets(): Promise<void> {
        const cutOff = new Date(Date.now() - 2 * 60 * 1000);
        await this.counterRepository
            .createQueryBuilder()
            .delete()
            .where('bucketTime < :cutOff', { cutOff })
            .execute();
    }
}

// shouldn't overlap be multiplied by 100?
// why is count not in ""
