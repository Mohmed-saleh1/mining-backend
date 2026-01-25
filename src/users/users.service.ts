import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import {
  CreateUserDto,
  UpdateUserDto,
  UpdateProfileDto,
  ChangePasswordDto,
  UserResponseDto,
} from './dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException({
        message: 'User with this email already exists',
        errorCode: 'USER_001',
        errorDescription: `A user with email '${createUserDto.email}' already exists`,
      });
    }

    const user = this.userRepository.create(createUserDto);
    const savedUser = await this.userRepository.save(user);

    return UserResponseDto.fromEntity(savedUser);
  }

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.userRepository.find({
      order: { createdAt: 'DESC' },
    });
    return users.map((user) => UserResponseDto.fromEntity(user));
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException({
        message: 'User not found',
        errorCode: 'USER_002',
        errorDescription: `User with ID '${id}' does not exist`,
      });
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.findOne(id);

    Object.assign(user, updateUserDto);
    const updatedUser = await this.userRepository.save(user);

    return UserResponseDto.fromEntity(updatedUser);
  }

  async updateProfile(
    id: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    const user = await this.findOne(id);

    Object.assign(user, updateProfileDto);
    const updatedUser = await this.userRepository.save(user);

    return UserResponseDto.fromEntity(updatedUser);
  }

  async changePassword(
    id: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const user = await this.findOne(id);

    const isValidPassword = await user.validatePassword(
      changePasswordDto.currentPassword,
    );

    if (!isValidPassword) {
      throw new BadRequestException({
        message: 'Current password is incorrect',
        errorCode: 'USER_003',
        errorDescription: 'The current password provided is incorrect',
      });
    }

    user.password = changePasswordDto.newPassword;
    await this.userRepository.save(user);
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userRepository.update(id, { lastLoginAt: new Date() });
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
  }

  async deactivate(id: string): Promise<UserResponseDto> {
    const user = await this.findOne(id);
    user.isActive = false;
    const updatedUser = await this.userRepository.save(user);
    return UserResponseDto.fromEntity(updatedUser);
  }

  async activate(id: string): Promise<UserResponseDto> {
    const user = await this.findOne(id);
    user.isActive = true;
    const updatedUser = await this.userRepository.save(user);
    return UserResponseDto.fromEntity(updatedUser);
  }

  async setPasswordResetToken(
    id: string,
    token: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.userRepository.update(id, {
      passwordResetToken: token,
      passwordResetTokenExpires: expiresAt,
    });
  }

  async setEmailVerificationToken(
    id: string,
    token: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.userRepository.update(id, {
      emailVerificationToken: token,
      emailVerificationTokenExpires: expiresAt,
    });
  }

  async verifyEmail(id: string): Promise<void> {
    await this.userRepository.update(id, {
      emailVerified: true,
      emailVerificationToken: undefined,
      emailVerificationTokenExpires: undefined,
    });
  }

  async resetPassword(id: string, newPassword: string): Promise<void> {
    const user = await this.findOne(id);
    user.password = newPassword;
    user.passwordResetToken = null;
    user.passwordResetTokenExpires = null;
    await this.userRepository.save(user);
  }

  async findByPasswordResetToken(token: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { passwordResetToken: token },
    });
  }

  async findByEmailVerificationToken(token: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { emailVerificationToken: token },
    });
  }
}
