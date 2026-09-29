import { Server } from '@datacapy/server'
import { DEFAULT_PROJECT_ID } from 'veysur-common'
import { initProjectDefault } from './00-project-default'

describe('initProjectDefault', () => {
  const originalDeploymentMode = process.env.DEPLOYMENT_MODE

  afterEach(() => {
    process.env.DEPLOYMENT_MODE = originalDeploymentMode
  })

  const buildServer = () => {
    const use = jest.fn()
    const server = { router: { use } } as unknown as Server
    return { server, use }
  }

  test('registers no middleware when not self-hosted', () => {
    process.env.DEPLOYMENT_MODE = 'cloud'
    const { server, use } = buildServer()

    initProjectDefault(server)

    expect(use).not.toHaveBeenCalled()
  })

  test('sets X-Project-Id to the default project when absent, self-hosted', () => {
    process.env.DEPLOYMENT_MODE = 'self-hosted'
    const { server, use } = buildServer()

    initProjectDefault(server)

    expect(use).toHaveBeenCalledTimes(1)
    const middleware = use.mock.calls[0][0]

    const req = { headers: {} as Record<string, string> }
    const next = jest.fn()
    middleware(req, {}, next)

    expect(req.headers['x-project-id']).toBe(DEFAULT_PROJECT_ID)
    expect(next).toHaveBeenCalledTimes(1)
  })

  test('leaves an existing X-Project-Id header untouched, self-hosted', () => {
    process.env.DEPLOYMENT_MODE = 'self-hosted'
    const { server, use } = buildServer()

    initProjectDefault(server)

    const middleware = use.mock.calls[0][0]
    const req = { headers: { 'x-project-id': 'other-project' } }
    const next = jest.fn()
    middleware(req, {}, next)

    expect(req.headers['x-project-id']).toBe('other-project')
    expect(next).toHaveBeenCalledTimes(1)
  })
})
