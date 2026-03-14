import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
export declare class AuthService {
    private prisma;
    private jwt;
    constructor(prisma: PrismaService, jwt: JwtService);
    login(dto: LoginDto): Promise<{
        ok: boolean;
        accessToken: string;
        refreshToken: string;
        user: {
            id: any;
            email: any;
            name: any;
            role: any;
            isActive: any;
        };
    }>;
    me(userId: string): Promise<{
        ok: boolean;
        user: {
            id: any;
            email: any;
            name: any;
            role: any;
            isActive: any;
        };
    }>;
    refresh(refreshToken: string): Promise<{
        ok: boolean;
        accessToken: string;
        refreshToken: string;
    }>;
}
