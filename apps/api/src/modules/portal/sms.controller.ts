import { Body, Get, Post, Patch, Param, Controller } from "@nestjs/common";
import { SmsService } from "../portal/sms.service";

@Controller("sms")
export class SmsController {
    constructor(private readonly smsService: SmsService) { }

    @Get("balance")
    getBalance() {
        return this.smsService.getBalance();
    }

    @Get("topups")
    getTopups() {
        return this.smsService.getTopups();
    }

    @Post("topups")
    createTopup(@Body() dto: { amount: number }) {
        return this.smsService.createTopup(dto.amount);
    }

    @Patch("topups/:id/complete")
    complete(@Param("id") id: string) {
        return this.smsService.completeTopup(id);
    }
}