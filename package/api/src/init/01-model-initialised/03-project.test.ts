import type { Server } from '@datacapy/server'

import { isSelfHosted } from 'config/edition'

import { initProject } from './03-project'

jest.mock('config/edition', () => ({
  ...jest.requireActual('config/edition'),
  isSelfHosted: jest.fn(),
}))

const buildServer = () => {
  const ensureLoaded = jest.fn().mockResolvedValue({ _id: 'default' })
  const initForProject = jest.fn().mockResolvedValue({})
  const server = {
    logger: { info: jest.fn() },
    modelManager: {
      services: {
        project: { ensureLoaded },
        settingSurvey: { initForProject },
      },
    },
  } as unknown as Server
  return { server, ensureLoaded, initForProject }
}

describe('initProject', () => {
  beforeEach(() => jest.mocked(isSelfHosted).mockReset())

  it('loads the project and creates its survey settings when self-hosted', async () => {
    jest.mocked(isSelfHosted).mockReturnValue(true)
    const { server, ensureLoaded, initForProject } = buildServer()

    await initProject(server)

    expect(ensureLoaded).toHaveBeenCalledTimes(1)
    expect(initForProject).toHaveBeenCalledWith('default', expect.anything())
  })

  it('does nothing outside self-hosted', async () => {
    jest.mocked(isSelfHosted).mockReturnValue(false)
    const { server, ensureLoaded, initForProject } = buildServer()

    await initProject(server)

    expect(ensureLoaded).not.toHaveBeenCalled()
    expect(initForProject).not.toHaveBeenCalled()
  })
})
