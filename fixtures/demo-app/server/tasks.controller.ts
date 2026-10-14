import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';

@Controller('api/tasks')
export class TasksController {
  @Get()
  findAll() {
    return [];
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return { id };
  }

  @Post()
  create(@Body() body: unknown) {
    return body;
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return { id };
  }
}
