export type DeviceCreateDto = {
  uid: string;
  name?: string | null;
  isp?: string | null;
  isActive?: boolean;
  kind?: "GENERIC" | "MIKROTIK";

  mikrotikHost?: string | null;
  mikrotikPort?: number | null;
  mikrotikAuthMethod?: "API" | "SSH" | null;
  mikrotikUsername?: string | null;
  mikrotikSecretRef?: string | null;

  pointId?: string | null; // если хочешь сразу привязать к Point
};