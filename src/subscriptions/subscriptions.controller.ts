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
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto, CreateSubscriptionPlanDto, PaytabsCallbackDto } from './dto';
import { SubscriptionStatus } from './entities/subscription.entity';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  // Public: PayTabs callback
  @Post('paytabs/callback')
  @ApiOperation({ summary: 'PayTabs payment callback webhook' })
  async handlePaytabsCallback(@Body() callbackDto: PaytabsCallbackDto) {
    return this.subscriptionsService.handlePaytabsCallback(callbackDto);
  }

  // Admin: Subscription Plan Management
  @Post('plans')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a subscription plan (Admin only)' })
  async createPlan(@Body() createDto: CreateSubscriptionPlanDto) {
    return this.subscriptionsService.createPlan(createDto);
  }

  @Get('plans')
  @ApiOperation({ summary: 'Get all active subscription plans' })
  @ApiQuery({ name: 'machineId', required: false, type: String })
  async findAllPlans(@Query('machineId') machineId?: string) {
    return this.subscriptionsService.findAllPlans(machineId);
  }

  @Get('plans/:id')
  @ApiOperation({ summary: 'Get subscription plan by ID' })
  async findPlanById(@Param('id') id: string) {
    return this.subscriptionsService.findPlanById(id);
  }

  @Put('plans/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update subscription plan (Admin only)' })
  async updatePlan(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateSubscriptionPlanDto>,
  ) {
    return this.subscriptionsService.updatePlan(id, updateDto);
  }

  @Delete('plans/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete subscription plan (Admin only)' })
  async deletePlan(@Param('id') id: string) {
    await this.subscriptionsService.deletePlan(id);
    return { message: 'Plan deleted successfully' };
  }

  // User: Subscription Management
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new subscription' })
  async createSubscription(
    @CurrentUser() user: any,
    @Body() createDto: CreateSubscriptionDto,
  ) {
    return this.subscriptionsService.createSubscription(user.userId, createDto);
  }

  @Get('my-subscriptions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user subscriptions' })
  async getMySubscriptions(@CurrentUser() user: any) {
    return this.subscriptionsService.findAllForUser(user.userId);
  }

  @Get('my-subscriptions/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get subscription by ID (user)' })
  async getMySubscription(@CurrentUser() user: any, @Param('id') id: string) {
    return this.subscriptionsService.findOne(id, user.userId);
  }

  @Put('my-subscriptions/:id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Cancel subscription (user)' })
  async cancelSubscription(@CurrentUser() user: any, @Param('id') id: string) {
    return this.subscriptionsService.cancelSubscription(id, user.userId);
  }

  // Admin: Subscription Management
  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all subscriptions (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: SubscriptionStatus })
  async findAllForAdmin(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: SubscriptionStatus,
  ) {
    return this.subscriptionsService.findAllForAdmin(
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      status,
    );
  }

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get subscription by ID (Admin only)' })
  async findOneForAdmin(@Param('id') id: string) {
    return this.subscriptionsService.findOne(id, undefined, true);
  }

  @Get('admin/statistics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get subscription statistics (Admin only)' })
  async getStatistics() {
    return this.subscriptionsService.getStatistics();
  }
}

