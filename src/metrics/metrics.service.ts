import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { RateLimitCounter } from 'src/rate-limit-counters/entities/rate-limit-counter.entity';
import { Repository } from 'typeorm';

interface KeyMetrics {
  allowed: number;      // requests allowed in the last second
  rejected: number;     // requests rejected in the last second
  lastUpdated: Date;
}

@Injectable()
export class MetricsService {
    // in-memory store: apiKeyId → rolling counts
    private counters = new Map<string, KeyMetrics>();

    constructor(
        @InjectRepository(RateLimitCounter)
        private counterRepository: Repository<RateLimitCounter>,
    ) {}

    /** event listeners **/
    @OnEvent('request.allowed')
    handleAllowed(payload: { apiKeyId: string; remaining: number }) {
        this.increment(payload.apiKeyId, 'allowed');
    }

    @OnEvent('request.rejected')
    handleRejected(payload: { apiKeyId: string; reason: string }) {
        this.increment(payload.apiKeyId, 'rejected');
    }

    private increment(apiKeyId: string, type: 'allowed' | 'rejected') {
        const existing = this.counters.get(apiKeyId) ?? {
            allowed: 0,
            rejected: 0,
            lastUpdated: new Date(),
        };

        this.counters.set(apiKeyId, {
            ...existing,
            [type]: existing[type] + 1,
            lastUpdated: new Date(),
        });
    }

    /**snapshots */

    // get live snapshot for one key and reset its counters
    // (reset after reading so each SSE push shows the delta since last push)
    getAndResetKeySnapshot(apiKeyId: string): KeyMetrics {
        const current = this.counters.get(apiKeyId) ?? {
            allowed: 0,
            rejected: 0,
            lastUpdated: new Date(),
        };

        // reset counters for this key after reading
        this.counters.set(apiKeyId, {
            allowed: 0,
            rejected: 0,
            lastUpdated: new Date(),
        });

        return current;
    }

    // get platform-wide snapshot across all keys
    getAndResetPlatformSnapshot(): {
        totalAllowed: number;
        totalRejected: number;
        activeKeys: number;
    } {
        let totalAllowed = 0;
        let totalRejected = 0;
        let activeKeys = 0;

        for (const [, metrics] of this.counters) {
            if (metrics.allowed > 0 || metrics.rejected > 0) {
                totalAllowed += metrics.allowed;
                totalRejected += metrics.rejected;
                activeKeys++;
            }
        }

        // reset all counters after reading
        for (const [key] of this.counters) {
            this.counters.set(key, {
                allowed: 0,
                rejected: 0,
                lastUpdated: new Date(),
            });
        }

        return { totalAllowed, totalRejected, activeKeys };
    }
}
