import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Subscription, SubscriptionStatus } from './entities/subscription.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { MiningMachine } from '../mining-machines/entities/mining-machine.entity';
import { User } from '../users/entities/user.entity';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { PaytabsCallbackDto } from './dto/paytabs-callback.dto';

@Injectable()
export class SubscriptionsService {
  private readonly paytabsProfileId: string;
  private readonly paytabsServerKey: string;
  private readonly paytabsBaseUrl: string;

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(SubscriptionPlan)
    private readonly planRepository: Repository<SubscriptionPlan>,
    @InjectRepository(MiningMachine)
    private readonly machineRepository: Repository<MiningMachine>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {
    this.paytabsProfileId = this.configService.get<string>('PAYTABS_PROFILE_ID') || '';
    this.paytabsServerKey = this.configService.get<string>('PAYTABS_SERVER_KEY') || '';
    this.paytabsBaseUrl = this.configService.get<string>('PAYTABS_BASE_URL') || 'https://secure.paytabs.com';
  }

  // Subscription Plan Management
  async createPlan(createDto: CreateSubscriptionPlanDto): Promise<SubscriptionPlan> {
    const machine = await this.machineRepository.findOne({
      where: { id: createDto.machineId },
    });

    if (!machine) {
      throw new NotFoundException('Machine not found');
    }

    const plan = this.planRepository.create({
      ...createDto,
      quantity: createDto.quantity || 1,
      isActive: createDto.isActive !== undefined ? createDto.isActive : true,
    });

    return this.planRepository.save(plan);
  }

