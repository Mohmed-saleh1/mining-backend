import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import {
  Booking,
  BookingStatus,
  RentalDuration,
} from './entities/booking.entity';
import { BookingMessage, MessageType } from './entities/booking-message.entity';
import { MiningMachine } from '../mining-machines/entities/mining-machine.entity';
import { CreateBookingDto } from './dto/create-booking.dto';
import {
  UpdateBookingDto,
  SendPaymentAddressDto,
  MarkPaymentSentDto,
} from './dto/update-booking.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(BookingMessage)
    private readonly messageRepository: Repository<BookingMessage>,
    @InjectRepository(MiningMachine)
    private readonly machineRepository: Repository<MiningMachine>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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

    const booking = this.bookingRepository.create({
      userId,
      machineId: createDto.machineId,
      rentalDuration: createDto.rentalDuration,
      quantity: createDto.quantity,
      totalPrice,
      userNotes: createDto.userNotes,
      status: BookingStatus.PENDING,
    });

    const savedBooking = await this.bookingRepository.save(booking);

    // Create system message
    await this.createSystemMessage(
      savedBooking.id,
      userId,
      `Booking request created for ${machine.name}. Waiting for admin to provide payment address.`,
    );

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

    if (booking.status !== BookingStatus.PAYMENT_SENT) {
      throw new BadRequestException(
        'Can only approve bookings with payment sent',
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

    // Get subscription analytics
    const subscriptions = await this.entityManager.query(`
      SELECT 
        s.*,
        m.name as machine_name,
        m."miningCoin" as mining_coin,
        m."dailyProfit" as daily_profit
      FROM subscriptions s
      LEFT JOIN mining_machines m ON s."machineId" = m.id
      WHERE s."userId" = $1
      ORDER BY s."createdAt" DESC
    `, [userId]);

    const totalSubscriptions = subscriptions.length;
    const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
    const totalSubscriptionValue = subscriptions.reduce((sum, s) => sum + Number(s.amount || 0), 0);
    
    // Calculate monthly earnings from active subscriptions
    let monthlyEarnings = 0;
    let avgDailyEarnings = 0;
    
    activeSubscriptions.forEach(subscription => {
      const dailyProfit = Number(subscription.daily_profit || 0);
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

    return {
      totalBookings,
      totalInvestment,
      totalRevenue,
      activeBookings,
      bookingsByStatus,
      revenueByMonth,
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
