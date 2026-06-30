import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { TestimonialsService } from './testimonials.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

class SubmitTestimonialDto {
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  message: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;
}

@Controller('testimonials')
export class TestimonialsController {
  constructor(private testimonialsService: TestimonialsService) {}

  // GET /testimonials — publik, hanya yang sudah di-approve
  @Get()
  async getApproved() {
    return this.testimonialsService.getApproved();
  }

  // GET /testimonials/mine — testimoni milik user yang login (apapun statusnya)
  @Get('mine')
  @UseGuards(JwtAuthGuard)
  async getMine(@CurrentUser() userId: string) {
    return this.testimonialsService.getMine(userId);
  }

  // POST /testimonials — submit atau update testimoni sendiri
  @Post()
  @UseGuards(JwtAuthGuard)
  async submit(@CurrentUser() userId: string, @Body() body: SubmitTestimonialDto) {
    return this.testimonialsService.submit(userId, body.message, body.rating);
  }
}
