import { Injectable } from "@nestjs/common";
import { RouterOSClient } from "mikro-routeros";

export type MikrotikConnParams = {
  host: string;
  port?: number;
  username: string;
  password: string;
  timeoutMs?: number;
};

type RosQueryParams = Record<string, string | number | boolean>;

function sentenceToQuery(sentence: string[]) {
  const command = sentence[0];
  const params: RosQueryParams = {};

  for (const part of sentence.slice(1)) {
    if (!part.startsWith("=")) continue;

    const s = part.slice(1);
    const idx = s.indexOf("=");
    if (idx <= 0) continue;

    const key = s.slice(0, idx);
    const value = s.slice(idx + 1);
    params[key] = value;
  }

  return { command, params };
}

@Injectable()
export class MikrotikApiService {
  async exec(
    params: MikrotikConnParams,
    sentence: string[],
    timeoutMs: number = 30_000,
  ) {
    const timeout = timeoutMs ?? params.timeoutMs ?? 30_000;
    const client = new RouterOSClient(
      params.host,
      params.port ?? 8728,
      timeout,
    );

    try {
      await client.connect();
      await client.login(params.username, params.password);

      const { command, params: q } = sentenceToQuery(sentence);
      const result = await client.runQuery(command, q);

      return result;
    } finally {
      try {
        client.close();
      } catch {}
    }
  }
}