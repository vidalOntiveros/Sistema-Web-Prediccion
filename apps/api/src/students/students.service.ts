import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { DatasetColumnsService } from '../dataset-columns/dataset-columns.service';
import { paginate, PaginatedResponse } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { validateExtraData } from '../common/validate-extra-data';
import { AddTeachersDto } from './dto/add-teachers.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { ListStudentsQueryDto } from './dto/list-students-query.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentScopeService } from './scope/student-scope.service';
import {
  ControlNumberAlreadyExistsException,
  ExtraDataValidationException,
  StudentNotFoundException,
  TeacherNotFoundException,
} from './students.exceptions';

export interface StudentListItem {
  id: string;
  controlNumber: string;
  fullName: string;
  career: string;
  semester: number;
  status: string;
  teacherCount: number;
}

export interface StudentDetail {
  id: string;
  controlNumber: string;
  fullName: string;
  career: string;
  semester: number;
  status: string;
  extraData: Record<string, unknown>;
  teachers: { id: string; fullName: string }[];
  latestPrediction: {
    id: string;
    riskLevel: string;
    score: number;
    createdAt: Date;
  } | null;
}

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: StudentScopeService,
    private readonly datasetColumnsService: DatasetColumnsService,
  ) {}

  async findAll(
    query: ListStudentsQueryDto,
    user: AuthenticatedUser,
  ): Promise<PaginatedResponse<StudentListItem>> {
    const where = {
      ...this.scopeService.resolve(user),
      ...(query.career ? { career: query.career } : {}),
      ...(query.semester !== undefined ? { semester: query.semester } : {}),
      ...(query.controlNumber ? { controlNumber: query.controlNumber } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.teacherId
        ? { teachers: { some: { teacherId: query.teacherId } } }
        : {}),
      ...(query.search
        ? {
            OR: [
              {
                fullName: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                controlNumber: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };

    const [students, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        include: { _count: { select: { teachers: true } } },
        orderBy: { fullName: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.student.count({ where }),
    ]);

    return paginate(
      students.map((student) => ({
        id: student.id,
        controlNumber: student.controlNumber,
        fullName: student.fullName,
        career: student.career,
        semester: student.semester,
        status: student.status,
        teacherCount: student._count.teachers,
      })),
      total,
      query.page,
      query.pageSize,
    );
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<StudentDetail> {
    const student = await this.prisma.student.findFirst({
      where: { id, ...this.scopeService.resolve(user) },
      include: { teachers: { include: { teacher: true } } },
    });
    if (!student) {
      throw new StudentNotFoundException();
    }

    const latestPrediction = await this.prisma.prediction.findFirst({
      where: { studentId: id },
      orderBy: { createdAt: 'desc' },
    });

    return this.toDetail(student, latestPrediction);
  }

  async create(dto: CreateStudentDto): Promise<StudentDetail> {
    await this.assertControlNumberAvailable(dto.controlNumber);
    const extraData = await this.validateExtraDataOrThrow(dto.extraData ?? {});

    const student = await this.prisma.student.create({
      data: {
        controlNumber: dto.controlNumber,
        fullName: dto.fullName,
        career: dto.career,
        semester: dto.semester,
        status: dto.status ?? 'active',
        extraData: extraData as Prisma.InputJsonValue,
      },
      include: { teachers: { include: { teacher: true } } },
    });

    return this.toDetail(student, null);
  }

  async update(id: string, dto: UpdateStudentDto): Promise<StudentDetail> {
    const existing = await this.findByIdOrThrow(id);

    const mergedExtraData = dto.extraData
      ? await this.validateExtraDataOrThrow({
          ...(existing.extraData as Record<string, unknown>),
          ...dto.extraData,
        })
      : undefined;

    const student = await this.prisma.student.update({
      where: { id },
      data: {
        fullName: dto.fullName,
        career: dto.career,
        semester: dto.semester,
        status: dto.status,
        ...(mergedExtraData !== undefined
          ? { extraData: mergedExtraData as Prisma.InputJsonValue }
          : {}),
      },
      include: { teachers: { include: { teacher: true } } },
    });

    const latestPrediction = await this.prisma.prediction.findFirst({
      where: { studentId: id },
      orderBy: { createdAt: 'desc' },
    });

    return this.toDetail(student, latestPrediction);
  }

  async addTeachers(id: string, dto: AddTeachersDto): Promise<StudentDetail> {
    await this.findByIdOrThrow(id);

    const teachers = await this.prisma.user.findMany({
      where: { id: { in: dto.teacherIds } },
    });
    if (teachers.length !== dto.teacherIds.length) {
      throw new TeacherNotFoundException();
    }

    await this.prisma.teacherStudent.createMany({
      data: dto.teacherIds.map((teacherId) => ({ teacherId, studentId: id })),
      skipDuplicates: true,
    });

    const student = await this.prisma.student.findUniqueOrThrow({
      where: { id },
      include: { teachers: { include: { teacher: true } } },
    });
    const latestPrediction = await this.prisma.prediction.findFirst({
      where: { studentId: id },
      orderBy: { createdAt: 'desc' },
    });

    return this.toDetail(student, latestPrediction);
  }

  async removeTeacher(id: string, teacherId: string): Promise<void> {
    await this.prisma.teacherStudent.deleteMany({
      where: { studentId: id, teacherId },
    });
  }

  private async validateExtraDataOrThrow(
    input: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const catalog = await this.datasetColumnsService.findActiveCatalog();
    const { data, errors } = validateExtraData(catalog, input);
    if (errors.length > 0) {
      throw new ExtraDataValidationException(errors);
    }
    return data;
  }

  private async assertControlNumberAvailable(
    controlNumber: string,
  ): Promise<void> {
    const existing = await this.prisma.student.findUnique({
      where: { controlNumber },
    });
    if (existing) {
      throw new ControlNumberAlreadyExistsException();
    }
  }

  private async findByIdOrThrow(id: string) {
    const student = await this.prisma.student.findUnique({ where: { id } });
    if (!student) {
      throw new StudentNotFoundException();
    }
    return student;
  }

  private toDetail(
    student: {
      id: string;
      controlNumber: string;
      fullName: string;
      career: string;
      semester: number;
      status: string;
      extraData: unknown;
      teachers: { teacher: { id: string; fullName: string } }[];
    },
    latestPrediction: {
      id: string;
      riskLevel: string;
      score: number;
      createdAt: Date;
    } | null,
  ): StudentDetail {
    return {
      id: student.id,
      controlNumber: student.controlNumber,
      fullName: student.fullName,
      career: student.career,
      semester: student.semester,
      status: student.status,
      extraData: student.extraData as Record<string, unknown>,
      teachers: student.teachers.map((t) => ({
        id: t.teacher.id,
        fullName: t.teacher.fullName,
      })),
      latestPrediction: latestPrediction
        ? {
            id: latestPrediction.id,
            riskLevel: latestPrediction.riskLevel,
            score: latestPrediction.score,
            createdAt: latestPrediction.createdAt,
          }
        : null,
    };
  }
}
