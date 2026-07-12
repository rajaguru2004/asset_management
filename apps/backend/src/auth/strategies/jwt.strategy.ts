import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { USER_SAFE_SELECT } from '../../common/selects/user.select';

interface JwtPayload {
  sub: number;
  roleId: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        config.get<string>('JWT_SECRET') || 'asset-management-secret-key-2026',
    });
  }

  /**
   * Runs on every authenticated request. Reads the user fresh from the DB so
   * role changes (promotions/deactivations) take effect immediately — this is
   * what makes live promotion work without a re-login. The returned object
   * becomes `req.user`.
   */
  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: USER_SAFE_SELECT,
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account not found or inactive');
    }
    return user;
  }
}
