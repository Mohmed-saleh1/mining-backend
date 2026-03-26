import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, In } from 'typeorm';
import {
  Booking,
  BookingStatus,
  RentalDuration,
} from './entities/booking.entity';
import { BookingMessage, MessageType } from './entities/booking-message.entity';
import { BookingReceivingAddress } from './entities/booking-receiving-address.entity';
import { MiningMachine } from '../mining-machines/entities/mining-machine.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import {
  UpdateBookingDto,
  SendPaymentAddressDto,
  MarkPaymentSentDto,
} from './dto/update-booking.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import {
  CreateReceivingAddressDto,
  UpdateReceivingAddressDto,
} from './dto/receiving-address.dto';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/entities/user.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { UploadService } from '../shared/services/upload.service';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(BookingMessage)
    private readonly messageRepository: Repository<BookingMessage>,
    @InjectRepository(BookingReceivingAddress)
    private readonly receivingAddressRepository: Repository<BookingReceivingAddress>,
    @InjectRepository(MiningMachine)
    private readonly machineRepository: Repository<MiningMachine>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly uploadService: UploadService,
    private readonly entityManager: EntityManager,
  ) {}

  private calculatePrice(
    machine: MiningMachine,
    duration: RentalDuration,
    quantity: number,
  ): number {
    let pricePerUnit: number;
    switch (duration) {
      case RentalDuration.HOUR:
        // Calculate hourly price from daily price (divide by 24)
        pricePerUnit = Number(machine.pricePerDay) / 24;
        break;
      case RentalDuration.DAY:
        pricePerUnit = Number(machine.pricePerDay);
        break;
      case RentalDuration.WEEK:
        pricePerUnit = Number(machine.pricePerWeek);
        break;
      case RentalDuration.MONTH:
        pricePerUnit = Number(machine.pricePerMonth);
        break;
      default:
        pricePerUnit = Number(machine.pricePerDay);
    }
    return pricePerUnit * quantity;
  }

  async create(userId: string, createDto: CreateBookingDto): Promise<Booking> {
    // Check if user's email is verified
    const currentUser = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    if (!currentUser.emailVerified) {
      throw new BadRequestException({
        message: 'Email verification required',
        errorCode: 'BOOKING_001',
        errorDescription: 'Please verify your email address before creating bookings',
      });
    }

    const machine = await this.machineRepository.findOne({
      where: { id: createDto.machineId },
    });

    if (!machine) {
      throw new NotFoundException('Machine not found');
    }

    if (!machine.isActive) {
      throw new BadRequestException(
        'This machine is not available for booking',
      );
    }

    const availableUnits = machine.totalUnits - machine.rentedUnits;
    if (createDto.quantity > availableUnits) {
      throw new BadRequestException(`Only ${availableUnits} units available`);
    }

    const totalPrice = this.calculatePrice(
      machine,
      createDto.rentalDuration,
      createDto.quantity,
    );

    const activeReceivingAddresses = await this.receivingAddressRepository.find({
      where: { isActive: true },
      order: { createdAt: 'ASC' },
    });

    const booking = this.bookingRepository.create({
      userId,
      machineId: createDto.machineId,
      rentalDuration: createDto.rentalDuration,
      quantity: createDto.quantity,
      totalPrice,
      userNotes: createDto.userNotes,
      status:
        activeReceivingAddresses.length > 0
          ? BookingStatus.AWAITING_PAYMENT
          : BookingStatus.PENDING,
      paymentAddress:
        activeReceivingAddresses.length > 0
          ? activeReceivingAddresses[0].address
          : undefined,
    });

    const savedBooking = await this.bookingRepository.save(booking);

    const staffSenderId = await this.getStaffSenderId(userId);

    await this.createSystemMessage(
      savedBooking.id,
      staffSenderId,
      activeReceivingAddresses.length > 0
        ? `Booking request created for ${machine.name}. Please send payment to one of the provided receiving addresses and upload your payment screenshot in chat.`
        : `Booking request created for ${machine.name}. Waiting for admin to provide payment address.`,
    );

    if (activeReceivingAddresses.length > 0) {
      await this.messageRepository.save(
        activeReceivingAddresses.map((item) => ({
          bookingId: savedBooking.id,
          senderId: staffSenderId,
          content: item.address,
          cryptoName: item.cryptoName,
          networkType: item.networkType,
          imageUrl: item.qrImageUrl,
          messageType: MessageType.PAYMENT_ADDRESS,
          isFromAdmin: true,
        })),
      );
    }

    return this.findOne(savedBooking.id, userId);
  }

  async findAllForUser(userId: string): Promise<Booking[]> {
    return this.bookingRepository.find({
      where: { userId },
      relations: ['machine', 'user', 'messages', 'messages.sender'],
      order: { createdAt: 'DESC' },
    });
  }

  async findAllForAdmin(
    page: number = 1,
    limit: number = 10,
    status?: BookingStatus,
  ): Promise<{
    data: Booking[];
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

    const [data, total] = await this.bookingRepository.findAndCount({
      where,
      relations: [
        'machine',
        'user',
        'messages',
        'messages.sender',
        'approvedBy',
      ],
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
  ): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: [
        'machine',
        'user',
        'messages',
        'messages.sender',
        'approvedBy',
      ],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (!isAdmin && userId && booking.userId !== userId) {
      throw new ForbiddenException('You do not have access to this booking');
    }

    // Sort messages by creation date
    if (booking.messages) {
      booking.messages.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    }

    return booking;
  }

  async sendPaymentAddress(
    bookingId: string,
    adminId: string,
    dto: SendPaymentAddressDto,
  ): Promise<Booking> {
    const booking = await this.findOne(bookingId, undefined, true);

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException(
        'Payment address can only be sent for pending bookings',
      );
    }

    booking.paymentAddress = dto.paymentAddress;
    booking.status = BookingStatus.AWAITING_PAYMENT;

    await this.bookingRepository.save(booking);

    // Create message with payment address
    await this.messageRepository.save({
      bookingId,
      senderId: adminId,
      content: dto.paymentAddress,
      messageType: MessageType.PAYMENT_ADDRESS,
      isFromAdmin: true,
    });

    await this.createSystemMessage(
      bookingId,
      adminId,
      'Payment address has been provided. Please send the payment and mark it as sent.',
    );

    return this.findOne(bookingId, undefined, true);
  }

  async markPaymentSent(
    bookingId: string,
    userId: string,
    dto: MarkPaymentSentDto,
  ): Promise<Booking> {
    const booking = await this.findOne(bookingId, userId);

    if (booking.status !== BookingStatus.AWAITING_PAYMENT) {
      throw new BadRequestException(
        'Can only mark payment as sent when awaiting payment',
      );
    }

    booking.status = BookingStatus.PAYMENT_SENT;
    booking.paymentSentAt = new Date();
    if (dto.transactionHash) {
      booking.transactionHash = dto.transactionHash;
    }

    await this.bookingRepository.save(booking);

    await this.createSystemMessage(
      bookingId,
      userId,
      `User has marked payment as sent.${dto.transactionHash ? ` Transaction hash: ${dto.transactionHash}` : ''}`,
    );

    return this.findOne(bookingId, userId);
  }

  async approveBooking(
    bookingId: string,
    adminId: string,
    adminNotes?: string,
  ): Promise<Booking> {
    const booking = await this.findOne(bookingId, undefined, true);

    const approvableStatuses = [
      BookingStatus.PENDING,
      BookingStatus.AWAITING_PAYMENT,
      BookingStatus.PAYMENT_SENT,
    ];
    if (!approvableStatuses.includes(booking.status)) {
      throw new BadRequestException(
        'Can only approve bookings that are pending, awaiting payment, or payment sent',
      );
    }

    // Update machine rented units
    const machine = await this.machineRepository.findOne({
      where: { id: booking.machineId },
    });

    if (machine) {
      machine.rentedUnits = Math.min(
        machine.totalUnits,
        machine.rentedUnits + booking.quantity,
      );
      await this.machineRepository.save(machine);
    }

    booking.status = BookingStatus.APPROVED;
    booking.approvedAt = new Date();
    booking.approvedById = adminId;
    if (adminNotes) {
      booking.adminNotes = adminNotes;
    }

    await this.bookingRepository.save(booking);

    await this.createSystemMessage(
      bookingId,
      adminId,
      'Booking has been approved! Your mining rental is now active.',
    );

    return this.findOne(bookingId, undefined, true);
  }

  async rejectBooking(
    bookingId: string,
    adminId: string,
    adminNotes?: string,
  ): Promise<Booking> {
    const booking = await this.findOne(bookingId, undefined, true);

    if (
      booking.status === BookingStatus.APPROVED ||
      booking.status === BookingStatus.REJECTED
    ) {
      throw new BadRequestException(
        'Cannot reject an already processed booking',
      );
    }

    booking.status = BookingStatus.REJECTED;
    booking.rejectedAt = new Date();
    booking.approvedById = adminId;
    if (adminNotes) {
      booking.adminNotes = adminNotes;
    }

    await this.bookingRepository.save(booking);

    await this.createSystemMessage(
      bookingId,
      adminId,
      `Booking has been rejected.${adminNotes ? ` Reason: ${adminNotes}` : ''}`,
    );

    return this.findOne(bookingId, undefined, true);
  }

  async cancelBooking(bookingId: string, userId: string): Promise<Booking> {
    const booking = await this.findOne(bookingId, userId);

    if (booking.status === BookingStatus.APPROVED) {
      throw new BadRequestException('Cannot cancel an approved booking');
    }

    booking.status = BookingStatus.CANCELLED;

    await this.bookingRepository.save(booking);

    await this.createSystemMessage(
      bookingId,
      userId,
      'Booking has been cancelled by the user.',
    );

    return this.findOne(bookingId, userId);
  }

  async sendMessage(
    bookingId: string,
    senderId: string,
    dto: CreateMessageDto,
    isAdmin: boolean = false,
  ): Promise<BookingMessage> {
    const booking = await this.findOne(
      bookingId,
      isAdmin ? undefined : senderId,
      isAdmin,
    );

    const message = this.messageRepository.create({
      bookingId,
      senderId,
      content: dto.content,
      messageType: dto.messageType || MessageType.TEXT,
      isFromAdmin: isAdmin,
    });

    return this.messageRepository.save(message);
  }

  async sendImageMessage(
    bookingId: string,
    senderId: string,
    image: Express.Multer.File,
    content?: string,
    isAdmin: boolean = false,
  ): Promise<BookingMessage> {
    await this.findOne(bookingId, isAdmin ? undefined : senderId, isAdmin);

    const imageUrl = await this.uploadService.uploadImage(image, 'bookings');

    const message = this.messageRepository.create({
      bookingId,
      senderId,
      content: content?.trim() || 'Payment proof screenshot',
      imageUrl,
      messageType: MessageType.IMAGE,
      isFromAdmin: isAdmin,
    });

    return this.messageRepository.save(message);
  }

  async getMessages(
    bookingId: string,
    userId: string,
    isAdmin: boolean = false,
  ): Promise<BookingMessage[]> {
    await this.findOne(bookingId, isAdmin ? undefined : userId, isAdmin);

    const messages = await this.messageRepository.find({
      where: { bookingId },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
    });

    return messages;
  }

  async markMessagesAsRead(
    bookingId: string,
    userId: string,
    isAdmin: boolean = false,
  ): Promise<void> {
    await this.findOne(bookingId, isAdmin ? undefined : userId, isAdmin);

    // Mark messages from the other party as read
    await this.messageRepository.update(
      {
        bookingId,
        isFromAdmin: !isAdmin,
        isRead: false,
      },
      { isRead: true },
    );
  }

  private async createSystemMessage(
    bookingId: string,
    senderId: string,
    content: string,
  ): Promise<BookingMessage> {
    const message = this.messageRepository.create({
      bookingId,
      senderId,
      content,
      messageType: MessageType.SYSTEM,
      isFromAdmin: true,
    });

    return this.messageRepository.save(message);
  }

  private async getStaffSenderId(fallbackUserId: string): Promise<string> {
    const staffUser = await this.userRepository.findOne({
      where: {
        role: In([UserRole.ADMIN, UserRole.MANAGER]),
      },
      order: { createdAt: 'ASC' },
      select: ['id'],
    });

    return staffUser?.id || fallbackUserId;
  }

  async getReceivingAddresses(
    includeInactive: boolean = false,
  ): Promise<BookingReceivingAddress[]> {
    return this.receivingAddressRepository.find({
      where: includeInactive ? {} : { isActive: true },
      order: { createdAt: 'ASC' },
      relations: ['createdBy'],
    });
  }

  async createReceivingAddress(
    createdById: string,
    dto: CreateReceivingAddressDto,
  ): Promise<BookingReceivingAddress> {
    const entity = this.receivingAddressRepository.create({
      cryptoName: dto.cryptoName.trim(),
      networkType: dto.networkType.trim(),
      address: dto.address.trim(),
      isActive: dto.isActive ?? true,
      createdById,
    });

    return this.receivingAddressRepository.save(entity);
  }

  async updateReceivingAddress(
    id: string,
    dto: UpdateReceivingAddressDto,
  ): Promise<BookingReceivingAddress> {
    const existing = await this.receivingAddressRepository.findOne({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Receiving address not found');
    }

    if (dto.cryptoName !== undefined) {
      existing.cryptoName = dto.cryptoName.trim();
    }
    if (dto.networkType !== undefined) {
      existing.networkType = dto.networkType.trim();
    }
    if (dto.address !== undefined) {
      existing.address = dto.address.trim();
    }
    if (dto.isActive !== undefined) {
      existing.isActive = dto.isActive;
    }

    await this.receivingAddressRepository.save(existing);
    return existing;
  }

  async removeReceivingAddress(id: string): Promise<void> {
    const existing = await this.receivingAddressRepository.findOne({
      where: { id },
      select: ['id', 'qrImageUrl'],
    });

    if (!existing) {
      throw new NotFoundException('Receiving address not found');
    }

    if (existing.qrImageUrl) {
      try {
        await this.uploadService.deleteImageByUrl(existing.qrImageUrl);
      } catch {
        // Keep deletion non-blocking if storage cleanup fails.
      }
    }

    await this.receivingAddressRepository.delete(id);
  }

  async uploadReceivingAddressQr(
    id: string,
    image: Express.Multer.File,
  ): Promise<BookingReceivingAddress> {
    const existing = await this.receivingAddressRepository.findOne({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Receiving address not found');
    }

    const qrImageUrl = await this.uploadService.uploadImage(image, 'bookings/qr');

    if (existing.qrImageUrl) {
      try {
        await this.uploadService.deleteImageByUrl(existing.qrImageUrl);
      } catch {
        // Do not fail the request because of old image cleanup.
      }
    }

    existing.qrImageUrl = qrImageUrl;
    return this.receivingAddressRepository.save(existing);
  }

  async getStatistics(): Promise<{
    total: number;
    pending: number;
    awaitingPayment: number;
    paymentSent: number;
    approved: number;
    rejected: number;
    cancelled: number;
  }> {
    const [
      total,
      pending,
      awaitingPayment,
      paymentSent,
      approved,
      rejected,
      cancelled,
    ] = await Promise.all([
      this.bookingRepository.count(),
      this.bookingRepository.count({
        where: { status: BookingStatus.PENDING },
      }),
      this.bookingRepository.count({
        where: { status: BookingStatus.AWAITING_PAYMENT },
      }),
      this.bookingRepository.count({
        where: { status: BookingStatus.PAYMENT_SENT },
      }),
      this.bookingRepository.count({
        where: { status: BookingStatus.APPROVED },
      }),
      this.bookingRepository.count({
        where: { status: BookingStatus.REJECTED },
      }),
      this.bookingRepository.count({
        where: { status: BookingStatus.CANCELLED },
      }),
    ]);

    return {
      total,
      pending,
      awaitingPayment,
      paymentSent,
      approved,
      rejected,
      cancelled,
    };
  }

  async getUnreadCount(
    userId: string,
    isAdmin: boolean = false,
  ): Promise<number> {
    if (isAdmin) {
      // Count unread messages from users
      return this.messageRepository.count({
        where: {
          isFromAdmin: false,
          isRead: false,
        },
      });
    } else {
      // Count unread messages from admin for this user's bookings
      const bookings = await this.bookingRepository.find({
        where: { userId },
        select: ['id'],
      });

      if (bookings.length === 0) return 0;

      const bookingIds = bookings.map((b) => b.id);

      return this.messageRepository
        .createQueryBuilder('message')
        .where('message.booking_id IN (:...bookingIds)', { bookingIds })
        .andWhere('message.isFromAdmin = :isFromAdmin', { isFromAdmin: true })
        .andWhere('message.isRead = :isRead', { isRead: false })
        .getCount();
    }
  }

  async getUserAnalytics(userId: string): Promise<{
    totalBookings: number;
    totalInvestment: number;
    totalRevenue: number;
    activeBookings: number;
    bookingsByStatus: Record<BookingStatus, number>;
    revenueByMonth: Array<{ month: string; revenue: number }>;
    revenueBreakdown: {
      today: number;
      lastWeek: number;
      lastMonth: number;
      incoming: number;
    };
    subscriptionMetrics: {
      totalSubscriptions: number;
      activeSubscriptions: number;
      totalSubscriptionValue: number;
      monthlyEarnings: number;
      subscriptionsByStatus: Record<string, number>;
      avgDailyEarnings: number;
    };
  }> {
    const bookings = await this.bookingRepository.find({
      where: { userId },
      relations: ['machine'],
    });

    const totalBookings = bookings.length;
    const totalInvestment = bookings.reduce(
      (sum, booking) => sum + Number(booking.totalPrice),
      0,
    );
    
    const approvedBookings = bookings.filter(
      (b) => b.status === BookingStatus.APPROVED,
    );
    const totalRevenue = approvedBookings.reduce(
      (sum, booking) => sum + Number(booking.totalPrice),
      0,
    );
    const activeBookings = approvedBookings.length;

    // Count bookings by status
    const bookingsByStatus = bookings.reduce(
      (acc, booking) => {
        acc[booking.status] = (acc[booking.status] || 0) + 1;
        return acc;
      },
      {} as Record<BookingStatus, number>,
    );

    // Initialize all statuses to 0
    Object.values(BookingStatus).forEach((status) => {
      if (!bookingsByStatus[status]) {
        bookingsByStatus[status] = 0;
      }
    });

    // Calculate revenue by month for approved bookings
    const revenueByMonthMap = new Map<string, { month: string; revenue: number }>();
    approvedBookings.forEach((booking) => {
      const date = new Date(booking.approvedAt || booking.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      const existing = revenueByMonthMap.get(monthKey);
      const currentRevenue = existing ? existing.revenue : 0;
      revenueByMonthMap.set(monthKey, {
        month: monthLabel,
        revenue: currentRevenue + Number(booking.totalPrice),
      });
    });

    // Convert to array and sort by month key
    const revenueByMonth = Array.from(revenueByMonthMap.entries())
      .map(([key, data]) => ({
        month: data.month,
        revenue: data.revenue,
        sortKey: key,
      }))
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map(({ month, revenue }) => ({ month, revenue }));

    // Get subscription analytics using TypeORM repository for type safety
    const subscriptions = await this.entityManager
      .getRepository('Subscription')
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.machine', 'm')
      .where('s.userId = :userId', { userId })
      .orderBy('s.createdAt', 'DESC')
      .getMany();

    const totalSubscriptions = subscriptions.length;
    const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
    const totalSubscriptionValue = subscriptions.reduce((sum, s) => sum + Number(s.amount || 0), 0);
    
    // Calculate monthly earnings from active subscriptions
    let monthlyEarnings = 0;
    let avgDailyEarnings = 0;
    
    activeSubscriptions.forEach(subscription => {
      const dailyProfit = Number(subscription.machine?.profitPerDay || 0);
      const quantity = Number(subscription.quantity || 1);
      const subscriptionDailyEarnings = dailyProfit * quantity;
      
      avgDailyEarnings += subscriptionDailyEarnings;
      monthlyEarnings += subscriptionDailyEarnings * 30; // Approximate monthly
    });

    // Count subscriptions by status
    const subscriptionsByStatus = subscriptions.reduce((acc, sub) => {
      acc[sub.status] = (acc[sub.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Initialize missing statuses
    ['pending', 'active', 'expired', 'cancelled'].forEach(status => {
      if (!subscriptionsByStatus[status]) {
        subscriptionsByStatus[status] = 0;
      }
    });

    // Revenue breakdown: today, last week, last month, incoming
    // Daily revenue per unit = profitPerDay + (pricePerMonth/30)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    const weekAgo = new Date(todayStart);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(todayStart);
    monthAgo.setDate(monthAgo.getDate() - 30);

    const getDailyRevenue = (machine: MiningMachine, quantity: number): number => {
      const profitPerDay = Number(machine?.profitPerDay || 0);
      const pricePerMonth = Number(machine?.pricePerMonth || 0);
      return (profitPerDay + pricePerMonth / 30) * quantity;
    };

    const isDateInRange = (date: Date, start: Date, end: Date): boolean =>
      date >= start && date < end;

    let revenueToday = 0;
    let revenueLastWeek = 0;
    let revenueLastMonth = 0;
    let revenueIncoming = 0;

    // From active subscriptions
    activeSubscriptions.forEach((sub) => {
      const dailyRate = getDailyRevenue(sub.machine, Number(sub.quantity || 1));
      const start = sub.startDate ? new Date(sub.startDate) : new Date(sub.createdAt);
      let end: Date;
      if (sub.endDate) {
        end = new Date(sub.endDate);
      } else {
        end = new Date(start);
        end.setDate(end.getDate() + 30); // assume 30 days if no endDate
      }

      if (isDateInRange(todayStart, start, end)) revenueToday += dailyRate;

      for (let d = 0; d < 7; d++) {
        const day = new Date(weekAgo);
        day.setDate(day.getDate() + d);
        if (isDateInRange(day, start, end)) revenueLastWeek += dailyRate;
      }
      for (let d = 0; d < 30; d++) {
        const day = new Date(monthAgo);
        day.setDate(day.getDate() + d);
        if (isDateInRange(day, start, end)) revenueLastMonth += dailyRate;
      }
      if (end > todayEnd) {
        const daysRemaining = Math.ceil((end.getTime() - todayEnd.getTime()) / (24 * 60 * 60 * 1000));
        revenueIncoming += dailyRate * Math.max(0, daysRemaining);
      }
    });

    // From approved bookings (rental period from approvedAt)
    const durationDays: Record<string, number> = {
      hour: 1 / 24,
      day: 1,
      week: 7,
      month: 30,
    };
    approvedBookings.forEach((booking) => {
      const start = new Date(booking.approvedAt || booking.createdAt);
      const days = durationDays[booking.rentalDuration] ?? 1;
      const end = new Date(start);
      end.setDate(end.getDate() + days);
      const dailyRate = getDailyRevenue(booking.machine, booking.quantity);

      if (isDateInRange(todayStart, start, end)) revenueToday += dailyRate;

      for (let d = 0; d < 7; d++) {
        const day = new Date(weekAgo);
        day.setDate(day.getDate() + d);
        if (isDateInRange(day, start, end)) revenueLastWeek += dailyRate;
      }
      for (let d = 0; d < 30; d++) {
        const day = new Date(monthAgo);
        day.setDate(day.getDate() + d);
        if (isDateInRange(day, start, end)) revenueLastMonth += dailyRate;
      }
      if (end > todayEnd) {
        const daysRemaining = Math.ceil((end.getTime() - todayEnd.getTime()) / (24 * 60 * 60 * 1000));
        revenueIncoming += dailyRate * Math.min(daysRemaining, days);
      }
    });

    return {
      totalBookings,
      totalInvestment,
      totalRevenue,
      activeBookings,
      bookingsByStatus,
      revenueByMonth,
      revenueBreakdown: {
        today: Math.round(revenueToday * 100) / 100,
        lastWeek: Math.round(revenueLastWeek * 100) / 100,
        lastMonth: Math.round(revenueLastMonth * 100) / 100,
        incoming: Math.round(revenueIncoming * 100) / 100,
      },
      subscriptionMetrics: {
        totalSubscriptions,
        activeSubscriptions: activeSubscriptions.length,
        totalSubscriptionValue,
        monthlyEarnings,
        subscriptionsByStatus,
        avgDailyEarnings,
      },
    };
  }
}
