import { IsNumber, IsString, IsNotEmpty, Min } from 'class-validator';
import { PaymentMode } from 'src/common/enums';

export class CreatePaymentDto {
  @IsString() @IsNotEmpty()
  billId: string;

  @IsNumber() @Min(0)
  amount: number;

  @IsString() @IsNotEmpty()
  paymentMode: PaymentMode;

  @IsString()
  note?: string;
}
