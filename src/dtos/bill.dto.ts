import { IsArray, IsNotEmpty, IsNumber, IsString, Max, Min } from 'class-validator';
import { BillItem } from 'src/schemas/bill.schema';
// import { BillItem } from 'src/common/interface/item.interface';

export class CreateBillDto {
  @IsArray()
  items: BillItem[];

  @IsString() @IsNotEmpty()
  customerId: string;

  @IsNumber() @Min(0) @Max(100)
  tax: number;

  @IsNumber() @Min(0) @Max(9999999)
  discount: number;
}
