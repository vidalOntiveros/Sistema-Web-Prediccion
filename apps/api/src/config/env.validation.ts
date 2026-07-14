import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  JWT_EXPIRES_IN: z.coerce.number().int().positive().default(7200),
  ML_SERVICE_URL: z.string().url(),
  ML_INTERNAL_API_KEY: z.string().min(1),
  ML_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  PORT: z.coerce.number().int().positive().default(3000),
});

export type EnvConfig = z.infer<typeof envSchema>;

// Falla el boot con un mensaje claro en vez de un 500 confuso más tarde
// (ver docs/07-diseno-modulos-nestjs.md §8).
export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(
      `Invalid environment configuration:\n${result.error.toString()}`,
    );
  }
  return result.data;
}
