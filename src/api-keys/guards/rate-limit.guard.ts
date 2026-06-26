import { ExecutionContext, HttpException, HttpStatus, Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ApiKey } from "../entities/api-key.entity";
import { Repository } from "typeorm";
import { RequestLogsService } from "src/request-logs/request-logs.service";
import { config } from "process";
import { ConfigService } from "@nestjs/config";
import { RateLimitCountersService } from "src/rate-limit-counters/rate-limit-counters.service";

@Injectable()
export class ApiKeyGuard {
    constructor(
        @InjectRepository(ApiKey)
        private apiKeyRepository: Repository<ApiKey>,
        private rateLimitCountersService: RateLimitCountersService,
        private readonly requestLogsService: RequestLogsService,
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
            throw new HttpException(
                {
                    statusCode: 429,
                    message: 'Rate limit exceeded',
                    limit: apiKey.rateLimitPerMinute,
                    windowSeconds: this.config.get<number>('WINDOW_SECONDS', 60),
                    currentCount: minuteCheck.currentCount,
                },
                HttpStatus.TOO_MANY_REQUESTS
            )
        }

        // check burst limit
        const burstCheck = await this.rateLimitCountersService.incrementAndCheck(
            apiKey.id + ':burst', // different namespace from the minute check
            apiKey.burstLimitPerSecond,
            1,
        );

        if (!burstCheck.allowed) {
            throw new HttpException(
                {
                    statusCode: 429,
                    message: 'Burst limit exceeded. Too many requests in a single second',
                    limit: burstCheck.limit,
                    currentCount: burstCheck.currentCount,
                    windowSeconds: 1,
                },
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }

        // attach results to request so the interceptor can set headers
        request.rateLimitResults = {
            minute: minuteCheck,
            burst: burstCheck,
        };

        request.apiKey = apiKey;

        return true;
    }
}