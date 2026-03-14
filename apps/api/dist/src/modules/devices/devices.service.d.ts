import { PrismaService } from "../../prisma/prisma.module";
import { DeviceCreateDto } from "./dto/device-create.dto";
import { DeviceUpdateDto } from "./dto/evice-update.dto";
export declare class DevicesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(): Promise<{
        ok: boolean;
        items: {
            point: {
                city: {
                    id: string;
                    name: string;
                };
                id: string;
                name: string;
            } | null;
            id: string;
            name: string | null;
            health: import("@prisma/client").$Enums.DeviceHealth;
            lastSeenAt: Date | null;
            uid: string;
            isp: string | null;
            isActive: boolean;
            kind: import("@prisma/client").$Enums.DeviceKind;
            lastIp: string | null;
        }[];
    }>;
    getDetails(id: string): Promise<{
        ok: boolean;
        device: {
            point: ({
                city: {
                    id: string;
                    createdAt: Date;
                    name: string;
                    updatedAt: Date;
                };
            } & {
                id: string;
                deviceId: string | null;
                createdAt: Date;
                name: string;
                lat: import("@prisma/client/runtime/client").Decimal;
                lng: import("@prisma/client/runtime/client").Decimal;
                cityId: string;
                updatedAt: Date;
                health: import("@prisma/client").$Enums.DeviceHealth;
                lastSeenAt: Date | null;
            }) | null;
        } & {
            id: string;
            createdAt: Date;
            name: string | null;
            updatedAt: Date;
            health: import("@prisma/client").$Enums.DeviceHealth;
            lastSeenAt: Date | null;
            uid: string;
            isp: string | null;
            isActive: boolean;
            kind: import("@prisma/client").$Enums.DeviceKind;
            mikrotikHost: string | null;
            mikrotikPort: number | null;
            mikrotikAuthMethod: import("@prisma/client").$Enums.MikrotikAuthMethod | null;
            mikrotikUsername: string | null;
            mikrotikSecretRef: string | null;
            lastIp: string | null;
        };
        lastMeasurements: {
            downloadMbps: number;
            uploadMbps: number;
            pingMs: number;
            status: import("@prisma/client").$Enums.MeasurementStatus;
            packetLoss: number | null;
            jitterMs: number | null;
            id: string;
            deviceId: string;
            pointId: string | null;
            createdAt: Date;
        }[];
        lastIncidents: {
            status: import("@prisma/client").$Enums.IncidentStatus;
            id: string;
            deviceId: string | null;
            pointId: string | null;
            createdAt: Date;
            updatedAt: Date;
            type: import("@prisma/client").$Enums.IncidentType;
            severity: import("@prisma/client").$Enums.IncidentSeverity;
            title: string;
            details: import("@prisma/client/runtime/client").JsonValue | null;
            dedupKey: string;
            openedAt: Date;
            ackAt: Date | null;
            closedAt: Date | null;
        }[];
    }>;
    getMeasurements(deviceId: string, opts: {
        take: number;
        source?: "SERVER_CLI" | "MIKROTIK_REMOTE";
    }): Promise<{
        ok: boolean;
        items: {
            downloadMbps: number;
            uploadMbps: number;
            pingMs: number;
            status: import("@prisma/client").$Enums.MeasurementStatus;
            packetLoss: number | null;
            jitterMs: number | null;
            id: string;
            deviceId: string;
            pointId: string | null;
            createdAt: Date;
        }[];
    }>;
    create(dto: DeviceCreateDto): Promise<{
        ok: boolean;
        device: {
            id: string;
            createdAt: Date;
            name: string | null;
            updatedAt: Date;
            health: import("@prisma/client").$Enums.DeviceHealth;
            lastSeenAt: Date | null;
            uid: string;
            isp: string | null;
            isActive: boolean;
            kind: import("@prisma/client").$Enums.DeviceKind;
            mikrotikHost: string | null;
            mikrotikPort: number | null;
            mikrotikAuthMethod: import("@prisma/client").$Enums.MikrotikAuthMethod | null;
            mikrotikUsername: string | null;
            mikrotikSecretRef: string | null;
            lastIp: string | null;
        };
    }>;
    update(id: string, dto: DeviceUpdateDto): Promise<{
        ok: boolean;
        device: {
            id: string;
            createdAt: Date;
            name: string | null;
            updatedAt: Date;
            health: import("@prisma/client").$Enums.DeviceHealth;
            lastSeenAt: Date | null;
            uid: string;
            isp: string | null;
            isActive: boolean;
            kind: import("@prisma/client").$Enums.DeviceKind;
            mikrotikHost: string | null;
            mikrotikPort: number | null;
            mikrotikAuthMethod: import("@prisma/client").$Enums.MikrotikAuthMethod | null;
            mikrotikUsername: string | null;
            mikrotikSecretRef: string | null;
            lastIp: string | null;
        };
    }>;
    remove(id: string): Promise<{
        ok: boolean;
    }>;
}
