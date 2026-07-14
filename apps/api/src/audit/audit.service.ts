import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Llamada explícita desde cada service en el punto exacto de la acción sensible,
// sin interceptor global automático (decisión de docs/07-diseno-modulos-nestjs.md §3.5).
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(
    userId: string | null,
    action: string,
    metadata: Record<string, string | number | boolean | null> = {},
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: { userId, action, metadata },
    });
  }
}
