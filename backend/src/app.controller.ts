import { Controller, Get, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // ✅ EXISTING API (DO NOT TOUCH)
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // ✅ EXISTING - simple image log (DO NOT TOUCH)
  @Post('upload-image')
  uploadImage(@Body() body: any) {
    console.log('📷 Image received length:', body.image?.length);

    return {
      message: 'Image received successfully',
    };
  }
}