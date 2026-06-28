import { ExecutionContext, HttpException, HttpStatus, Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ApiKey } from "../entities/api-key.entity";
import { Repository } from "typeorm";
import { RequestLogsService } from "src/request-logs/request-logs.service";
import { ConfigService } from "@nestjs/config";
import { RateLimitException } from '../../common/exceptions/rate-limit.exception';
import { RateLimitCountersService } from "src/rate-limit-counters/rate-limit-counters.service";
import { EventEmitter2 } from "@nestjs/event-emitter";

@Injectable()
export class ApiKeyGuard {
    constructor(
        @InjectRepository(ApiKey)
        private apiKeyRepository: Repository<ApiKey>,
        private rateLimitCountersService: RateLimitCountersService,
        private readonly requestLogsService: RequestLogsService,
        private eventEmitter: EventEmitter2,
        private config: ConfigService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const providedKey = request.headers['x-api-key'];

        // Identify the caller
        if(!providedKey) {
            throw new HttpException(
                'Missing X-API-Key header',
                HttpStatus.UNAUTHORIZED,
            );
        }

        const apiKey = await this.apiKeyRepository.findOne({ 
            where: { key: providedKey },
            relations: { user: true }
        });

        if(!apiKey) {
            throw new HttpException('Invalid API key', HttpStatus.UNAUTHORIZED);
        }

        // Count requests in current window
        // const WINDOW_SECONDS = this.config.get<number>('WINDOW_SECONDS', 60);
        // const requestsCount = await this.requestLogsService.countRequestsInWindow(apiKey.id, WINDOW_SECONDS);

        // // Reject if it's over the limit
        // if (requestsCount >= apiKey.rateLimitPerMinute) {
        //     throw new HttpException(
        //         {
        //         statusCode: 429,
        //         message: 'Rate limit exceeded',
        //         limit: apiKey.rateLimitPerMinute,
        //         windowSeconds: WINDOW_SECONDS,
        //         currentCount: requestsCount,
        //         },
        //         HttpStatus.TOO_MANY_REQUESTS,
        //     );
        // }

        // // Log request and allow it
        // await this.requestLogsService.logRequest(apiKey.id);

        // this single call replaces separate count + log
        // check per-minute limit
        const minuteCheck = await this.rateLimitCountersService.incrementAndCheck(
            apiKey.id + ':minute', 
            apiKey.rateLimitPerMinute,
            60
        );

        if (!minuteCheck.allowed) {
            await this.rateLimitCountersService.recordRejection(apiKey.id + ':minute', 60);

            // emit rejection event for SSE stream
            this.eventEmitter.emit('request.rejected', {
                apiKeyId: apiKey.id,
                reason: 'per-minute limit',
                timestamp: new Date(),
            });

            throw new RateLimitException(minuteCheck, 'minute');
        }

        // check burst limit
        const burstCheck = await this.rateLimitCountersService.incrementAndCheck(
            apiKey.id + ':burst', // different namespace from the minute check
            apiKey.burstLimitPerSecond,
            1,
        );

        if (!burstCheck.allowed) {
            await this.rateLimitCountersService.recordRejection(apiKey.id + ':burst', 1);

            this.eventEmitter.emit('request.rejected', {
                apiKeyId: apiKey.id,
                reason: 'burst limit',
                timestamp: new Date(),
            });

            throw new RateLimitException(burstCheck, 'burst');
        }

        // emit allowed event for SSE stream
        this.eventEmitter.emit('request.allowed', {
            apiKeyId: apiKey.id,
            remaining: minuteCheck.remaining,
            timestamp: new Date(),
        });

        // attach results to request so the interceptor can set headers
        request.rateLimitResults = {
            minute: minuteCheck,
            burst: burstCheck,
        };

        request.apiKey = apiKey;

        return true;
    }
}