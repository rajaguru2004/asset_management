import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { USER_SAFE_SELECT } from '../common/selects/user.select';
import { EMPLOYEE } from '../common/rbac/permissions.enum';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  /** Self-signup — always creates an Employee (no self-elevation). */
  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (exists) throw new ConflictException('Email already registered');

    const password = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone ?? '',
        roleId: EMPLOYEE, // forced — role is never chosen at signup
      },
      select: USER_SAFE_SELECT,
    });

    return { user, accessToken: this.sign(user.id, user.roleId) };
  }

  async login(dto: LoginDto) {
    // Generic error message — no user enumeration.
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) throw new UnauthorizedException('Invalid email or password');

    const safe = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: USER_SAFE_SELECT,
    });
    return { user: safe, accessToken: this.sign(user.id, user.roleId) };
  }

  async getMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_SAFE_SELECT,
    });
    if (!user) throw new UnauthorizedException('Session invalid');
    return user;
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Session invalid');

    const ok = await bcrypt.compare(dto.currentPassword, user.password);
    if (!ok) throw new BadRequestException('Current password is incorrect');

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: await bcrypt.hash(dto.newPassword, 10) },
    });
    return { message: 'Password updated' };
  }

  private sign(sub: number, roleId: number): string {
    return this.jwt.sign({ sub, roleId });
  }
}
