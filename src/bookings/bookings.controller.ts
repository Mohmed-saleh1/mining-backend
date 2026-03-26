import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import {
  SendPaymentAddressDto,
  MarkPaymentSentDto,
} from './dto/update-booking.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import {
  CreateReceivingAddressDto,
  UpdateReceivingAddressDto,
} from './dto/receiving-address.dto';
import {
  BookingResponseDto,
  BookingStatisticsDto,
} from './dto/booking-response.dto';
import { BaseResponseDto } from '../shared/dto/base-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { RequestUser } from '../auth/interfaces/jwt-payload.interface';
import { BookingStatus } from './entities/booking.entity';

@ApiTags('Bookings')
@Controller('bookings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  // ==================== USER ENDPOINTS ====================

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new booking request (User)' })
  @ApiResponse({
    status: 201,
    description: 'Booking created successfully',
    type: BaseResponseDto<BookingResponseDto>,
  })
  async create(
    @CurrentUser() user: RequestUser,
    @Body() createDto: CreateBookingDto,
  ): Promise<BaseResponseDto<BookingResponseDto>> {
    const data = await this.bookingsService.create(user.userId, createDto);

    return {
      success: true,
      data: data as any,
      message:
        'Booking request created successfully. Please wait for admin to provide payment details.',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('my-bookings')
  @ApiOperation({ summary: 'Get all bookings for current user' })
  @ApiResponse({
    status: 200,
    description: 'User bookings retrieved successfully',
  })
  async getMyBookings(@CurrentUser() user: RequestUser) {
    const data = await this.bookingsService.findAllForUser(user.userId);

    return {
      success: true,
      data,
      message: 'Bookings retrieved successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('receiving-addresses')
  @ApiOperation({
    summary:
      'Get active booking receiving addresses with network type (User/Admin/Manager)',
  })
  async getReceivingAddresses() {
    const data = await this.bookingsService.getReceivingAddresses(false);

    return {
      success: true,
      data,
      message: 'Receiving addresses retrieved successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('my-bookings/analytics')
  @ApiOperation({ summary: 'Get booking analytics for current user' })
  @ApiResponse({
    status: 200,
    description: 'Analytics retrieved successfully',
  })
  async getMyBookingsAnalytics(@CurrentUser() user: RequestUser) {
    const data = await this.bookingsService.getUserAnalytics(user.userId);

    return {
      success: true,
      data,
      message: 'Analytics retrieved successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('my-bookings/:id')
  @ApiOperation({ summary: 'Get a specific booking for current user' })
  @ApiResponse({
    status: 200,
    description: 'Booking retrieved successfully',
    type: BaseResponseDto<BookingResponseDto>,
  })
  async getMyBooking(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ): Promise<BaseResponseDto<BookingResponseDto>> {
    const data = await this.bookingsService.findOne(id, user.userId);

    return {
      success: true,
      data: data as any,
      message: 'Booking retrieved successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Put('my-bookings/:id/mark-payment-sent')
  @ApiOperation({ summary: 'Mark payment as sent (User)' })
  @ApiResponse({
    status: 200,
    description: 'Payment marked as sent',
    type: BaseResponseDto<BookingResponseDto>,
  })
  async markPaymentSent(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: MarkPaymentSentDto,
  ): Promise<BaseResponseDto<BookingResponseDto>> {
    const data = await this.bookingsService.markPaymentSent(
      id,
      user.userId,
      dto,
    );

    return {
      success: true,
      data: data as any,
      message: 'Payment marked as sent. Admin will review and approve.',
      timestamp: new Date().toISOString(),
    };
  }

  @Put('my-bookings/:id/cancel')
  @ApiOperation({ summary: 'Cancel a booking (User)' })
  @ApiResponse({
    status: 200,
    description: 'Booking cancelled',
    type: BaseResponseDto<BookingResponseDto>,
  })
  async cancelBooking(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ): Promise<BaseResponseDto<BookingResponseDto>> {
    const data = await this.bookingsService.cancelBooking(id, user.userId);

    return {
      success: true,
      data: data as any,
      message: 'Booking cancelled successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('my-bookings/:id/messages')
  @ApiOperation({ summary: 'Send a message in booking chat (User)' })
  @ApiResponse({
    status: 201,
    description: 'Message sent successfully',
  })
  async sendUserMessage(
    @CurrentUser() user: RequestUser,
    @Param('id') bookingId: string,
    @Body() dto: CreateMessageDto,
  ) {
    const data = await this.bookingsService.sendMessage(
      bookingId,
      user.userId,
      dto,
      false,
    );

    return {
      success: true,
      data,
      message: 'Message sent successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('my-bookings/:id/messages/image')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload payment screenshot in booking chat (User)',
  })
  @ApiResponse({
    status: 201,
    description: 'Image message sent successfully',
  })
  async sendUserImageMessage(
    @CurrentUser() user: RequestUser,
    @Param('id') bookingId: string,
    @UploadedFile() image: Express.Multer.File,
    @Body('content') content?: string,
  ) {
    const data = await this.bookingsService.sendImageMessage(
      bookingId,
      user.userId,
      image,
      content,
      false,
    );

    return {
      success: true,
      data,
      message: 'Image message sent successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('my-bookings/:id/messages')
  @ApiOperation({ summary: 'Get messages for a booking (User)' })
  @ApiResponse({
    status: 200,
    description: 'Messages retrieved successfully',
  })
  async getUserMessages(
    @CurrentUser() user: RequestUser,
    @Param('id') bookingId: string,
  ) {
    const data = await this.bookingsService.getMessages(
      bookingId,
      user.userId,
      false,
    );

    return {
      success: true,
      data,
      message: 'Messages retrieved successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Put('my-bookings/:id/messages/mark-read')
  @ApiOperation({ summary: 'Mark messages as read (User)' })
  @ApiResponse({
    status: 200,
    description: 'Messages marked as read',
  })
  async markUserMessagesRead(
    @CurrentUser() user: RequestUser,
    @Param('id') bookingId: string,
  ) {
    await this.bookingsService.markMessagesAsRead(
      bookingId,
      user.userId,
      false,
    );

    return {
      success: true,
      data: null,
      message: 'Messages marked as read',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread message count (User)' })
  @ApiResponse({
    status: 200,
    description: 'Unread count retrieved',
  })
  async getUnreadCount(@CurrentUser() user: RequestUser) {
    const count = await this.bookingsService.getUnreadCount(user.userId, false);

    return {
      success: true,
      data: { count },
      message: 'Unread count retrieved',
      timestamp: new Date().toISOString(),
    };
  }

  // ==================== ADMIN ENDPOINTS ====================

  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get all bookings (Admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: BookingStatus })
  @ApiResponse({
    status: 200,
    description: 'All bookings retrieved successfully',
  })
  async getAllBookings(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: BookingStatus,
  ) {
    const data = await this.bookingsService.findAllForAdmin(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      status,
    );

    return {
      success: true,
      data,
      message: 'Bookings retrieved successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('admin/statistics')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get booking statistics (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    type: BaseResponseDto<BookingStatisticsDto>,
  })
  async getStatistics(): Promise<BaseResponseDto<BookingStatisticsDto>> {
    const data = await this.bookingsService.getStatistics();

    return {
      success: true,
      data,
      message: 'Statistics retrieved successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('admin/unread-count')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get unread message count (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Unread count retrieved',
  })
  async getAdminUnreadCount(@CurrentUser() user: RequestUser) {
    const count = await this.bookingsService.getUnreadCount(user.userId, true);

    return {
      success: true,
      data: { count },
      message: 'Unread count retrieved',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('admin/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get a specific booking (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Booking retrieved successfully',
    type: BaseResponseDto<BookingResponseDto>,
  })
  async getBooking(
    @Param('id') id: string,
  ): Promise<BaseResponseDto<BookingResponseDto>> {
    const data = await this.bookingsService.findOne(id, undefined, true);

    return {
      success: true,
      data: data as any,
      message: 'Booking retrieved successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Put('admin/:id/send-payment-address')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Send payment address to user (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Payment address sent',
    type: BaseResponseDto<BookingResponseDto>,
  })
  async sendPaymentAddress(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: SendPaymentAddressDto,
  ): Promise<BaseResponseDto<BookingResponseDto>> {
    const data = await this.bookingsService.sendPaymentAddress(
      id,
      user.userId,
      dto,
    );

    return {
      success: true,
      data: data as any,
      message: 'Payment address sent successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Put('admin/:id/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Approve a booking (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Booking approved',
    type: BaseResponseDto<BookingResponseDto>,
  })
  async approveBooking(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: { adminNotes?: string },
  ): Promise<BaseResponseDto<BookingResponseDto>> {
    const data = await this.bookingsService.approveBooking(
      id,
      user.userId,
      body.adminNotes,
    );

    return {
      success: true,
      data: data as any,
      message: 'Booking approved successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Put('admin/:id/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Reject a booking (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Booking rejected',
    type: BaseResponseDto<BookingResponseDto>,
  })
  async rejectBooking(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() body: { adminNotes?: string },
  ): Promise<BaseResponseDto<BookingResponseDto>> {
    const data = await this.bookingsService.rejectBooking(
      id,
      user.userId,
      body.adminNotes,
    );

    return {
      success: true,
      data: data as any,
      message: 'Booking rejected',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('admin/:id/messages')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Send a message in booking chat (Admin)' })
  @ApiResponse({
    status: 201,
    description: 'Message sent successfully',
  })
  async sendAdminMessage(
    @CurrentUser() user: RequestUser,
    @Param('id') bookingId: string,
    @Body() dto: CreateMessageDto,
  ) {
    const data = await this.bookingsService.sendMessage(
      bookingId,
      user.userId,
      dto,
      true,
    );

    return {
      success: true,
      data,
      message: 'Message sent successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('admin/:id/messages')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get messages for a booking (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Messages retrieved successfully',
  })
  async getAdminMessages(
    @CurrentUser() user: RequestUser,
    @Param('id') bookingId: string,
  ) {
    const data = await this.bookingsService.getMessages(
      bookingId,
      user.userId,
      true,
    );

    return {
      success: true,
      data,
      message: 'Messages retrieved successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Put('admin/:id/messages/mark-read')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Mark messages as read (Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Messages marked as read',
  })
  async markAdminMessagesRead(
    @CurrentUser() user: RequestUser,
    @Param('id') bookingId: string,
  ) {
    await this.bookingsService.markMessagesAsRead(bookingId, user.userId, true);

    return {
      success: true,
      data: null,
      message: 'Messages marked as read',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('admin/settings/receiving-addresses')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Get all booking receiving addresses (Manager)' })
  async getAdminReceivingAddresses() {
    const data = await this.bookingsService.getReceivingAddresses(true);

    return {
      success: true,
      data,
      message: 'Receiving addresses retrieved successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('admin/settings/receiving-addresses')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Create booking receiving address (Manager)' })
  async createReceivingAddress(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateReceivingAddressDto,
  ) {
    const data = await this.bookingsService.createReceivingAddress(
      user.userId,
      dto,
    );

    return {
      success: true,
      data,
      message: 'Receiving address created successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Put('admin/settings/receiving-addresses/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Update booking receiving address (Manager)' })
  async updateReceivingAddress(
    @Param('id') id: string,
    @Body() dto: UpdateReceivingAddressDto,
  ) {
    const data = await this.bookingsService.updateReceivingAddress(id, dto);

    return {
      success: true,
      data,
      message: 'Receiving address updated successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('admin/:id/messages/image')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload image in booking chat (Admin/Manager)' })
  async sendAdminImageMessage(
    @CurrentUser() user: RequestUser,
    @Param('id') bookingId: string,
    @UploadedFile() image: Express.Multer.File,
    @Body('content') content?: string,
  ) {
    const data = await this.bookingsService.sendImageMessage(
      bookingId,
      user.userId,
      image,
      content,
      true,
    );

    return {
      success: true,
      data,
      message: 'Image message sent successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Put('admin/settings/receiving-addresses/:id/delete')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete booking receiving address (Manager)' })
  async deleteReceivingAddress(@Param('id') id: string) {
    await this.bookingsService.removeReceivingAddress(id);

    return {
      success: true,
      data: null,
      message: 'Receiving address deleted successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('admin/receiving-addresses/qr')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get receiving addresses for QR upload (Admin)' })
  async getReceivingAddressesForQr() {
    const data = await this.bookingsService.getReceivingAddresses(true);

    return {
      success: true,
      data,
      message: 'Receiving addresses retrieved successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('admin/receiving-addresses/:id/qr')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload Binance QR image for receiving address (Admin/Manager)' })
  async uploadReceivingAddressQr(
    @Param('id') id: string,
    @UploadedFile() image: Express.Multer.File,
  ) {
    const data = await this.bookingsService.uploadReceivingAddressQr(id, image);

    return {
      success: true,
      data,
      message: 'QR image uploaded successfully',
      timestamp: new Date().toISOString(),
    };
  }
}
