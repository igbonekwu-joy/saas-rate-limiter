import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiKeyGuard } from './guards/rate-limit.guard';

@ApiTags('API Keys')
@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @ApiOperation({ summary: 'Generate a new API key for the authenticated user' })
  @ApiResponse({ status: 201, description: 'Key created successfully' })
  create(@Body() createApiKeyDto: CreateApiKeyDto, @Req() req) {
    const fakeUserId = '85b2ee76-9e91-4726-a4e2-4672f25110f1';
    return this.apiKeysService.create(createApiKeyDto, fakeUserId);
  }

  @Get('guard-test')
  @UseGuards(ApiKeyGuard)
  guardTest() {
    return { message: 'Protected route accessed successfully' };
  }

  @Get()
  findAll() {
    return this.apiKeysService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.apiKeysService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateApiKeyDto: UpdateApiKeyDto) {
    return this.apiKeysService.update(+id, updateApiKeyDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.apiKeysService.remove(+id);
  }
}
