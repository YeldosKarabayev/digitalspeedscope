import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";

type SendOtpResult = {
  ok: true;
  provider: "mobizon";
  providerMessageId?: string;
};

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  async sendOtp(phone: string, code: string): Promise<SendOtpResult> {
    const message = `DigitalSpeedScope коды: ${code}`;

    if (process.env.NODE_ENV !== "production") {
      this.logger.log(`[DEV SMS] ${phone}: ${message}`);
      return { ok: true, provider: "mobizon" };
    }

    const provider = process.env.SMS_PROVIDER ?? "mobizon";

    if (provider !== "mobizon") {
      throw new InternalServerErrorException("Unsupported SMS provider");
    }

    return this.sendViaMobizon(phone, message);
  }

  private async sendViaMobizon(
    phone: string,
    message: string,
  ): Promise<SendOtpResult> {
    const apiKey = process.env.SMS_MOBIZON_API_KEY;
    const from = process.env.SMS_MOBIZON_FROM;
    const baseUrl =
      process.env.SMS_MOBIZON_BASE_URL ?? "https://api.mobizon.kz/service";

    if (!apiKey) {
      throw new InternalServerErrorException("SMS_MOBIZON_API_KEY is not configured");
    }

    const body = new URLSearchParams({
      output: "json",
      apiKey,
      recipient: phone,
      text: message,
      ...(from ? { from } : {}),
    });

    const res = await fetch(`${baseUrl}/Message/SendSmsMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const text = await res.text();
    let json: any = null;

    try {
      json = JSON.parse(text);
    } catch {
      throw new InternalServerErrorException(
        `Mobizon invalid response: ${text || res.status}`,
      );
    }

    if (!res.ok) {
      throw new InternalServerErrorException(
        `Mobizon HTTP error: ${res.status}`,
      );
    }

    // У Mobizon код 0 = успех
    if (json?.code !== 0) {
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