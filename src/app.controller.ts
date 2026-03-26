import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';
import { EmailService } from './shared/services/email.service';
import { SendJobOfferDto } from './dto/send-job-offer.dto';
import { BaseResponseDto } from './shared/dto/base-response.dto';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly emailService: EmailService,
  ) {}

  @Get()
  @ApiTags('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'API is running' })
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('send-job-offer')
  @HttpCode(HttpStatus.OK)
  @ApiTags('Job Offer')
  @ApiOperation({ summary: 'Send professional job offer email for Backend position' })
  @ApiResponse({
    status: 200,
    description: 'Job offer email sent successfully',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Job offer sent successfully' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid email address' })
  @ApiResponse({ status: 500, description: 'Failed to send email' })
  async sendJobOffer(
    @Body() dto: SendJobOfferDto,
  ): Promise<BaseResponseDto<null>> {
    await this.emailService.sendJobOfferEmail(dto.email);
    return BaseResponseDto.success('Job offer sent successfully');
  }
}
