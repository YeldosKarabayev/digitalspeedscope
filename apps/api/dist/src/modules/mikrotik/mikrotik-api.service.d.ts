export type MikrotikConnParams = {
    host: string;
    port?: number;
    username: string;
    password: string;
    timeoutMs?: number;
};
export declare class MikrotikApiService {
    exec(params: MikrotikConnParams, sentence: string[], timeoutMs?: number): Promise<any[]>;
}
