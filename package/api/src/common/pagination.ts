import { app as appConfig } from 'config/default'

export interface PaginationParams {
  page: number
  perPage: number
}

export function parsePaginationParams(
  page: unknown,
  perPage: unknown,
  defaults: { page?: number; perPage?: number; maxPerPage?: number } = {},
): PaginationParams {
  const {
    page: defaultPage = 1,
    perPage: defaultPerPage = 10,
    maxPerPage = appConfig.pagination.maxPerPage,
  } = defaults

  let parsedPage = parseInt(String(page), 10) || defaultPage
  let parsedPerPage = parseInt(String(perPage), 10) || defaultPerPage

  parsedPage = parsedPage < 1 ? 1 : parsedPage
  parsedPerPage = parsedPerPage > maxPerPage ? maxPerPage : parsedPerPage

  return {
    page: parsedPage,
    perPage: parsedPerPage,
  }
}
