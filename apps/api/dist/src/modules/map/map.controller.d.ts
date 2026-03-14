import { MapService } from "./map.service";
import { RangeQueryDto } from "../common/dto/range.dto";
declare class MapPointsQueryDto extends RangeQueryDto {
    metric?: "download" | "upload" | "ping";
    city?: string;
}
export declare class MapController {
    private readonly service;
    constructor(service: MapService);
    points(q: MapPointsQueryDto): Promise<{
        range: "1h" | "24h" | "7d" | "30d";
        city: string;
        points: {
            id: string;
            name: string;
            city: string;
            lat: number;
            lng: number;
            download: number;
            upload: number;
            ping: number;
            isp: string | undefined;
            deviceUid: string | undefined;
            lastSeen: string;
        }[];
    }>;
}
export {};
