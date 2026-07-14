import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginThrottlerGuard } from './login-throttler.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  @Public()
  @UseGuards(LoginThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.auditService.record(user.id, 'LOGOUT');
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user.id);
  }
}
