import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ContactUsService } from './contact-us.service';
import { CreateContactSubmissionDto } from './dto/create-contact-us.dto';
import { UpdateContactSubmissionDto } from './dto/update-contact-us.dto';
import { ContactSubmissionResponseDto } from './dto/contact-us-response.dto';
import { BaseResponseDto } from '../shared/dto/base-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ContactStatus, ContactSubject } from './entities/contact-us.entity';
import { Request } from 'express';

@ApiTags('Contact Us')
@Controller('contact-us')
export class ContactUsController {
  constructor(private readonly contactUsService: ContactUsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit a contact form (Public)' })
  @ApiResponse({
    status: 201,
    description: 'Contact submission created successfully',
    type: BaseResponseDto<ContactSubmissionResponseDto>,
  })
  async create(
    @Body() createDto: CreateContactSubmissionDto,
    @Req() request: Request,
  ): Promise<BaseResponseDto<ContactSubmissionResponseDto>> {
    const ipAddress =
      request.headers['x-forwarded-for']?.toString().split(',')[0] ||
      request.socket.remoteAddress ||
      '';
    const userAgent = request.headers['user-agent'] || '';

    const data = await this.contactUsService.create(
      createDto,
      ipAddress,
      userAgent,
    );

    return {
      success: true,
      data,
      message:
        'Your message has been sent successfully! We will get back to you soon.',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all contact submissions (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ContactStatus })
  @ApiQuery({ name: 'subject', required: false, enum: ContactSubject })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Contact submissions retrieved successfully',
  })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: ContactStatus,
    @Query('subject') subject?: string,
    @Query('search') search?: string,
  ) {
    const result = await this.contactUsService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      status,
      subject,
      search,
    );

    return {
      success: true,
      data: result,
      message: 'Contact submissions retrieved successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('admin/statistics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get contact statistics (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getStatistics() {
    const data = await this.contactUsService.getStatistics();

    return {
      success: true,
      data,
      message: 'Statistics retrieved successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('admin/recent')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get recent contact submissions (Admin only)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Recent submissions retrieved successfully',
  })
  async getRecent(@Query('limit') limit?: string) {
    const data = await this.contactUsService.getRecent(
      limit ? parseInt(limit) : 10,
    );

    return {
      success: true,
      data,
      message: 'Recent submissions retrieved successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get a contact submission by ID (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Contact submission retrieved successfully',
    type: BaseResponseDto<ContactSubmissionResponseDto>,
  })
  async findOne(
    @Param('id') id: string,
  ): Promise<BaseResponseDto<ContactSubmissionResponseDto>> {
    const data = await this.contactUsService.findOne(id);

    return {
      success: true,
      data,
      message: 'Contact submission retrieved successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Put('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a contact submission (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Contact submission updated successfully',
    type: BaseResponseDto<ContactSubmissionResponseDto>,
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateContactSubmissionDto,
  ): Promise<BaseResponseDto<ContactSubmissionResponseDto>> {
    const data = await this.contactUsService.update(id, updateDto);

    return {
      success: true,
      data,
      message: 'Contact submission updated successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Put('admin/:id/mark-read')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Mark submission as read (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Submission marked as read',
    type: BaseResponseDto<ContactSubmissionResponseDto>,
  })
  async markAsRead(
    @Param('id') id: string,
  ): Promise<BaseResponseDto<ContactSubmissionResponseDto>> {
    const data = await this.contactUsService.markAsRead(id);

    return {
      success: true,
      data,
      message: 'Submission marked as read',
      timestamp: new Date().toISOString(),
    };
  }

  @Put('admin/:id/mark-unread')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Mark submission as unread (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Submission marked as unread',
    type: BaseResponseDto<ContactSubmissionResponseDto>,
  })
  async markAsUnread(
    @Param('id') id: string,
  ): Promise<BaseResponseDto<ContactSubmissionResponseDto>> {
    const data = await this.contactUsService.markAsUnread(id);

    return {
      success: true,
      data,
      message: 'Submission marked as unread',
      timestamp: new Date().toISOString(),
    };
  }

  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a contact submission (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Contact submission deleted successfully',
  })
  async remove(@Param('id') id: string) {
    await this.contactUsService.remove(id);

    return {
      success: true,
      data: null,
      message: 'Contact submission deleted successfully',
      timestamp: new Date().toISOString(),
    };
  }
}
