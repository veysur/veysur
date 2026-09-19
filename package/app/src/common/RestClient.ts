import axios, {
  AxiosInstance,
  RawAxiosRequestHeaders,
  GenericAbortSignal,
  AxiosRequestConfig,
} from 'axios'

import { versionMismatchStore } from './versionMismatchStore'

type Data = object

export class RestClient {
  private baseUrl: string
  private client: AxiosInstance
  private jwtRefresher: (() => Promise<void>) | null = null

  constructor(baseUrl: string, config?: AxiosRequestConfig) {
    this.baseUrl = baseUrl
    this.client = axios.create({ baseURL: baseUrl, ...config })

    this.client.interceptors.response.use((response) => {
      const apiVersion = response.headers['x-api-version']
      if (
        apiVersion &&
        apiVersion !== 'dev' &&
        apiVersion !== process.env.BUILD_VERSION
      ) {
        versionMismatchStore.getState().setMismatch(true)
      }
      return response
    })

    // Refresh the JWT before every request if needed. Skip the refresh endpoint
    // itself to prevent an infinite loop: interceptor → authRefresh → /auth/refresh → interceptor.
    this.client.interceptors.request.use(async (config) => {
      if (this.jwtRefresher && config.url !== '/auth/refresh') {
        await this.jwtRefresher()
      }
      return config
    })
  }

  setJwtRefresher(fn: () => Promise<void>): void {
    this.jwtRefresher = fn
  }

  reCreate(restClient: RestClient): RestClient {
    return new RestClient(restClient.baseUrl)
  }

  private async request<T>(
    method: string,
    endpoint: string,
    config: AxiosRequestConfig = {},
  ): Promise<T> {
    const response = await this.client.request<T>({
      method,
      url: endpoint,
      ...config,
    })
    return response.data
  }

  async get<T>(
    endpoint: string,
    config: AxiosRequestConfig = {},
    signal?: GenericAbortSignal,
  ): Promise<T> {
    return this.request<T>('get', endpoint, { ...config, signal })
  }

  async post<T>(
    endpoint: string,
    data: Data,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return this.request<T>('post', endpoint, { data, ...config })
  }

  async patch<T>(
    endpoint: string,
    data: Data,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return this.request<T>('patch', endpoint, { data, ...config })
  }

  async put<T>(
    endpoint: string,
    data: Data,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return this.request<T>('put', endpoint, { data, ...config })
  }

  async delete<T>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>('delete', endpoint, { ...config })
  }

  setDefaultHeaders(headers: RawAxiosRequestHeaders): void {
    Object.keys(headers).forEach((key) => {
      if (headers[key]) {
        this.client.defaults.headers[key] = headers[key]
      }
    })
  }

  getBaseUrl(): string {
    return this.baseUrl
  }

  getAxios(): AxiosInstance {
    return this.client
  }
}
