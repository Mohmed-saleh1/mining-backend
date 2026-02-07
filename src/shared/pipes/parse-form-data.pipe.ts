import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class ParseFormDataPipe implements PipeTransform {
  transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    // Transform string values to appropriate types
    const transformed = { ...value };
    
    // List of numeric fields
    const numericFields = [
      'hashRate',
      'powerConsumption',
      'efficiency',
      'pricePerHour',
      'pricePerDay',
      'pricePerWeek',
      'pricePerMonth',
      'profitPerHour',
      'profitPerDay',
      'profitPerWeek',
      'profitPerMonth',
      'totalUnits',
      'sortOrder',
    ];

    // List of boolean fields
    const booleanFields = ['isActive', 'isFeatured'];

    // Convert numeric fields
    numericFields.forEach((field) => {
      if (transformed[field] !== undefined && transformed[field] !== null) {
        // If already a number, skip conversion
        if (typeof transformed[field] === 'number') {
          return;
        }
        
        if (transformed[field] === '') {
          // Empty string for optional fields - keep as undefined
          if (field !== 'pricePerHour' && field !== 'pricePerDay' && 
              field !== 'pricePerWeek' && field !== 'pricePerMonth' &&
              field !== 'profitPerHour' && field !== 'profitPerDay' &&
              field !== 'profitPerWeek' && field !== 'profitPerMonth') {
            delete transformed[field];
          } else {
            // Required fields with empty string should be 0 or removed
            transformed[field] = 0;
          }
        } else {
          const numValue = Number(transformed[field]);
          if (!isNaN(numValue)) {
            transformed[field] = numValue;
          } else {
            // Invalid number - remove for optional fields, set to 0 for required
            if (field !== 'pricePerHour' && field !== 'pricePerDay' && 
                field !== 'pricePerWeek' && field !== 'pricePerMonth' &&
                field !== 'profitPerHour' && field !== 'profitPerDay' &&
                field !== 'profitPerWeek' && field !== 'profitPerMonth') {
              delete transformed[field];
            } else {
              transformed[field] = 0;
            }
          }
        }
      }
    });

    // Convert boolean fields
    booleanFields.forEach((field) => {
      if (transformed[field] !== undefined && transformed[field] !== null) {
        // If already a boolean, skip conversion
        if (typeof transformed[field] === 'boolean') {
          return;
        }
        
        if (transformed[field] === '') {
          // Empty string - remove for optional fields
          delete transformed[field];
        } else if (typeof transformed[field] === 'string') {
          transformed[field] = transformed[field] === 'true' || transformed[field] === '1';
        }
      }
    });

    // Use class-transformer to transform to the DTO class
    return plainToInstance(metatype, transformed);
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }
}
