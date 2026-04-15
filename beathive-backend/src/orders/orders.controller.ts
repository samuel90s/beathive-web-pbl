// src/orders/orders.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  RawBodyRequest,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrdersService, CreateOrderDto } from './orders.service';
import { WebhookService } from './webhook.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('orders')
export class OrdersController {
  constructor(
    private ordersService: OrdersService,
    private webhookService: WebhookService,
  ) {}

  // POST /orders  — buat order baru
  @Post()
  @UseGuards(JwtAuthGuard)
  async createOrder(
    @CurrentUser() userId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.createOrder(userId, dto);
  }

  // GET /orders/me  — riwayat order user
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyOrders(@CurrentUser() userId: string) {
    return this.ordersService.getMyOrders(userId);
  }

  // POST /orders/webhook/midtrans  — callback dari Midtrans
  // Endpoint ini TIDAK pakai JWT — Midtrans yang panggil
  // Verifikasi dilakukan via signature di WebhookService
  @Post('webhook/midtrans')
  @HttpCode(HttpStatus.OK)
  async midtransWebhook(@Body() payload: any) {
    return this.webhookService.handleMidtransWebhook(payload);
  }
}
