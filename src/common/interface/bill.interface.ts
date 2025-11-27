import { PaymentMode, PaymentStatus } from '../enums';
import { ItemType } from './item.interface';
// import { User } from 'src/schemas/user.schema';

export interface BillType {
  billNumber: string;
  customerId: string;
  items: Omit<ItemType, 'createdAt'|'updatedAt'|'uuid'|'isDeleted'>[];
  customerName?: string;
  customerPhone?: string;
  subtotal: number;
  total: number;
  tax: number;
  taxAmount: number;
  discount: number;
  totalPaid: number;
  dueAmount: number;
  paymentMode: PaymentMode|string;
  paymentStatus: PaymentStatus;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  uuid: string;
}

export type UpdateBillPayment = { totalPaid: number; dueAmount: number; paymentStatus: PaymentStatus, paymentMode: PaymentMode }