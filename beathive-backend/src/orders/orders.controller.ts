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
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrdersService, CreateOrderDto } from './orders.service';
import { WebhookService } from './webhook.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('orders')
export class OrdersController {
  constructor(
    private ordersService: OrdersService,
    private webhookService: WebhookService,
    private config: ConfigService,
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

  // POST /orders/verify-payment  — frontend panggil di onSuccess snap
  @Post('verify-payment')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async verifyPayment(
    @CurrentUser() userId: string,
    @Body() body: { orderId: string },
  ) {
    return this.ordersService.verifyAndActivateOrder(userId, body.orderId);
  }

  // POST /orders/webhook/midtrans  — callback dari Midtrans
  // Endpoint ini TIDAK pakai JWT — Midtrans yang panggil
  // Verifikasi dilakukan via signature di WebhookService
  @Post('webhook/midtrans')
  @HttpCode(HttpStatus.OK)
  async midtransWebhook(@Body() payload: any) {
    return this.webhookService.handleMidtransWebhook(payload);
  }

  // ─── DEV ONLY: Simulate payment success ──────────────────
  // POST /orders/dev/simulate-payment
  // Body: { orderId: "SUB-xxx-xxx" } or { orderId: "regular-order-id" }
  // Hanya bisa digunakan di NODE_ENV !== production
  @Post('dev/simulate-payment')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async devSimulatePayment(@Body() body: { orderId: string }) {
    if (this.config.get('NODE_ENV') === 'production') {
      throw new ForbiddenException('Endpoint ini tidak tersedia di production');
    }
    return this.webhookService.devSimulatePayment(body.orderId);
  }
}
