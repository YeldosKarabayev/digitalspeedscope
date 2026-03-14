import { RangeQueryDto } from "../../common/dto/range.dto";
export declare class MeasurementsQueryDto extends RangeQueryDto {
    q?: string;
    city?: string;
    status?: "EXCELLENT" | "GOOD" | "FAIR" | "POOR";
    deviceUid?: string;
    limit?: number;
    offset?: number;
}
