import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ContactStatus {
  NEW = 'new',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum ContactSubject {
  GENERAL = 'general',
  BOOKING = 'booking',
  COMPLAINT = 'complaint',
  FEEDBACK = 'feedback',
  PARTNERSHIP = 'partnership',
  OTHER = 'other',
}

@Entity('contact_submissions')
export class ContactSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  firstName: string;

  @Column({ type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({
    type: 'enum',
    enum: ContactSubject,
    default: ContactSubject.GENERAL,
  })
  subject: ContactSubject;

  @Column({ type: 'text' })
  message: string;

  @Column({
    type: 'enum',
    enum: ContactStatus,
    default: ContactStatus.NEW,
  })
  status: ContactStatus;

  @Column({ type: 'text', nullable: true })
  adminNotes: string;

  @Column({ type: 'uuid', nullable: true })
  assignedToId: string;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  userAgent: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
