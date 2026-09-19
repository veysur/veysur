import axios, { AxiosInstance } from 'axios'
import { RestClient } from './RestClient'

describe('RestClient', () => {
  const baseUrl = 'https://api.test.com'
  const restHeaders = {
    Authorization: 'Bearer token',
    'Content-Type': 'application/json',
  }

  let restClient: RestClient
  let axiosInstance: AxiosInstance

  beforeEach(() => {
    axiosInstance = axios.create({ baseURL: baseUrl, headers: restHeaders })
    jest.spyOn(axios, 'create').mockReturnValue(axiosInstance)
    restClient = new RestClient(baseUrl, { headers: restHeaders })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  const testHttpMethod = (method: 'get' | 'post' | 'delete') => {
    test(`should perform ${method.toUpperCase()} request and return response data`, async () => {
      const mockData = { data: 'test data' }
      jest
        .spyOn(axiosInstance, 'request')
        .mockResolvedValueOnce({ data: mockData })

      let data
      if (method === 'post') {
        data = await restClient.post('/test-endpoint', { key: 'value' })
      } else {
        data = await restClient[method]('/test-endpoint')
      }

      expect(axiosInstance.request).toHaveBeenCalledWith({
        method,
        url: '/test-endpoint',
        ...(method === 'post' && { data: { key: 'value' } }),
      })
      expect(data).toEqual(mockData)
    })
  }

  testHttpMethod('get')
  testHttpMethod('post')
  testHttpMethod('delete')

  test('should accept headers', async () => {
    const mockData = { data: 'test data' }
    const additionalHeaders = { 'X-Custom-Header': 'custom-value' }
    jest
      .spyOn(axiosInstance, 'request')
      .mockResolvedValueOnce({ data: mockData })

    await restClient.get('/test-endpoint', { headers: additionalHeaders })

    expect(axiosInstance.request).toHaveBeenCalledWith({
      method: 'get',
      url: '/test-endpoint',
      headers: { ...additionalHeaders },
    })
  })

  test('should handle request error', async () => {
    const errorMessage = 'Network Error'
    jest
      .spyOn(axiosInstance, 'request')
      .mockRejectedValueOnce(new Error(errorMessage))

    await expect(restClient.get('/test-endpoint')).rejects.toThrow(errorMessage)
  })

  describe('jwtRefresher interceptor', () => {
    // Mock at the adapter level so request interceptors still run
    const mockAdapterResponse = {
      data: {},
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    }

    beforeEach(() => {
      axiosInstance.defaults.adapter = jest
        .fn()
        .mockResolvedValue(mockAdapterResponse)
    })

    test('calls the refresher before a request', async () => {
      const refresher = jest.fn().mockResolvedValue(undefined)
      restClient.setJwtRefresher(refresher)

      await restClient.get('/test-endpoint')

      expect(refresher).toHaveBeenCalledTimes(1)
    })

    test('does not throw when no refresher is set', async () => {
      await expect(restClient.get('/test-endpoint')).resolves.not.toThrow()
    })

    test('skips the refresher for /auth/refresh to prevent an infinite loop', async () => {
      const refresher = jest.fn().mockResolvedValue(undefined)
      restClient.setJwtRefresher(refresher)

      await restClient.post('/auth/refresh', {})

      expect(refresher).not.toHaveBeenCalled()
    })

    test('uses the most recently registered refresher', async () => {
      const first = jest.fn().mockResolvedValue(undefined)
      const second = jest.fn().mockResolvedValue(undefined)
      restClient.setJwtRefresher(first)
      restClient.setJwtRefresher(second)

      await restClient.get('/test-endpoint')

      expect(first).not.toHaveBeenCalled()
      expect(second).toHaveBeenCalledTimes(1)
    })
  })
})
