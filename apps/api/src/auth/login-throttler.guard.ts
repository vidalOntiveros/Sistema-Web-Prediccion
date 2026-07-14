import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

interface LoginRequestBody {
  email?: string;
}

// RF-05 / docs/06-diseno-api-rest.md §5.1: 5 intentos / 15 min por IP+email.
// Combinar ambos evita que un atacante rote de IP para tantear la misma cuenta,
// y evita que un solo IP compartido (NAT de la institución) bloquee a todos.
@Injectable()
export class LoginThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const ip = (req.ip as string) ?? 'unknown';
    const body = req.body as LoginRequestBody | undefined;
    const email = body?.email ?? 'unknown';
    return Promise.resolve(`${ip}:${email}`);
  }
}
