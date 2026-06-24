import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RequestLogsService } from './request-logs.service';
import { CreateRequestLogDto } from './dto/create-request-log.dto';
import { UpdateRequestLogDto } from './dto/update-request-log.dto';

@Controller('request-logs')
export class RequestLogsController {
  constructor(private readonly requestLogsService: RequestLogsService) {}

  @Post()
  create(@Body() createRequestLogDto: CreateRequestLogDto) {
    return this.requestLogsService.create(createRequestLogDto);
  }

  @Get()
  findAll() {
    return this.requestLogsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.requestLogsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRequestLogDto: UpdateRequestLogDto) {
    return this.requestLogsService.update(+id, updateRequestLogDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.requestLogsService.remove(+id);
  }
}
