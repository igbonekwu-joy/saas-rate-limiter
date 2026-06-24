import { ExecutionContext, HttpException, HttpStatus, Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ApiKey } from "../entities/api-key.entity";
import { Repository } from "typeorm";
import { RequestLogsService } from "src/request-logs/request-logs.service";

@Injectable()
export class ApiKeyGuard {
    constructor(
        @InjectRepository(ApiKey)
        private apiKeyRepository: Repository<ApiKey>,
        private readonly requestLogsService: RequestLogsService,
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
        const WINDOW_SECONDS = 60;
        const requestsCount = await this.requestLogsService.countRequestsInWindow(apiKey.id, WINDOW_SECONDS);

        // Reject if it's over the limit
        if (requestsCount >= apiKey.rateLimitPerMinute) {
            throw new HttpException(
                {
                statusCode: 429,
                message: 'Rate limit exceeded',
                limit: apiKey.rateLimitPerMinute,
                windowSeconds: WINDOW_SECONDS,
                currentCount: requestsCount,
                },
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }

        // Log request and allow it
        await this.requestLogsService.logRequest(apiKey.id);

        request.apiKey = apiKey;

        return true;
    }
}