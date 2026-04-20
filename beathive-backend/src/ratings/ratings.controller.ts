import { Controller, Get, Post, Delete, Body, Param, UseGuards, Optional, HttpCode, HttpStatus } from '@nestjs/common';
import { RatingsService } from './ratings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('ratings')
export class RatingsController {
  constructor(private ratingsService: RatingsService) {}

  // GET /ratings/sound/:soundId
  @Get('sound/:soundId')
  async getSoundRatings(@Param('soundId') soundId: string) {
    return this.ratingsService.getSoundRatings(soundId);
  }

  // GET /ratings/sound/:soundId/mine  — requires auth
  @Get('sound/:soundId/mine')
  @UseGuards(JwtAuthGuard)
  async getMyRating(@CurrentUser() userId: string, @Param('soundId') soundId: string) {
    return this.ratingsService.getUserRating(userId, soundId);
  }

  // POST /ratings  — requires auth
  @Post()
  @UseGuards(JwtAuthGuard)
  async createOrUpdate(
    @CurrentUser() userId: string,
    @Body() body: { soundId: string; score: number; reviewText?: string },
  ) {
    return this.ratingsService.createOrUpdate(userId, body.soundId, body.score, body.reviewText);
  }

  // DELETE /ratings/:soundId  — requires auth
  @Delete(':soundId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteRating(@CurrentUser() userId: string, @Param('soundId') soundId: string) {
    return this.ratingsService.deleteRating(userId, soundId);
  }
}
