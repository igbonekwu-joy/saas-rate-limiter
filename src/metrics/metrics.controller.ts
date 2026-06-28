import { Controller, Param, Sse } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Observable, interval, map } from 'rxjs';

@ApiTags('Metrics')
@Controller('metrics')
export class MetricsController {
    constructor(private readonly metricsService: MetricsService) {}

    // live metrics for one specific API key
    @Sse('live/:apiKeyId')
    @ApiOperation({
        summary: 'SSE stream of live metrics for a specific API key (pushes every second)',
    })
    @ApiParam({ name: 'apiKeyId', description: 'The API key UUID' })
    liveKeyMetrics(@Param('apiKeyId') apiKeyId: string): Observable<MessageEvent> {
        return interval(1000).pipe(       // fires every 1000ms (1 second)
            map(() => {
                const snapshot = this.metricsService.getAndResetKeySnapshot(apiKeyId);

                return {
                data: {
                    apiKeyId,
                    requestsPerSecond: snapshot.allowed,
                    rejectionsPerSecond: snapshot.rejected,
                    timestamp: new Date().toISOString(),
                },
                } as MessageEvent;
            }),
        );
    }

    // platform-wide live metrics across all keys
    @Sse('live')
    @ApiOperation({
        summary: 'SSE stream of platform-wide live metrics (pushes every second)',
    })
    livePlatformMetrics(): Observable<MessageEvent> {
        return interval(1000).pipe(
            map(() => {
                const snapshot = this.metricsService.getAndResetPlatformSnapshot();

                return {
                    data: {
                        totalRequestsPerSecond: snapshot.totalAllowed,
                        totalRejectionsPerSecond: snapshot.totalRejected,
                        activeKeys: snapshot.activeKeys,
                        timestamp: new Date().toISOString(),
                    },
                } as MessageEvent;
            }),
        );
    }
}
