import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AnalyticsRollup } from './entities/analytics-rollup.entity';
import { Repository } from 'typeorm';
import { RateLimitCounter } from 'src/rate-limit-counters/entities/rate-limit-counter.entity';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class AnalyticsService {
    constructor(
        @InjectRepository(AnalyticsRollup)
        private rollupRepository: Repository<AnalyticsRollup>,
        @InjectRepository(RateLimitCounter)
        private counterRepository: Repository<RateLimitCounter>,
    ) {}

    // rollup job
    @Cron('0 */5 * * * *') // every 5 minutes
    async computeRollups(): Promise<void> {
        // look at the last 2 hours of raw counter data
        // (2 hours to catch any buckets that were missed in the last run)
        const since = new Date(Date.now() - 2 * 60 * 60 * 1000);

        // aggregate raw counters into per-key per-hour summaries
        const rows = await this.counterRepository.query(
        `SELECT
            "apiKeyId",
            DATE_TRUNC('hour', "bucketTime") AS "hourBucket",
            SUM(count)          AS "totalRequests",
            SUM("rejectedCount") AS "totalRejections"
        FROM rate_limit_counter
        WHERE "bucketTime" >= $1
            AND namespace = 'minute'
        GROUP BY "apiKeyId", DATE_TRUNC('hour', "bucketTime")`,
        [since],
        );

        // upsert each summary row into the rollup table
        for (const row of rows) {
            await this.rollupRepository.query(
                `INSERT INTO analytics_rollup ("apiKeyId", "hourBucket", "totalRequests", "totalRejections", "updatedAt")
                VALUES ($1, $2, $3, $4, NOW())
                ON CONFLICT ("apiKeyId", "hourBucket")
                DO UPDATE SET
                "totalRequests"   = EXCLUDED."totalRequests",
                "totalRejections" = EXCLUDED."totalRejections",
                "updatedAt"       = NOW()`,
                [row.apiKeyId, row.hourBucket, row.totalRequests, row.totalRejections],
            );

            // stamp every raw counter row that contributed to this rollup
            await this.counterRepository.query(
                `UPDATE rate_limit_counter
                SET "rolledUpAt" = NOW()
                WHERE "apiKeyId" = $1
                    AND DATE_TRUNC('hour', "bucketTime") = $2
                    AND namespace = 'minute'
                    AND "rolledUpAt" IS NULL`,
                [row.apiKeyId, row.hourBucket],
            );
        }
    }

    // requests per hour for a specific key (last 24 hours)
    async getUsageByKey(apiKeyId: string) {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const rows = await this.rollupRepository
            .createQueryBuilder('r')
            .select('r.hourBucket', 'hour')
            .addSelect('r.totalRequests', 'requests')
            .addSelect('r.totalRejections', 'rejections')
            .where('r.apiKeyId = :apiKeyId', { apiKeyId })
            .andWhere('r.hourBucket >= :since', { since })
            .orderBy('r.hourBucket', 'ASC')
            .getRawMany();

        return {
            apiKeyId,
            windowHours: 24,
            data: rows,
        };
    }

    // top 10 keys by total request volume (last 24 hours)
    async getTopKeys() {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const rows = await this.rollupRepository
            .createQueryBuilder('r')
            .select('r.apiKeyId', 'apiKeyId')
            .addSelect('SUM(r.totalRequests)', 'totalRequests')
            .addSelect('SUM(r.totalRejections)', 'totalRejections')
            .where('r.hourBucket >= :since', { since })
            .groupBy('r.apiKeyId')
            .orderBy('"totalRequests"', 'DESC')
            .limit(10)
            .getRawMany();

        return {
            windowHours: 24,
            data: rows,
        };
    }

    // rejection rate for a specific key (last 24 hours)
    async getRejectionRate(apiKeyId: string) {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const row = await this.rollupRepository
            .createQueryBuilder('r')
            .select('SUM(r.totalRequests)', 'totalRequests')
            .addSelect('SUM(r.totalRejections)', 'totalRejections')
            .where('r.apiKeyId = :apiKeyId', { apiKeyId })
            .andWhere('r.hourBucket >= :since', { since })
            .getRawOne();

        const total = parseInt(row.totalRequests ?? '0');
        const rejected = parseInt(row.totalRejections ?? '0');
        const allowed = total - rejected;
        const rejectionRate = total === 0
        ? 0
        : Math.round((rejected / total) * 100 * 100) / 100; // 2 decimal places

        return {
            apiKeyId,
            windowHours: 24,
            totalRequests: total,
            allowedRequests: allowed,
            rejectedRequests: rejected,
            rejectionRatePercent: rejectionRate,
        };
    }

    // platform-wide overview
    async getOverview() {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const row = await this.rollupRepository
            .createQueryBuilder('r')
            .select('SUM(r.totalRequests)', 'totalRequests')
            .addSelect('SUM(r.totalRejections)', 'totalRejections')
            .addSelect('COUNT(DISTINCT r.apiKeyId)', 'activeKeys')
            .where('r.hourBucket >= :since', { since })
            .getRawOne();

        const total = parseInt(row.totalRequests ?? '0');
        const rejected = parseInt(row.totalRejections ?? '0');

        return {
            windowHours: 24,
            totalRequests: total,
            allowedRequests: total - rejected,
            rejectedRequests: rejected,
            activeKeys: parseInt(row.activeKeys ?? '0'),
            rejectionRatePercent: total === 0
                ? 0
                : Math.round((rejected / total) * 100 * 100) / 100,
        };
    }
}
