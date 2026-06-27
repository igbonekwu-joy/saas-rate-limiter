import { Controller, Get, Param } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

@Controller('analytics')
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) {}

    @Get('overview')
    @ApiOperation({ summary: 'Platform-wide stats for the last 24 hours' })
    @ApiResponse({ status: 200, description: 'Overview stats' })
    getOverview() {
        return this.analyticsService.getOverview();
    }

    @Get('top-keys')
    @ApiOperation({ summary: 'Top 10 API keys by request volume (last 24 hours)' })
    @ApiResponse({ status: 200, description: 'Ranked list of keys' })
    getTopKeys() {
        return this.analyticsService.getTopKeys();
    }

    @Get('usage/:apiKeyId')
    @ApiOperation({ summary: 'Hourly usage breakdown for a specific key (last 24 hours)' })
    @ApiParam({ name: 'apiKeyId', description: 'The API key UUID' })
    @ApiResponse({ status: 200, description: 'Hourly usage data' })
    getUsage(@Param('apiKeyId') apiKeyId: string) {
        return this.analyticsService.getUsageByKey(apiKeyId);
    }

    @Get('rejection-rate/:apiKeyId')
    @ApiOperation({ summary: 'Rejection rate for a specific key (last 24 hours)' })
    @ApiParam({ name: 'apiKeyId', description: 'The API key UUID' })
    @ApiResponse({ status: 200, description: 'Rejection rate stats' })
    getRejectionRate(@Param('apiKeyId') apiKeyId: string) {
        return this.analyticsService.getRejectionRate(apiKeyId);
    }
}
