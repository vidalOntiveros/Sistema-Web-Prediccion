// Seed de roles/permisos/matriz (docs/06-diseno-api-rest.md §4.1) + un usuario
// Administrador inicial, para poder iniciar sesión en un ambiente recién migrado.
// Se corre con `pnpm exec prisma db seed`.
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { generateTemporaryPassword } from '../src/common/generate-temporary-password';
import { PrismaClient } from '../src/generated/prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const PERMISSIONS: { key: string; description: string }[] = [
  { key: 'users:read', description: 'Ver usuarios' },
  {
    key: 'users:write',
    description: 'Crear/editar/(des)activar usuarios, asignar rol, resetear contraseña',
  },
  { key: 'roles:read', description: 'Ver catálogo de roles y permisos' },
  { key: 'roles:manage', description: 'Crear/editar roles y su matriz de permisos (v2)' },
  { key: 'students:read:all', description: 'Ver todos los estudiantes' },
  { key: 'students:read:own', description: 'Ver solo estudiantes asignados (Docente)' },
  { key: 'students:write', description: 'Crear/editar estudiantes, asignar/quitar docentes' },
  { key: 'datasets:upload', description: 'Cargar datasets' },
  { key: 'datasets:read', description: 'Ver historial de cargas' },
  { key: 'dataset-columns:manage', description: 'Editar catálogo de columnas del dataset (v2)' },
  { key: 'predictions:run:all', description: 'Ejecutar predicción sobre cualquier estudiante' },
  {
    key: 'predictions:run:own',
    description: 'Ejecutar predicción solo sobre estudiantes asignados',
  },
  {
    key: 'predictions:read:all',
    description: 'Ver historial de predicciones de cualquier estudiante',
  },
  { key: 'predictions:read:own', description: 'Ver historial solo de estudiantes asignados' },
  { key: 'dashboard:read', description: 'Ver estadísticas agregadas' },
  { key: 'reports:export', description: 'Exportar reportes' },
  { key: 'config:read', description: 'Ver parámetros del sistema' },
  { key: 'config:manage', description: 'Editar parámetros del sistema' },
  { key: 'audit:read', description: 'Ver bitácora de auditoría' },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  Administrador: PERMISSIONS.map((permission) => permission.key),
  Coordinador: [
    'users:read',
    'students:read:all',
    'students:write',
    'datasets:upload',
    'datasets:read',
    'predictions:run:all',
    'predictions:read:all',
    'dashboard:read',
    'reports:export',
  ],
  Docente: ['students:read:own', 'predictions:run:own', 'predictions:read:own'],
};

async function seedPermissions() {
  console.log('Seeding permissions...');
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: { description: permission.description },
      create: permission,
    });
  }
}

async function seedRoles() {
  console.log('Seeding roles + matriz de permisos...');
  for (const roleName of Object.keys(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });

    const permissions = await prisma.permission.findMany({
      where: { key: { in: ROLE_PERMISSIONS[roleName] } },
    });

    for (const permission of permissions) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }
}

async function seedAdminUser() {
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'Administrador' } });
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@itmazatlan.edu.mx';

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existingAdmin) {
    console.log(`El usuario admin (${adminEmail}) ya existe, no se modifica.`);
    return;
  }

  const temporaryPassword = process.env.SEED_ADMIN_PASSWORD ?? generateTemporaryPassword();
  const passwordHash = await argon2.hash(temporaryPassword);

  await prisma.user.create({
    data: {
      email: adminEmail,
      fullName: 'Administrador del sistema',
      passwordHash,
      roles: { create: { roleId: adminRole.id } },
    },
  });

  console.log(`Usuario admin creado: ${adminEmail} / ${temporaryPassword}`);
  console.log('Guarda esta contraseña — no se vuelve a mostrar.');
}

async function main() {
  await seedPermissions();
  await seedRoles();
  await seedAdminUser();
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
