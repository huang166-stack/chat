export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export function getPagination(page = 1, pageSize = 20) {
  const safePage = Math.max(1, Math.trunc(page));
  const safePageSize = Math.min(100, Math.max(1, Math.trunc(pageSize)));

  return {
    page: safePage,
    pageSize: safePageSize,
    skip: (safePage - 1) * safePageSize,
    take: safePageSize,
  };
}

export function toPage<T>(list: T[], total: number, page: number, pageSize: number): PageResult<T> {
  return { list, total, page, pageSize };
}