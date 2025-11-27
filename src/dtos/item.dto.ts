import { IsEnum, IsNotEmpty, IsNumber, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
export class CreateItemDto {
  @IsNotEmpty() @MinLength(2)  @MaxLength(50) @IsString()
  name: string;

  @IsString() @IsEnum(['Gold', 'Silver', 'Diamond'])
  type: string;

  @IsNumber() @Min(0) @Max(1000000)
  weight: number;
  
  @IsNumber() @Min(0) @Max(1000000)
  pricePerGram: number;
  
  @IsNumber() @Min(0) @Max(100)
  makingCharge: number;
}
