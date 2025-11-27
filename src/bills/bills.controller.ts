import { Body, Controller, Delete, Get, Logger, Param, Post, Res } from '@nestjs/common';
import { CommonUtils } from 'src/common/common.utils';
import { CreateBillDto } from 'src/dtos/bill.dto';
import { BillsService } from './bills.service';
import { QueryOptions } from 'mongoose';
import { Bill } from 'src/schemas/bill.schema';
import { UsersService } from 'src/users/users.service';
import type { Response } from 'express';
import { SearchRequestDTO } from 'src/dtos/search.dto';
// import type { SearchRequest } from 'src/common/interface/pagination.interface';      // If you don't want to use class

@Controller('billings')
export class BillsController {
  constructor(
    private readonly billService: BillsService,
    private readonly userService: UsersService,
  ) {}

  @Post('')
  async create(@Body() billReq: CreateBillDto) {
    try {
      return await this.billService.create(billReq);
    } catch (error) {
      throw CommonUtils.formatError(error);
    }
  }

  @Post('search')
  async searchBill(@Body() searchQuery: SearchRequestDTO) {
    try {
      const { keyword, userId, page, limit } = searchQuery;
      const billQuery: QueryOptions<Bill> = { isDeleted: false };
      if (userId) {
        billQuery.customerId = userId;
        if (keyword) {
          const keywordRegex = new RegExp(keyword.trim(), 'i');
          billQuery.$or = [
            { billNumber: { $regex: keywordRegex } },
            { 'customer.name': { $regex: keywordRegex } },
          ];
        }
      }
      else if (keyword) {
        const keywordRegex = new RegExp(keyword.trim(), 'i');
        const matchedUsers = await this.userService.findAll({query: {$or: [{name: { $regex: keywordRegex }}, {email: { $regex: keywordRegex }}, {mobile: {$regex: keywordRegex}}]}}).then(res => res.data);
        const userIds = matchedUsers.map((u) => u.uuid);

        if (userIds.length > 0) {
          billQuery.customerId = { $in: userIds };
        } else {
          return {
            data: [],
            total: 0,
            page: page || 1,
            limit: limit || 10,
            isLastPage: true,
            isPreviousPage: false,
          };
        }

        billQuery.$or = [
          { billNumber: { $regex: keywordRegex } },
          { 'customer.name': { $regex: keywordRegex } },
        ];
      }

      return await this.billService.findAll({
        query: billQuery,
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
      return await this.billService.findById(id);
    } catch (error) {
      throw CommonUtils.formatError(error);
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      return await this.billService.remove(id);
    } catch (error) {
      throw CommonUtils.formatError(error);
    }
  }

  @Get(':id/invoice')
  async getInvoice(@Param('id') billId: string, @Res() res: Response) {
    try {
      const pdfBuffer = await this.billService.generateInvoicePdf(billId);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Length': pdfBuffer.length,
        'Content-Disposition': `inline; filename=invoice-${billId}.pdf`,
      })
      res.send(pdfBuffer);
    } catch (error) {
      Logger.log(error, "pdf buffer");
      throw CommonUtils.formatError(error);
    }
  }
}
