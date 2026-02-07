import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
  ParseEnumPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LegalDocumentsService } from './legal-documents.service';
import {
  CreateLegalDocumentDto,
  UpdateLegalDocumentDto,
} from './dto';
import { DocumentType } from './entities/legal-document.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { BaseResponseDto } from '../shared/dto/base-response.dto';

@ApiTags('Legal Documents')
@Controller('legal-documents')
export class LegalDocumentsController {
  constructor(
    private readonly legalDocumentsService: LegalDocumentsService,
  ) {}

  // ============ PUBLIC ENDPOINTS ============

  @Get('public/privacy-policy')
  @ApiOperation({ summary: 'Get privacy policy (Public)' })
  @ApiResponse({
    status: 200,
    description: 'Returns the privacy policy',
  })
  async getPrivacyPolicy() {
    const document = await this.legalDocumentsService.findByType(
      DocumentType.PRIVACY_POLICY,
    );
    return BaseResponseDto.success(
      'Privacy policy retrieved successfully',
      document,
    );
  }

  @Get('public/terms-of-service')
  @ApiOperation({ summary: 'Get terms of service (Public)' })
  @ApiResponse({
    status: 200,
    description: 'Returns the terms of service',
  })
  async getTermsOfService() {
    const document = await this.legalDocumentsService.findByType(
      DocumentType.TERMS_OF_SERVICE,
    );
    return BaseResponseDto.success(
      'Terms of service retrieved successfully',
      document,
    );
  }

  // ============ ADMIN ENDPOINTS ============

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a legal document (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Legal document created successfully',
  })
  @ApiResponse({ status: 409, description: 'Document type already exists' })
  async create(@Body() createLegalDocumentDto: CreateLegalDocumentDto) {
    const document = await this.legalDocumentsService.create(
      createLegalDocumentDto,
    );
    return BaseResponseDto.success(
      'Legal document created successfully',
      document,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all legal documents (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Returns all legal documents',
  })
  async findAll() {
    const documents = await this.legalDocumentsService.findAll();
    return BaseResponseDto.success(
      'Legal documents retrieved successfully',
      documents,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a legal document by ID (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Returns the legal document',
  })
  @ApiResponse({ status: 404, description: 'Legal document not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const document = await this.legalDocumentsService.findOne(id);
    return BaseResponseDto.success(
      'Legal document retrieved successfully',
      document,
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a legal document (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Legal document updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Legal document not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateLegalDocumentDto: UpdateLegalDocumentDto,
  ) {
    const document = await this.legalDocumentsService.update(
      id,
      updateLegalDocumentDto,
    );
    return BaseResponseDto.success(
      'Legal document updated successfully',
      document,
    );
  }

  @Patch('type/:type')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a legal document by type (Admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Legal document updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Legal document not found' })
  async updateByType(
    @Param('type', new ParseEnumPipe(DocumentType)) type: DocumentType,
    @Body() updateLegalDocumentDto: UpdateLegalDocumentDto,
  ) {
    const document = await this.legalDocumentsService.updateByType(
      type,
      updateLegalDocumentDto,
    );
    return BaseResponseDto.success(
      'Legal document updated successfully',
      document,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a legal document (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Legal document deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Legal document not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.legalDocumentsService.remove(id);
    return BaseResponseDto.success('Legal document deleted successfully', null);
  }
}
