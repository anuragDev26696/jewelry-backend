import { PaymentMode } from "../enums";

export interface PaymentType {
  uuid: string;
  billId: string;  
  customerId: string;
  amount: number;
  paymentMode: PaymentMode;
  note?: string;
  customerName?: string;
}