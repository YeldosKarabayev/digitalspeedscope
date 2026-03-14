import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
export declare class AuthController {
    private service;
    constructor(service: AuthService);
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
    refresh(body: {
        refreshToken: string;
    }): Promise<{
        ok: boolean;
        accessToken: string;
        refreshToken: string;
    }>;
    me(req: any): Promise<{
        ok: boolean;
        user: {
            id: any;
            email: any;
            name: any;
            role: any;
            isActive: any;
        };
    }>;
}
