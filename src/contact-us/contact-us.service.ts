import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Like } from 'typeorm';
import { ContactSubmission, ContactStatus } from './entities/contact-us.entity';
import { CreateContactSubmissionDto } from './dto/create-contact-us.dto';
import { UpdateContactSubmissionDto } from './dto/update-contact-us.dto';

@Injectable()
export class ContactUsService {
  constructor(
    @InjectRepository(ContactSubmission)
    private readonly contactRepository: Repository<ContactSubmission>,
  ) {}

  async create(
    createDto: CreateContactSubmissionDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<ContactSubmission> {
    const submission = this.contactRepository.create({
      ...createDto,
      ipAddress,
      userAgent,
      status: ContactStatus.NEW,
    });

    return await this.contactRepository.save(submission);
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    status?: ContactStatus,
    subject?: string,
    search?: string,
  ): Promise<{
    data: ContactSubmission[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<ContactSubmission> = {};

    if (status) {
      where.status = status;
    }

    if (subject) {
      where.subject = subject as any;
    }

    if (search) {
      where.firstName = Like(`%${search}%`);
    }

    const [data, total] = await this.contactRepository.findAndCount({
      where,
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

  async findOne(id: string): Promise<ContactSubmission> {
    const submission = await this.contactRepository.findOne({
      where: { id },
    });

    if (!submission) {
      throw new NotFoundException('Contact submission not found');
    }

    return submission;
  }

  async update(
    id: string,
    updateDto: UpdateContactSubmissionDto,
  ): Promise<ContactSubmission> {
    const submission = await this.findOne(id);

    Object.assign(submission, updateDto);

    return await this.contactRepository.save(submission);
  }

  async remove(id: string): Promise<void> {
    const submission = await this.findOne(id);
    await this.contactRepository.remove(submission);
  }

  async markAsRead(id: string): Promise<ContactSubmission> {
    const submission = await this.findOne(id);
    submission.isRead = true;
    return await this.contactRepository.save(submission);
  }

  async markAsUnread(id: string): Promise<ContactSubmission> {
    const submission = await this.findOne(id);
    submission.isRead = false;
    return await this.contactRepository.save(submission);
  }

  async getStatistics(): Promise<{
    total: number;
    new: number;
    inProgress: number;
    resolved: number;
    closed: number;
    unread: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
  }> {
    const [total, newCount, inProgress, resolved, closed, unread] =
      await Promise.all([
        this.contactRepository.count(),
        this.contactRepository.count({
          where: { status: ContactStatus.NEW },
        }),
        this.contactRepository.count({
          where: { status: ContactStatus.IN_PROGRESS },
        }),
        this.contactRepository.count({
          where: { status: ContactStatus.RESOLVED },
        }),
        this.contactRepository.count({
          where: { status: ContactStatus.CLOSED },
        }),
        this.contactRepository.count({
          where: { isRead: false },
        }),
      ]);

    // Get today's count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await this.contactRepository
      .createQueryBuilder('contact')
      .where('contact.createdAt >= :today', { today })
      .getCount();

    // Get this week's count
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const thisWeekCount = await this.contactRepository
      .createQueryBuilder('contact')
      .where('contact.createdAt >= :weekAgo', { weekAgo })
      .getCount();

    // Get this month's count
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const thisMonthCount = await this.contactRepository
      .createQueryBuilder('contact')
      .where('contact.createdAt >= :monthAgo', { monthAgo })
      .getCount();

    return {
      total,
      new: newCount,
      inProgress,
      resolved,
      closed,
      unread,
      today: todayCount,
      thisWeek: thisWeekCount,
      thisMonth: thisMonthCount,
    };
  }

  async getRecent(limit: number = 10): Promise<ContactSubmission[]> {
    return await this.contactRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
