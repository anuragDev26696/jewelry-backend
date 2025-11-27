import { Model, PopulateOptions, QueryOptions, SortOrder } from "mongoose";

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  isLastPage: boolean;
  isPreviousPage: boolean;
}

export interface PaginationOptions<T> {
  query: Record<string, T> | QueryOptions<T>;
  page?: number;
  limit?: number;
  sortBy?: keyof T | string;
  sortOrder?: SortOrder;
  populate?: string | PopulateOptions | (string | PopulateOptions)[];
}

export interface SearchRequest {
  page?: number;
  limit?: number;
  keyword?: string;
  sortBy?: string;
  sortOrder?: SortOrder;
  userId?: string;
  billId?: string;
}

export async function paginate<T>(
  model: Model<T>,
  options: PaginationOptions<T>,
): Promise<PaginationResult<T>> {
  const { query = {}, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', populate } = options;
  const skip = (page - 1) * limit;

  let queryBuilder = model
    .find(query)
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit)
    .lean<T[]>();
  if (populate) {
    if (Array.isArray(populate)) {
      for (const pop of populate) {
        queryBuilder = queryBuilder.populate(pop as PopulateOptions);
      }
    } else {
      queryBuilder = queryBuilder.populate(populate as PopulateOptions);
    }
  }

  const [records, total] = await Promise.all([
    queryBuilder.exec(),
    model.countDocuments(query).exec(),
  ]);

  return {
    data: records,
    total,
    page,
    limit,
    isLastPage: records.length < limit,
    isPreviousPage: page > 1,
  };
}