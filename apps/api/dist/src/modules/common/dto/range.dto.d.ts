export declare const RANGE_KEYS: readonly ["1h", "24h", "7d", "30d"];
export type RangeKey = (typeof RANGE_KEYS)[number];
export declare class RangeQueryDto {
    range?: RangeKey;
}
export declare const METRIC_KEYS: readonly ["download", "upload", "ping"];
export type MetricKey = (typeof METRIC_KEYS)[number];
export declare class MapPointsQueryDto extends RangeQueryDto {
    metric?: MetricKey;
    city?: string;
}
