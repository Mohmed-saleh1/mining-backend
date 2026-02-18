import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  Subscription,
  SubscriptionStatus,
  PaymentMethod,
} from './entities/subscription.entity';
import {
  SubscriptionPlan,
  PlanDuration,
} from './entities/subscription-plan.entity';
import { MiningMachine } from '../mining-machines/entities/mining-machine.entity';
import { User } from '../users/entities/user.entity';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { PaytabsCallbackDto } from './dto/paytabs-callback.dto';
// BinanceCallbackDto used via controller's @Body() any

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  // PayTabs config
  private readonly paytabsProfileId: string;
  private readonly paytabsServerKey: string;
  private readonly paytabsBaseUrl: string;

  // Binance Pay config
  private readonly binanceApiKey: string;
  private readonly binanceSecretKey: string;
  private readonly binanceBaseUrl: string;

  // Cryptomus config
  private readonly cryptomusApiKey: string;
  private readonly cryptomusMerchantId: string;
  private readonly cryptomusBaseUrl: string;

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
    // PayTabs
    this.paytabsProfileId =
      (this.configService.get<string>('PAYTABS_PROFILE_ID') || '').trim();
    this.paytabsServerKey =
      (this.configService.get<string>('PAYTABS_SERVER_KEY') || '').trim();
    this.paytabsBaseUrl = (
      this.configService.get<string>('PAYTABS_BASE_URL') ||
      'https://secure.paytabs.com'
    ).trim().replace(/\/$/, ''); // Remove trailing slash

    // Binance Pay
    this.binanceApiKey =
      this.configService.get<string>('BINANCE_PAY_API_KEY') || '';
    this.binanceSecretKey =
      this.configService.get<string>('BINANCE_PAY_SECRET_KEY') || '';
    this.binanceBaseUrl =
      this.configService.get<string>('BINANCE_PAY_BASE_URL') ||
      'https://bpay.binanceapi.com';

    // Cryptomus
    this.cryptomusApiKey =
      this.configService.get<string>('CRYPTOMUS_API_KEY') || '';
    this.cryptomusMerchantId =
      this.configService.get<string>('CRYPTOMUS_MERCHANT_ID') || '';
    this.cryptomusBaseUrl =
      this.configService.get<string>('CRYPTOMUS_BASE_URL') ||
      'https://api.cryptomus.com';
  }

  // ==================== Subscription Plan Management ====================

  async createPlan(
    createDto: CreateSubscriptionPlanDto,
  ): Promise<SubscriptionPlan> {
    const machine = await this.machineRepository.findOne({
      where: { id: createDto.machineId },
    });

    if (!machine) {
      throw new NotFoundException('Machine not found');
    }

    // Auto-calculate price if not provided
    let calculatedPrice: number;
    if (createDto.price !== undefined && createDto.price !== null) {
      calculatedPrice = createDto.price;
    } else {
      const number = createDto.number || 1;

      switch (createDto.duration) {
        case PlanDuration.DAY:
          calculatedPrice = Number(machine.pricePerDay) * number;
          break;
        case PlanDuration.WEEK:
          calculatedPrice = Number(machine.pricePerWeek) * number;
          break;
        case PlanDuration.MONTH:
          calculatedPrice = Number(machine.pricePerMonth) * number;
          break;
        case PlanDuration.YEAR:
          // Calculate year price as 12 months
          calculatedPrice = Number(machine.pricePerMonth) * 12 * number;
          break;
        default:
          throw new BadRequestException('Invalid duration');
      }
    }

    // Generate plan name if not provided
    const planName =
      createDto.name ||
      this.generatePlanName(
        machine.name,
        createDto.duration,
        createDto.number || 1,
      );

    const plan = this.planRepository.create({
      ...createDto,
      name: planName,
      price: calculatedPrice,
      quantity: createDto.quantity || 1,
      isActive: createDto.isActive !== undefined ? createDto.isActive : true,
    });

    return this.planRepository.save(plan);
  }

  private generatePlanName(
    machineName: string,
    duration: PlanDuration,
    number: number,
  ): string {
    const durationLabels: Record<PlanDuration, string> = {
      [PlanDuration.DAY]: number === 1 ? 'Day' : 'Days',
      [PlanDuration.WEEK]: number === 1 ? 'Week' : 'Weeks',
      [PlanDuration.MONTH]: number === 1 ? 'Month' : 'Months',
      [PlanDuration.YEAR]: number === 1 ? 'Year' : 'Years',
    };

    return `${number} ${durationLabels[duration] || duration} Plan`;
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

  async updatePlan(
    id: string,
    updateDto: Partial<CreateSubscriptionPlanDto>,
  ): Promise<SubscriptionPlan> {
    const plan = await this.findPlanById(id);
    Object.assign(plan, updateDto);
    return this.planRepository.save(plan);
  }

  async deletePlan(id: string): Promise<void> {
    const plan = await this.findPlanById(id);
    await this.planRepository.remove(plan);
  }

  // ==================== Subscription Creation ====================

  async createSubscription(
    userId: string,
    createDto: CreateSubscriptionDto,
  ): Promise<{
    subscription: Subscription;
    paymentUrl: string;
  }> {
    const machine = await this.machineRepository.findOne({
      where: { id: createDto.machineId },
    });

    if (!machine || !machine.isActive) {
      throw new BadRequestException('Machine is not available');
    }

    const quantity = createDto.quantity || 1;

    // Check availability
    const availableUnits = machine.totalUnits - machine.rentedUnits;
    if (quantity > availableUnits) {
      throw new BadRequestException(`Only ${availableUnits} units available`);
    }

    // Calculate price from machine pricing
    const number = createDto.number || 1;
    let unitPrice: number;

    switch (createDto.duration) {
      case PlanDuration.DAY:
        unitPrice = Number(machine.pricePerDay);
        break;
      case PlanDuration.WEEK:
        unitPrice = Number(machine.pricePerWeek);
        break;
      case PlanDuration.MONTH:
        unitPrice = Number(machine.pricePerMonth);
        break;
      case PlanDuration.YEAR:
        unitPrice = Number(machine.pricePerMonth) * 12;
        break;
      default:
        throw new BadRequestException('Invalid duration type');
    }

    const totalPrice = unitPrice * number * quantity;

    // Get user for payment details
    const user = await this.userRepository.findOne({ where: { id: userId } });

    const paymentMethod = createDto.paymentMethod || PaymentMethod.PAYTABS;

    // Create subscription
    const subscription = this.subscriptionRepository.create({
      userId,
      machineId: machine.id,
      amount: totalPrice,
      duration: createDto.duration,
      durationNumber: number,
      quantity,
      status: SubscriptionStatus.PENDING,
      paymentMethod,
    });

    const savedSubscription =
      await this.subscriptionRepository.save(subscription);

    // Build a description for payment
    const durationLabel = this.getDurationLabel(createDto.duration, number);
    const description = `${machine.name} - ${durationLabel}${quantity > 1 ? ` x${quantity} units` : ''}`;

    // Generate payment URL based on chosen method
    let paymentUrl: string;

    if (paymentMethod === PaymentMethod.CRYPTOMUS) {
      paymentUrl = await this.generateCryptomusPaymentUrl(
        savedSubscription,
        description,
        user,
      );
    } else if (paymentMethod === PaymentMethod.BINANCE) {
      paymentUrl = await this.generateBinancePaymentUrl(
        savedSubscription,
        description,
        user,
      );
    } else {
      paymentUrl = await this.generatePaytabsPaymentUrl(
        savedSubscription,
        description,
        user,
      );
    }

    return {
      subscription: savedSubscription,
      paymentUrl,
    };
  }

  private getDurationLabel(duration: string, number: number): string {
    const labels: Record<string, [string, string]> = {
      day: ['Day', 'Days'],
      week: ['Week', 'Weeks'],
      month: ['Month', 'Months'],
      year: ['Year', 'Years'],
    };
    const [singular, plural] = labels[duration] || [duration, duration];
    return `${number} ${number === 1 ? singular : plural}`;
  }

  // ==================== PayTabs Payment ====================

  private async generatePaytabsPaymentUrl(
    subscription: Subscription,
    description: string,
    user?: any,
  ): Promise<string> {
    // Validate PayTabs credentials
    if (!this.paytabsServerKey || !this.paytabsServerKey.trim()) {
      throw new BadRequestException('PayTabs server key is not configured');
    }
    if (!this.paytabsProfileId || !this.paytabsProfileId.trim()) {
      throw new BadRequestException('PayTabs profile ID is not configured');
    }

    // Validate profile ID is numeric
    const profileIdNum = Number(this.paytabsProfileId);
    if (isNaN(profileIdNum)) {
      throw new BadRequestException(
        `PayTabs profile ID must be a number, got: ${this.paytabsProfileId}`,
      );
    }

    const backendUrl =
      this.configService.get<string>('BACKEND_URL') || 'http://localhost:3000';
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
    const callbackUrl =
      this.configService.get<string>('PAYTABS_CALLBACK_URL') ||
      `${backendUrl}/subscriptions/paytabs/callback`;
    const returnUrl = `${frontendUrl}/dashboard/subscriptions/success?subscription_id=${subscription.id}`;

    const amount = Number(subscription.amount);
    if (!amount || amount <= 0 || isNaN(amount)) {
      this.logger.error(
        `Invalid payment amount: ${subscription.amount} (parsed: ${amount})`,
      );
      throw new BadRequestException('Invalid payment amount');
    }

    const customerName = user
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Customer'
      : 'Customer';

    // PayTabs requires valid email - use a placeholder if not available
    const customerEmail = user?.email || `customer-${subscription.id.substring(0, 8)}@example.com`;

    // PayTabs requires phone number - use a placeholder if not available
    const customerPhone = user?.phone || '966500000000'; // Saudi Arabia default

    // PayTabs requires valid address fields
    const customerAddress = user?.address || 'N/A';
    const customerCity = user?.city || 'Riyadh';
    const customerState = user?.state || 'Riyadh';
    const customerCountry = user?.country || 'SA';
    const customerZip = user?.zip || '12345';

    const paymentData = {
      profile_id: Number(this.paytabsProfileId),
      tran_type: 'sale',
      tran_class: 'ecom',
      cart_id: subscription.id.substring(0, 40), // PayTabs has cart_id length limit
      cart_currency: 'USD',
      cart_amount: amount.toFixed(2),
      cart_description: `Subscription: ${description}`.substring(0, 127), // Max 128 chars
      callback: callbackUrl,
      return: returnUrl,
      customer_details: {
        name: customerName.substring(0, 50), // Limit name length
        email: customerEmail,
        phone: customerPhone,
        street1: customerAddress.substring(0, 100),
        city: customerCity.substring(0, 50),
        state: customerState.substring(0, 50),
        country: customerCountry,
        zip: customerZip,
      },
    };

    // Log the payload (without sensitive data) for debugging
    this.logger.log(
      `PayTabs payload: profile_id=${paymentData.profile_id}, amount=${paymentData.cart_amount}, currency=${paymentData.cart_currency}, cart_id=${paymentData.cart_id}, email=${paymentData.customer_details.email}`,
    );

    // Ensure server key is trimmed (no leading/trailing spaces)
    const serverKey = this.paytabsServerKey.trim();

    // Debug logging (safe - only show first/last 4 chars of key)
    const keyPreview =
      serverKey.length > 8
        ? `${serverKey.substring(0, 4)}...${serverKey.substring(serverKey.length - 4)}`
        : '***';

    this.logger.log(
      `PayTabs payment request: amount=${amount.toFixed(2)}, cart_id=${subscription.id}, profile_id=${this.paytabsProfileId}, base_url=${this.paytabsBaseUrl}, server_key_preview=${keyPreview}, key_length=${serverKey.length}`,
    );

    // PayTabs API v3 endpoint
    // Try v3 endpoint first, if it fails we can fallback to v2
    const apiEndpoint = `${this.paytabsBaseUrl}/payment/request`;

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: serverKey,
          // Some PayTabs implementations require these headers
          Accept: 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      // Log response status for debugging
      this.logger.log(
        `PayTabs API response status: ${response.status} ${response.statusText}`,
      );

      const responseText = await response.text();
      let data: any;

      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        this.logger.error(
          `PayTabs API response is not JSON: ${responseText.substring(0, 200)}`,
        );
        throw new BadRequestException(
          `PayTabs API returned invalid response: ${response.status} ${response.statusText}`,
        );
      }

      // Log full error details for 422 errors
      if (response.status === 422 || data.code === 2) {
        this.logger.error('PayTabs validation error details:', {
          status: response.status,
          code: data.code,
          message: data.message,
          trace: data.trace,
          validation_errors: data.validation_errors || data.errors || 'No detailed errors provided',
          sent_payload: {
            profile_id: paymentData.profile_id,
            cart_amount: paymentData.cart_amount,
            cart_currency: paymentData.cart_currency,
            cart_id_length: paymentData.cart_id.length,
            has_callback: !!paymentData.callback,
            has_return: !!paymentData.return,
            customer_email: paymentData.customer_details.email,
            customer_phone: paymentData.customer_details.phone,
            customer_country: paymentData.customer_details.country,
          },
        });
      }

      if (data.redirect_url) {
        subscription.paytabsTransactionId = data.tran_ref;
        await this.subscriptionRepository.save(subscription);
        return data.redirect_url;
      } else {
        this.logger.error('PayTabs payment URL generation failed:', {
          code: data.code,
          message: data.message,
          trace: data.trace,
          response: data,
          profile_id: this.paytabsProfileId,
          endpoint: apiEndpoint,
        });

        // Provide helpful error message based on error code
        if (data.code === 1) {
          throw new BadRequestException(
            `PayTabs Authentication Failed: ${data.message}. Please verify:\n` +
              `1. PAYTABS_SERVER_KEY matches your PayTabs dashboard\n` +
              `2. PAYTABS_PROFILE_ID matches your PayTabs dashboard\n` +
              `3. You're using the correct credentials (test vs production)\n` +
              `4. Your PayTabs account is active and verified`,
          );
        }

        throw new BadRequestException(
          `PayTabs error: ${data.message || 'Failed to generate payment URL'}`,
        );
      }
    } catch (error) {
      this.logger.error('PayTabs payment URL generation error:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new BadRequestException('Failed to generate payment URL');
    }
  }

  async handlePaytabsCallback(
    callbackDto: PaytabsCallbackDto,
  ): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: callbackDto.cart_id },
      relations: ['plan', 'machine', 'user'],
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // Verify payment result
    const paymentResultValue = callbackDto.payment_result;
    const paymentResult =
      typeof paymentResultValue === 'string'
        ? paymentResultValue
        : (paymentResultValue as any)?.response_code || paymentResultValue;

    const isSuccess =
      paymentResult === 'success' ||
      paymentResult === '100' ||
      (typeof paymentResultValue === 'string' &&
        paymentResultValue === 'success');

    if (isSuccess) {
      await this.activateSubscription(subscription, callbackDto.tranRef);
    } else {
      subscription.status = SubscriptionStatus.CANCELLED;
      await this.subscriptionRepository.save(subscription);
    }

    return subscription;
  }

  // ==================== Binance Pay ====================

  private generateBinanceSignature(
    timestamp: string,
    nonce: string,
    body: string,
  ): string {
    const payload = `${timestamp}\n${nonce}\n${body}\n`;
    return crypto
      .createHmac('sha512', this.binanceSecretKey)
      .update(payload)
      .digest('hex')
      .toUpperCase();
  }

  private generateNonce(length: number = 32): string {
    const chars =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private async generateBinancePaymentUrl(
    subscription: Subscription,
    description: string,
    user?: any,
  ): Promise<string> {
    // Validate subscription ID
    if (!subscription.id) {
      this.logger.error('Subscription ID is missing');
      throw new BadRequestException('Subscription ID is required');
    }

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
    const backendUrl =
      this.configService.get<string>('BACKEND_URL') || 'http://localhost:3000';
    const returnUrl = `${frontendUrl}/dashboard/subscriptions/success?subscription_id=${subscription.id}`;
    const webhookUrl =
      this.configService.get<string>('BINANCE_PAY_WEBHOOK_URL') ||
      `${backendUrl}/subscriptions/binance/callback`;

    // Generate merchantTradeNo: Binance Pay requires:
    // - ONLY alphanumeric characters (A-Z, a-z, 0-9) - no underscores, hyphens, or special characters
    // - Maximum 32 characters
    // - Must be unique per order
    // Format: UUID without dashes (exactly 32 chars, all alphanumeric)
    const merchantTradeNo = subscription.id.replace(/-/g, '');

    // Validate the generated merchantTradeNo
    // Binance Pay requires: only alphanumeric, max 32 chars, min 8 chars
    if (
      !merchantTradeNo ||
      merchantTradeNo.length < 8 ||
      merchantTradeNo.length > 32 ||
      !/^[A-Za-z0-9]+$/.test(merchantTradeNo)
    ) {
      this.logger.error(
        `Invalid merchantTradeNo generated: ${merchantTradeNo} (length: ${merchantTradeNo?.length}, alphanumeric: ${/^[A-Za-z0-9]+$/.test(merchantTradeNo)})`,
      );
      throw new BadRequestException(
        'Failed to generate valid merchant trade number',
      );
    }

    const orderData = {
      env: {
        terminalType: 'WEB',
      },
      merchantTradeNo,
      orderAmount: Number(subscription.amount).toFixed(2),
      currency: 'USDT',
      description: `Subscription: ${description}`,
      goodsDetails: [
        {
          goodsType: '02',
          goodsCategory: 'Z000',
          referenceGoodsId: subscription.machineId,
          goodsName: description,
          goodsDetail: description,
        },
      ],
      returnUrl,
      cancelUrl: `${frontendUrl}/machines`,
      webhookUrl,
      buyer: user
        ? {
            buyerName: {
              firstName: user.firstName || '',
              lastName: user.lastName || '',
            },
            buyerEmail: user.email || '',
          }
        : undefined,
    };

    const timestamp = Date.now().toString();
    const nonce = this.generateNonce();
    const body = JSON.stringify(orderData);
    const signature = this.generateBinanceSignature(timestamp, nonce, body);

    // Log merchantTradeNo for debugging
    this.logger.log(
      `Binance Pay order creation: merchantTradeNo=${merchantTradeNo}, length=${merchantTradeNo.length}, subscriptionId=${subscription.id}`,
    );

    try {
      const response = await fetch(
        `${this.binanceBaseUrl}/binancepay/openapi/v3/order`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'BinancePay-Timestamp': timestamp,
            'BinancePay-Nonce': nonce,
            'BinancePay-Certificate-SN': this.binanceApiKey,
            'BinancePay-Signature': signature,
          },
          body,
        },
      );

      const data = await response.json();

      if (data.status === 'SUCCESS' && data.data) {
        subscription.binanceOrderId = merchantTradeNo;
        subscription.binancePrepayId = data.data.prepayId;
        await this.subscriptionRepository.save(subscription);

        return (
          data.data.universalUrl ||
          data.data.checkoutUrl ||
          data.data.deeplink ||
          ''
        );
      } else {
        this.logger.error('Binance Pay order creation failed:', data);
        throw new BadRequestException(
          `Failed to create Binance Pay order: ${data.errorMessage || 'Unknown error'}`,
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Binance Pay order creation error:', error);
      throw new BadRequestException('Failed to create Binance Pay order');
    }
  }

  verifyBinanceWebhookSignature(
    timestamp: string,
    nonce: string,
    body: string,
    signature: string,
  ): boolean {
    const expectedSignature = this.generateBinanceSignature(
      timestamp,
      nonce,
      body,
    );
    return expectedSignature === signature.toUpperCase();
  }

  async handleBinanceCallback(
    callbackBody: any,
    timestamp?: string,
    nonce?: string,
    signature?: string,
  ): Promise<Subscription> {
    // Verify signature if headers are provided
    if (timestamp && nonce && signature) {
      const rawBody =
        typeof callbackBody === 'string'
          ? callbackBody
          : JSON.stringify(callbackBody);
      const isValid = this.verifyBinanceWebhookSignature(
        timestamp,
        nonce,
        rawBody,
        signature,
      );
      if (!isValid) {
        this.logger.warn('Invalid Binance Pay webhook signature');
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    // Parse the callback data
    const bizStatus = callbackBody.bizStatus;
    let merchantTradeNo: string | undefined;

    // Binance sends data as a JSON string in the 'data' field
    if (callbackBody.data) {
      try {
        const parsedData =
          typeof callbackBody.data === 'string'
            ? JSON.parse(callbackBody.data)
            : callbackBody.data;
        merchantTradeNo = parsedData.merchantTradeNo;
      } catch {
        merchantTradeNo = callbackBody.merchantTradeNo;
      }
    } else {
      merchantTradeNo = callbackBody.merchantTradeNo;
    }

    if (!merchantTradeNo) {
      this.logger.error(
        'No merchantTradeNo in Binance callback:',
        callbackBody,
      );
      throw new BadRequestException(
        'Invalid callback data: missing merchantTradeNo',
      );
    }

    // Find subscription by binanceOrderId
    const subscription = await this.subscriptionRepository.findOne({
      where: { binanceOrderId: merchantTradeNo },
      relations: ['plan', 'machine', 'user'],
    });

    if (!subscription) {
      // Try extracting UUID from merchantTradeNo format: SUB_<uuid-without-dashes>
      this.logger.error(
        `Subscription not found for merchantTradeNo: ${merchantTradeNo}`,
      );
      throw new NotFoundException('Subscription not found');
    }

    if (bizStatus === 'PAY_SUCCESS') {
      await this.activateSubscription(subscription, merchantTradeNo);
    } else if (bizStatus === 'PAY_CLOSED' || bizStatus === 'PAY_FAIL') {
      subscription.status = SubscriptionStatus.CANCELLED;
      await this.subscriptionRepository.save(subscription);
    }

    return subscription;
  }

  // ==================== Cryptomus Payment ====================

  private generateCryptomusSignature(
    payload: string,
    secret: string,
  ): string {
    return crypto
      .createHash('md5')
      .update(Buffer.from(payload).toString('base64') + secret)
      .digest('hex');
  }

  private async generateCryptomusPaymentUrl(
    subscription: Subscription,
    description: string,
    user?: any,
  ): Promise<string> {
    // Validate Cryptomus credentials
    if (!this.cryptomusApiKey || !this.cryptomusApiKey.trim()) {
      throw new BadRequestException('Cryptomus API key is not configured');
    }
    if (!this.cryptomusMerchantId || !this.cryptomusMerchantId.trim()) {
      throw new BadRequestException('Cryptomus merchant ID is not configured');
    }

    const backendUrl =
      this.configService.get<string>('BACKEND_URL') || 'http://localhost:3000';
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
    const callbackUrl =
      this.configService.get<string>('CRYPTOMUS_CALLBACK_URL') ||
      `${backendUrl}/subscriptions/cryptomus/callback`;
    const returnUrl = `${frontendUrl}/dashboard/subscriptions/success?subscription_id=${subscription.id}`;

    const amount = Number(subscription.amount);
    if (!amount || amount <= 0 || isNaN(amount)) {
      this.logger.error(
        `Invalid payment amount: ${subscription.amount} (parsed: ${amount})`,
      );
      throw new BadRequestException('Invalid payment amount');
    }

    // Cryptomus invoice creation payload
    const orderId = subscription.id;
    const invoiceData = {
      amount: amount.toFixed(2),
      currency: 'USD',
      order_id: orderId,
      url_return: returnUrl,
      url_callback: callbackUrl,
      is_payment_multiple: false,
      lifetime: 7200, // 2 hours in seconds
      to_currency: 'USDT', // Default to USDT, user can change on payment page
      subtract: 0,
      accuracy_payment_percent: 0,
      additional_data: description,
      currencies: ['BTC', 'ETH', 'USDT', 'LTC', 'TRX'], // Supported cryptocurrencies
      except_currencies: [],
      network: null, // Let user choose network
      address: null,
      is_refresh: false,
      customer_email: user?.email || undefined,
    };

    const payload = JSON.stringify(invoiceData);
    const signature = this.generateCryptomusSignature(
      payload,
      this.cryptomusApiKey,
    );

    // Ensure merchant ID is trimmed
    const merchantId = this.cryptomusMerchantId.trim();
    
    // Log merchant ID (partially masked for security)
    const merchantIdPreview = merchantId.length > 8
      ? `${merchantId.substring(0, 4)}...${merchantId.substring(merchantId.length - 4)}`
      : '***';
    
    // Log API key preview (first 4 and last 4 chars)
    const apiKeyPreview = this.cryptomusApiKey.length > 8
      ? `${this.cryptomusApiKey.substring(0, 4)}...${this.cryptomusApiKey.substring(this.cryptomusApiKey.length - 4)}`
      : '***';

    this.logger.log(
      `Cryptomus payment request: amount=${amount.toFixed(2)}, order_id=${orderId}, merchant_id=${merchantIdPreview}, merchant_id_length=${merchantId.length}, api_key_length=${this.cryptomusApiKey.length}`,
    );

    try {
      const response = await fetch(
        `${this.cryptomusBaseUrl}/v1/payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            merchant: merchantId,
            sign: signature,
          },
          body: payload,
        },
      );

      const responseText = await response.text();
      let data: any;

      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        this.logger.error(
          `Cryptomus API response is not JSON: ${responseText.substring(0, 200)}`,
        );
        throw new BadRequestException(
          `Cryptomus API returned invalid response: ${response.status} ${response.statusText}`,
        );
      }

      if (data.state === 0 && data.result) {
        subscription.cryptomusOrderId = orderId;
        subscription.cryptomusInvoiceId = data.result.uuid || orderId;
        await this.subscriptionRepository.save(subscription);

        return data.result.url || '';
      } else {
        this.logger.error('Cryptomus payment URL generation failed:', {
          state: data.state,
          message: data.message,
          response: data,
          merchant_id_preview: merchantIdPreview,
          merchant_id_length: merchantId.length,
          api_endpoint: `${this.cryptomusBaseUrl}/v1/payment`,
        });

        // Provide helpful error message for "Merchant unknown" error
        if (data.message && data.message.toLowerCase().includes('merchant unknown')) {
          this.logger.error('Cryptomus Merchant Unknown Error Details:', {
            merchant_id_preview: merchantIdPreview,
            merchant_id_length: merchantId.length,
            api_key_length: this.cryptomusApiKey.length,
            api_key_preview: apiKeyPreview,
            endpoint: `${this.cryptomusBaseUrl}/v1/payment`,
            request_payload: JSON.parse(payload),
          });
          
          throw new BadRequestException(
            `Cryptomus error: Merchant unknown. Please verify:\n` +
            `1. CRYPTOMUS_MERCHANT_ID is correct in your .env file (currently: ${merchantIdPreview}, length: ${merchantId.length})\n` +
            `2. CRYPTOMUS_API_KEY matches the Merchant ID (same account)\n` +
            `3. You're using a PAYMENT API key (not Payout API key) - Check Cryptomus dashboard\n` +
            `4. Merchant ID matches the one shown in Cryptomus Business/Payment settings\n` +
            `5. Your Cryptomus account is verified and active for API access\n` +
            `6. API key and Merchant ID are from the same environment (test/production)\n` +
            `\nNote: For accepting payments, you may need a "Payment API key" instead of "Payout API key".\n` +
            `Check Cryptomus Business API documentation for the correct API key type.`,
          );
        }

        throw new BadRequestException(
          `Cryptomus error: ${data.message || 'Failed to generate payment URL'}`,
        );
      }
    } catch (error) {
      this.logger.error('Cryptomus payment URL generation error:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new BadRequestException('Failed to generate Cryptomus payment URL');
    }
  }

  verifyCryptomusWebhookSignature(
    payload: string,
    signature: string,
  ): boolean {
    const expectedSignature = this.generateCryptomusSignature(
      payload,
      this.cryptomusApiKey,
    );
    return expectedSignature === signature;
  }

  async handleCryptomusCallback(
    callbackBody: any,
    signature?: string,
  ): Promise<Subscription> {
    // Verify signature if provided
    if (signature) {
      const rawBody =
        typeof callbackBody === 'string'
          ? callbackBody
          : JSON.stringify(callbackBody);
      const isValid = this.verifyCryptomusWebhookSignature(
        rawBody,
        signature,
      );
      if (!isValid) {
        this.logger.warn('Invalid Cryptomus webhook signature');
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    // Parse the callback data
    const orderId = callbackBody.order_id;
    const paymentStatus = callbackBody.payment_status;

    if (!orderId) {
      this.logger.error(
        'No order_id in Cryptomus callback:',
        callbackBody,
      );
      throw new BadRequestException(
        'Invalid callback data: missing order_id',
      );
    }

    // Find subscription by order_id (which is the subscription ID)
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: orderId },
      relations: ['plan', 'machine', 'user'],
    });

    if (!subscription) {
      this.logger.error(
        `Subscription not found for order_id: ${orderId}`,
      );
      throw new NotFoundException('Subscription not found');
    }

    // Cryptomus payment statuses:
    // - paid: Payment completed
    // - paid_over: Overpaid
    // - fail: Payment failed
    // - process: Payment in process
    // - confirm_check: Waiting for confirmation
    // - refund_process: Refund in process
    // - refund_fail: Refund failed
    // - refund_paid: Refund completed
    // - locked: Payment locked
    // - expired: Payment expired

    if (paymentStatus === 'paid' || paymentStatus === 'paid_over') {
      await this.activateSubscription(subscription, orderId);
    } else if (
      paymentStatus === 'fail' ||
      paymentStatus === 'expired' ||
      paymentStatus === 'refund_paid'
    ) {
      subscription.status = SubscriptionStatus.CANCELLED;
      await this.subscriptionRepository.save(subscription);
    }
    // For 'process' and 'confirm_check', we keep the subscription as PENDING

    return subscription;
  }

  // ==================== Shared Activation Logic ====================

  private async activateSubscription(
    subscription: Subscription,
    paymentRef: string,
  ): Promise<void> {
    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.paidAt = new Date();

    // Store payment reference based on method
    if (subscription.paymentMethod === PaymentMethod.CRYPTOMUS) {
      subscription.cryptomusOrderId = subscription.cryptomusOrderId || paymentRef;
    } else if (subscription.paymentMethod === PaymentMethod.BINANCE) {
      subscription.binanceOrderId = subscription.binanceOrderId || paymentRef;
    } else {
      subscription.paytabsPaymentId = paymentRef;
    }

    // Calculate subscription dates
    const startDate = new Date();
    subscription.startDate = startDate;

    const duration =
      (subscription.duration as PlanDuration) ||
      subscription.plan?.duration;
    const durationNumber = subscription.durationNumber || 1;
    const quantity = subscription.quantity || subscription.plan?.quantity || 1;

    const endDate = new Date(startDate);
    switch (duration) {
      case PlanDuration.DAY:
        endDate.setDate(endDate.getDate() + 1 * durationNumber);
        break;
      case PlanDuration.WEEK:
        endDate.setDate(endDate.getDate() + 7 * durationNumber);
        break;
      case PlanDuration.MONTH:
        endDate.setMonth(endDate.getMonth() + durationNumber);
        break;
      case PlanDuration.YEAR:
        endDate.setFullYear(endDate.getFullYear() + durationNumber);
        break;
    }
    subscription.endDate = endDate;

    // Update machine rented units
    const machine = subscription.machine;
    if (machine) {
      machine.rentedUnits = Math.min(
        machine.totalUnits,
        machine.rentedUnits + quantity,
      );
      await this.machineRepository.save(machine);
    }

    await this.subscriptionRepository.save(subscription);
  }

  // ==================== Subscription Queries ====================

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

  async findOne(
    id: string,
    userId?: string,
    isAdmin: boolean = false,
  ): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id },
      relations: ['plan', 'machine', 'user'],
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (!isAdmin && userId && subscription.userId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this subscription',
      );
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
        const qty =
          subscription.quantity || subscription.plan?.quantity || 1;
        machine.rentedUnits = Math.max(0, machine.rentedUnits - qty);
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
      this.subscriptionRepository.count({
        where: { status: SubscriptionStatus.PENDING },
      }),
      this.subscriptionRepository.count({
        where: { status: SubscriptionStatus.ACTIVE },
      }),
      this.subscriptionRepository.count({
        where: { status: SubscriptionStatus.EXPIRED },
      }),
      this.subscriptionRepository.count({
        where: { status: SubscriptionStatus.CANCELLED },
      }),
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
