import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BillsService } from 'src/bills/bills.service';
import { CommonUtils } from 'src/common/common.utils';
import { PaymentStatus } from 'src/common/enums';
import { BillType } from 'src/common/interface/bill.interface';
import { paginate, PaginationOptions, PaginationResult } from 'src/common/interface/pagination.interface';
import { PaymentType } from 'src/common/interface/payment.interface';
import { CreatePaymentDto } from 'src/dtos/payment.dto';
import { Payment, PaymentDocument } from 'src/schemas/payment.schema';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class PaymentService {
  constructor(
    @InjectModel(Payment.name) private readonly paymentModel: Model<PaymentDocument>,
    private readonly billsService: BillsService,
    private readonly userService: UsersService,
  ) {}

  async createPayment(dto: CreatePaymentDto): Promise<{updatedBill: BillType, payment: PaymentType}> {
    try {
      const bill = await this.billsService.findById(dto.billId);
      if (!bill) throw new NotFoundException('Bill not found');
  
      if (dto.amount <= 0) throw new BadRequestException('Payment amount must be greater than zero');
  
      if (dto.amount > bill.total - (bill.totalPaid || 0)) {
        throw new BadRequestException('Payment exceeds due amount');
      }

      const user = await this.userService.findById(bill.customerId);
      if(!user) throw new NotFoundException('User not found');
  
      const payment = await this.paymentModel.create({
        ...dto,
        customerId: bill.customerId,
      });
  
      const totalPaid = (bill.totalPaid || 0) + dto.amount;
      const dueAmount = bill.total - totalPaid;
  
      await this.billsService.updateBillPayment(dto.billId, {
        totalPaid,
        dueAmount,
        paymentStatus: dueAmount === 0 ? PaymentStatus.PAID : PaymentStatus.PARTIAL_PAID,
        paymentMode: dto.paymentMode,
      });
      const updatedBill = await this.billsService.findById(dto.billId);
  
      return {
        payment: {
          ...payment.toObject(),
          customerName: user.name,
        },
        updatedBill
      };
    } catch (error) {
      throw CommonUtils.formatError(error);
    }
  }

  async findById(id: string): Promise<PaymentType> {
    try {
      const bill = await this.paymentModel.findOne({uuid: id}).lean<PaymentType>().exec();
      if (!bill)
        throw new NotFoundException('Item bill found');
      
      const user = await this.userService.findById(bill.customerId);
      if(!user) {
        throw new BadRequestException('Invalid user');
      }
      
      return {
        ...bill,
        customerName: user.name,
      };
    } catch (error) {
      throw CommonUtils.formatError(error);
    }
  }
    
  async remove(id: string): Promise<Payment> {
    try {
      const deleted = await this.paymentModel.findOneAndUpdate({uuid: id}, { isDeleted: true }, { new: true }).exec();
      if (!deleted) throw new NotFoundException('Bill not found');
      return deleted;
    } catch (error) {
      throw CommonUtils.formatError(error);
    }
  }

  async getPayments(options: PaginationOptions<Payment>): Promise<PaginationResult<PaymentType>> {
    const { query, sortBy = 'createdAt', sortOrder = 'desc' } = options;

    const result = await paginate(this.paymentModel, {
      ...options,
      sortBy, sortOrder,
      query: {...query},
    });

    const customerIds = [...new Set(result.data.map((p: PaymentType) => p.customerId))];
    const users = await this.userService.findByUuids(customerIds);
    const userMap = new Map(users.map(u => [u.uuid, u]));

    result.data = result.data.map((p: PaymentType) => ({
      ...p,
      customerName: userMap.get(p.customerId)?.name || '',
    }));

    return result;
  }
}
