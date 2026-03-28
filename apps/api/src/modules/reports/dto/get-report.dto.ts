export class GetReportDto {
  from?: string; // дата
  to?: string;

  pointId?: string;
  phone?: string;

  page?: number;
  limit?: number;
}