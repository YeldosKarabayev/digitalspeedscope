import { Injectable, UnauthorizedException, ForbiddenException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";

function safeUser(u: any) {
  return { id: u.id, email: u.email, name: u.name, role: u.role, isActive: u.isActive };
}

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user) throw new UnauthorizedException("Неверный email или пароль");
    if (!user.isActive) throw new ForbiddenException("Аккаунт отключен");

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Неверный email или пароль");

    const payload = { sub: user.id, role: user.role, email: user.email };

    const accessToken = await this.jwt.signAsync(payload, { expiresIn: "15m" });
    const refreshToken = await this.jwt.signAsync(payload, { expiresIn: "30d" });

    return { ok: true, accessToken, refreshToken, user: safeUser(user) };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return { ok: true, user: safeUser(user) };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwt.verifyAsync(refreshToken);
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || !user.isActive) throw new UnauthorizedException();

      const nextPayload = { sub: user.id, role: user.role, email: user.email };
      const accessToken = await this.jwt.signAsync(nextPayload, { expiresIn: "15m" });
      const nextRefresh = await this.jwt.signAsync(nextPayload, { expiresIn: "30d" });

      return { ok: true, accessToken, refreshToken: nextRefresh };
    } catch {
      throw new UnauthorizedException("Refresh token недействителен");
    }
  }
}
