import { HealthEngineService } from "./health-engine.service";
export declare class MonitoringController {
    private health;
    monitoring: any;
    constructor(health: HealthEngineService);
    recalc(): Promise<{
        ok: boolean;
        offlineMinutes: number;
        devices: number;
        online: number;
        degraded: number;
        offline: number;
        incidentsOpened: number;
        incidentsResolved: number;
    }>;
    summary(): any;
}
