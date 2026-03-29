import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";



type SendOtpResult = {
  ok: true;
  provider: "mobizon";
  providerMessageId?: string;
};

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly prisma: PrismaService) {
    console.log("PRISMA:", prisma);
  }

  async sendOtp(phone: string, code: string): Promise<SendOtpResult> {
    const message = `Код DigitalSpeedScope: ${code}`;

    const provider = process.env.SMS_PROVIDER ?? "mobizon";

    if (provider !== "mobizon") {
      throw new InternalServerErrorException("Unsupported SMS provider");
    }

    return this.sendViaMobizon(phone, message);
  }

  async getTopups() {
    return this.prisma.smsTopupRequest.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  async createTopup(amount: number) {
    if (!amount || amount <= 0) {
      throw new Error("Некорректная сумма");
    }

    return this.prisma.smsTopupRequest.create({
      data: { amount },
    });
  }

  async completeTopup(id: string) {
    return this.prisma.smsTopupRequest.update({
      where: { id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });
  }

  async getBalance() {
    const apiKey = process.env.SMS_MOBIZON_API_KEY;
    const baseUrl =
      process.env.SMS_MOBIZON_BASE_URL ?? "https://api.mobizon.kz/service";

    const url = `${baseUrl}/User/GetOwnBalance?apiKey=${apiKey}&output=json`;

    const res = await fetch(url);
    const raw = await res.text();

    let json: any;
    try {
      json = JSON.parse(raw);
    } catch {
      throw new Error("Invalid Mobizon response");
    }

    if (json.code !== 0) {
      throw new Error(json.message || "Mobizon error");
    }

    return {
      balance: json.data.balance,
      currency: json.data.currency,
    };
  }

  private async sendViaMobizon(
    phone: string,
    message: string,
  ): Promise<SendOtpResult> {
    const apiKey = process.env.SMS_MOBIZON_API_KEY;
    const from = process.env.SMS_MOBIZON_FROM?.trim();
    const baseUrl =
      process.env.SMS_MOBIZON_BASE_URL ?? "https://api.mobizon.kz/service";

    if (!apiKey) {
      throw new InternalServerErrorException(
        "SMS_MOBIZON_API_KEY is not configured",
      );
    }

    const recipient = phone.replace(/\D/g, "");
    if (!/^7\d{10}$/.test(recipient)) {
      throw new InternalServerErrorException(
        "Recipient phone must be in 7XXXXXXXXXX format",
      );
    }

    const body = new URLSearchParams({
      output: "json",
      apiKey,
      recipient,
      text: message,
      "params[validity]": "60",
    });

    if (from) {
      body.set("from", from);
    }

    const res = await fetch(`${baseUrl}/Message/SendSmsMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const raw = await res.text();

    let json: any;
    try {
      json = JSON.parse(raw);
    } catch {
      this.logger.error(`Mobizon invalid JSON: ${raw}`);
      throw new InternalServerErrorException("Mobizon returned invalid response");
    }

    if (!res.ok) {
      this.logger.error(`Mobizon HTTP ${res.status}: ${raw}`);
      throw new InternalServerErrorException(
        `Mobizon HTTP error: ${res.status}`,
      );
    }

    if (json?.code !== 0) {
      this.logger.error(`Mobizon API error: ${raw}`);
      throw new InternalServerErrorException(
        `Mobizon API error: ${json?.message || "unknown error"}`,
      );
    }

    return {
      ok: true,
      provider: "mobizon",
      providerMessageId: String(json?.data?.messageId ?? ""),
    };
  }
}