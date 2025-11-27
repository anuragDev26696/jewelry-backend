import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { UsersService } from 'src/users/users.service';
import { CreatePaymentDto } from 'src/dtos/payment.dto';
import { CommonUtils } from 'src/common/common.utils';
import { SearchRequestDTO } from 'src/dtos/search.dto';
import { Payment } from 'src/schemas/payment.schema';
import { QueryOptions } from 'mongoose';

@Controller('payment')
export class PaymentController {
  constructor(
    private readonly _service: PaymentService,
    private readonly userService: UsersService,
  ) {}

  @Post('')
  async create(@Body() paymentReq: CreatePaymentDto) {
    try {
      return await this._service.createPayment(paymentReq);
    } catch (error) {
      throw CommonUtils.formatError(error);
    }
  }

  @Post('search')
  async searchPayments(@Body() searchQuery: SearchRequestDTO) {
    try {
      const { userId, billId, page, limit } = searchQuery;
      const paymentQuery: QueryOptions<Payment> = { isDeleted: false };
      if (userId) {
        paymentQuery.customerId = userId;
      }
      if (billId) {
        paymentQuery.billId = billId;
      }

      return await this._service.getPayments({
        query: paymentQuery,
        page,
        limit,
      });
    } catch (error) {
      throw CommonUtils.formatError(error);
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      return await this._service.findById(id);
    } catch (error) {
      throw CommonUtils.formatError(error);
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      return await this._service.remove(id);
    } catch (error) {
      throw CommonUtils.formatError(error);
    }
  }
}
