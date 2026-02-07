import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LegalDocument, DocumentType } from './entities/legal-document.entity';
import {
  CreateLegalDocumentDto,
  UpdateLegalDocumentDto,
} from './dto';

@Injectable()
export class LegalDocumentsService {
  constructor(
    @InjectRepository(LegalDocument)
    private readonly legalDocumentRepository: Repository<LegalDocument>,
  ) {}

  async create(createLegalDocumentDto: CreateLegalDocumentDto): Promise<LegalDocument> {
    // Check if document of this type already exists
    const existing = await this.legalDocumentRepository.findOne({
      where: { type: createLegalDocumentDto.type },
    });

    if (existing) {
      throw new ConflictException(
        `A ${createLegalDocumentDto.type} document already exists. Use update instead.`,
      );
    }

    const document = this.legalDocumentRepository.create(createLegalDocumentDto);
    return await this.legalDocumentRepository.save(document);
  }

  async findAll(): Promise<LegalDocument[]> {
    return await this.legalDocumentRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<LegalDocument> {
    const document = await this.legalDocumentRepository.findOne({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException(`Legal document with ID ${id} not found`);
    }

    return document;
  }

  async findByType(type: DocumentType): Promise<LegalDocument | null> {
    return await this.legalDocumentRepository.findOne({
      where: { type },
    });
  }

  async update(
    id: string,
    updateLegalDocumentDto: UpdateLegalDocumentDto,
  ): Promise<LegalDocument> {
    const document = await this.findOne(id);

    Object.assign(document, updateLegalDocumentDto);
    return await this.legalDocumentRepository.save(document);
  }

  async updateByType(
    type: DocumentType,
    updateLegalDocumentDto: UpdateLegalDocumentDto,
  ): Promise<LegalDocument> {
    const document = await this.findByType(type);

    if (!document) {
      throw new NotFoundException(`${type} document not found`);
    }

    Object.assign(document, updateLegalDocumentDto);
    return await this.legalDocumentRepository.save(document);
  }

  async remove(id: string): Promise<void> {
    const document = await this.findOne(id);
    await this.legalDocumentRepository.remove(document);
  }
}
