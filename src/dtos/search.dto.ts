import { Type } from "class-transformer";
import { IsNumber, IsOptional, IsString } from "class-validator";

export class SearchRequestDTO {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page: number;
  
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;
  
  @IsOptional()
  @IsString()
  @Type(() => String)
  keyword?: string;
  
  @IsOptional()
  @IsString()
  @Type(() => String)
  userId?: string;
  
  @IsOptional()
  @IsString()
  @Type(() => String)
  billId?: string;
  
  @IsOptional()
  @IsString()
  @Type(() => String)
  billStatus?: string;
  
  @IsOptional()
  @IsString()
  @Type(() => String)
  range: 'thisMonth' | 'lastMonth' | 'last2Months' | 'last3Months' | 'quarterly' | 'halfYearly' | 'lastYear';

}