import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { AddTeachersDto } from './dto/add-teachers.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { ListStudentsQueryDto } from './dto/list-students-query.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentsService } from './students.service';

@Controller('students')
export class StudentsController {
  constructor(
    private readonly studentsService: StudentsService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @RequirePermission('students:read:all', 'students:read:own')
  findAll(
    @Query() query: ListStudentsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.studentsService.findAll(query, user);
  }

  @Get(':id')
  @RequirePermission('students:read:all', 'students:read:own')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.studentsService.findOne(id, user);
  }

  @Post()
  @RequirePermission('students:write')
  async create(
    @Body() dto: CreateStudentDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const created = await this.studentsService.create(dto);
    await this.auditService.record(currentUser.id, 'STUDENT_CREATED', {
      studentId: created.id,
    });
    return created;
  }

  @Patch(':id')
  @RequirePermission('students:write')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const updated = await this.studentsService.update(id, dto);
    await this.auditService.record(currentUser.id, 'STUDENT_UPDATED', {
      studentId: id,
    });
    return updated;
  }

  @Post(':id/teachers')
  @RequirePermission('students:write')
  async addTeachers(
    @Param('id') id: string,
    @Body() dto: AddTeachersDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const updated = await this.studentsService.addTeachers(id, dto);
    await this.auditService.record(currentUser.id, 'STUDENT_TEACHERS_ADDED', {
      studentId: id,
      teacherIds: dto.teacherIds.join(','),
    });
    return updated;
  }

  @Delete(':id/teachers/:teacherId')
  @RequirePermission('students:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeTeacher(
    @Param('id') id: string,
    @Param('teacherId') teacherId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<void> {
    await this.studentsService.removeTeacher(id, teacherId);
    await this.auditService.record(currentUser.id, 'STUDENT_TEACHER_REMOVED', {
      studentId: id,
      teacherId,
    });
  }
}
