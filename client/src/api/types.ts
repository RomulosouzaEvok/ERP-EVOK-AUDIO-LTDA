export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListResponse<T> {
  success: true;
  data: T[];
  pagination: Pagination;
}

export interface ItemResponse<T> {
  success: true;
  data: T;
}