  async findAllPlans(machineId?: string): Promise<SubscriptionPlan[]> {
    const where: any = { isActive: true };
    if (machineId) {
      where.machineId = machineId;
    }

    return this.planRepository.find({
      where,
      relations: ['machine'],
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async findPlanById(id: string): Promise<SubscriptionPlan> {
    const plan = await this.planRepository.findOne({
      where: { id },
      relations: ['machine'],
    });

    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    return plan;
  }

  async updatePlan(id: string, updateDto: Partial<CreateSubscriptionPlanDto>): Promise<SubscriptionPlan> {
    const plan = await this.findPlanById(id);
    Object.assign(plan, updateDto);
    return this.planRepository.save(plan);
  }

  async deletePlan(id: string): Promise<void> {
    const plan = await this.findPlanById(id);
    await this.planRepository.remove(plan);
  }

  // Subscription Management
  async createSubscription(userId: string, createDto: CreateSubscriptionDto): Promise<{
    subscription: Subscription;
    paymentUrl: string;
  }> {
    const plan = await this.findPlanById(createDto.planId);

    if (!plan.isActive) {
      throw new BadRequestException('This subscription plan is not available');
    }

    const machine = await this.machineRepository.findOne({
      where: { id: plan.machineId },
    });

    if (!machine || !machine.isActive) {
      throw new BadRequestException('Machine is not available');
    }

    // Check availability
    const availableUnits = machine.totalUnits - machine.rentedUnits;
    if (plan.quantity > availableUnits) {
      throw new BadRequestException(`Only ${availableUnits} units available`);
    }

    // Get user for payment details
    const user = await this.userRepository.findOne({ where: { id: userId } });

    // Create subscription
    const subscription = this.subscriptionRepository.create({
      userId,
      planId: plan.id,
      machineId: plan.machineId,
      amount: Number(plan.price),
      status: SubscriptionStatus.PENDING,
    });

    const savedSubscription = await this.subscriptionRepository.save(subscription);

    // Generate PayTabs payment URL
    const paymentUrl = await this.generatePaytabsPaymentUrl(savedSubscription, plan, user);

    return {
      subscription: savedSubscription,
      paymentUrl,
    };
  }

  private async generatePaytabsPaymentUrl(
    subscription: Subscription,
    plan: SubscriptionPlan,
    user?: any,
  ): Promise<string> {
    const backendUrl = this.configService.get<string>('BACKEND_URL') || 'http://localhost:3000';
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
    const callbackUrl = this.configService.get<string>('PAYTABS_CALLBACK_URL') || 
      `${backendUrl}/subscriptions/paytabs/callback`;
    const returnUrl = `${frontendUrl}/subscriptions/success`;

    const paymentData = {
      profile_id: this.paytabsProfileId,
      tran_type: 'sale',
      tran_class: 'ecom',
      cart_id: subscription.id,
      cart_currency: 'USD',
      cart_amount: subscription.amount.toString(),
      cart_description: `Subscription: ${plan.name} - ${plan.machine.name}`,
      callback: callbackUrl,
      return: returnUrl,
      customer_details: {
        name: user ? `${user.firstName} ${user.lastName}` : 'Customer',
        email: user?.email || '',
      },
    };

    try {
      const response = await fetch(`${this.paytabsBaseUrl}/payment/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.paytabsServerKey,
        },
        body: JSON.stringify(paymentData),
      });

      const data = await response.json();

      if (data.redirect_url) {
        // Update subscription with transaction ID
        subscription.paytabsTransactionId = data.tran_ref;
        await this.subscriptionRepository.save(subscription);
        return data.redirect_url;
      } else {
        throw new BadRequestException('Failed to generate payment URL');
      }
    } catch (error) {
      console.error('PayTabs payment URL generation error:', error);
      throw new BadRequestException('Failed to generate payment URL');
    }
  }

  async handlePaytabsCallback(callbackDto: PaytabsCallbackDto): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: callbackDto.cart_id },
      relations: ['plan', 'machine', 'user'],
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // Verify payment result - PayTabs sends payment_result as string or object
    const paymentResultValue = callbackDto.payment_result;
    const paymentResult = typeof paymentResultValue === 'string' 
      ? paymentResultValue 
      : (paymentResultValue as any)?.response_code || paymentResultValue;
    
    const isSuccess = paymentResult === 'success' || 
                     paymentResult === '100' || 
                     (typeof paymentResultValue === 'string' && paymentResultValue === 'success');

    if (isSuccess) {
      subscription.status = SubscriptionStatus.ACTIVE;
      subscription.paytabsPaymentId = callbackDto.tranRef;
      subscription.paidAt = new Date();

      // Calculate subscription dates based on plan duration
      const startDate = new Date();
      subscription.startDate = startDate;

      const endDate = new Date(startDate);
      switch (subscription.plan.duration) {
        case 'day':
          endDate.setDate(endDate.getDate() + 1);
          break;
        case 'week':
          endDate.setDate(endDate.getDate() + 7);
          break;
        case 'month':
          endDate.setMonth(endDate.getMonth() + 1);
          break;
        case 'year':
          endDate.setFullYear(endDate.getFullYear() + 1);
          break;
      }
      subscription.endDate = endDate;

      // Update machine rented units
      const machine = subscription.machine;
      if (machine) {
        machine.rentedUnits = Math.min(
          machine.totalUnits,
          machine.rentedUnits + subscription.plan.quantity,
        );
        await this.machineRepository.save(machine);
      }
    } else {
      subscription.status = SubscriptionStatus.CANCELLED;
    }

    return this.subscriptionRepository.save(subscription);
  }

  async findAllForUser(userId: string): Promise<Subscription[]> {
    return this.subscriptionRepository.find({
      where: { userId },
      relations: ['plan', 'machine', 'user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findAllForAdmin(
    page: number = 1,
    limit: number = 10,
    status?: SubscriptionStatus,
  ): Promise<{
    data: Subscription[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (status) {
      where.status = status;
    }

    const [data, total] = await this.subscriptionRepository.findAndCount({
      where,
      relations: ['plan', 'machine', 'user'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, userId?: string, isAdmin: boolean = false): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id },
      relations: ['plan', 'machine', 'user'],
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (!isAdmin && userId && subscription.userId !== userId) {
      throw new ForbiddenException('You do not have access to this subscription');
    }

    return subscription;
  }

  async cancelSubscription(id: string, userId: string): Promise<Subscription> {
    const subscription = await this.findOne(id, userId);

    if (subscription.status === SubscriptionStatus.CANCELLED) {
      throw new BadRequestException('Subscription is already cancelled');
    }

    if (subscription.status === SubscriptionStatus.EXPIRED) {
      throw new BadRequestException('Cannot cancel an expired subscription');
    }

    // Release machine units if subscription was active
    const wasActive = subscription.status === SubscriptionStatus.ACTIVE;
    
    subscription.status = SubscriptionStatus.CANCELLED;

    if (wasActive) {
      const machine = subscription.machine;
      if (machine) {
        machine.rentedUnits = Math.max(0, machine.rentedUnits - subscription.plan.quantity);
        await this.machineRepository.save(machine);
      }
    }

    return this.subscriptionRepository.save(subscription);
  }

  async getStatistics(): Promise<{
    total: number;
    pending: number;
    active: number;
    expired: number;
    cancelled: number;
  }> {
    const [total, pending, active, expired, cancelled] = await Promise.all([
      this.subscriptionRepository.count(),
      this.subscriptionRepository.count({ where: { status: SubscriptionStatus.PENDING } }),
      this.subscriptionRepository.count({ where: { status: SubscriptionStatus.ACTIVE } }),
      this.subscriptionRepository.count({ where: { status: SubscriptionStatus.EXPIRED } }),
      this.subscriptionRepository.count({ where: { status: SubscriptionStatus.CANCELLED } }),
    ]);

    return {
      total,
      pending,
      active,
      expired,
      cancelled,
    };
  }
}

