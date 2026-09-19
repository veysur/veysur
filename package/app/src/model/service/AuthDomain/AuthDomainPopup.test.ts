import { AuthDomainPopup } from './AuthDomainPopup'

describe('AuthDomainPopup', () => {
  beforeEach(() => {
    AuthDomainPopup.browserInterface = {
      addEventListener: jest.fn(),
      getProtocol: jest.fn().mockReturnValue('https:'),
      getOpener: jest.fn().mockReturnValue(null),
    }
  })

  describe('isPopupWindow', () => {
    it('returns true when window.opener is set', () => {
      global.window.opener = {}
      expect(AuthDomainPopup.isPopupWindow()).toBe(true)
    })

    it('returns false when window.opener is null', () => {
      global.window.opener = null
      expect(AuthDomainPopup.isPopupWindow()).toBe(false)
    })
  })

  describe('readAuthMessage', () => {
    it('sets up message listener for auth domain', () => {
      const onHandoffComplete = jest.fn()
      const authDomain = 'auth.example.com'

      AuthDomainPopup.readAuthMessage(onHandoffComplete, authDomain)

      expect(
        AuthDomainPopup.browserInterface.addEventListener,
      ).toHaveBeenCalledWith('message', expect.any(Function))
    })

    it('sends popup-ready message to opener after setting up listener', () => {
      const onHandoffComplete = jest.fn()
      const authDomain = 'auth.example.com'
      const mockOpener = { postMessage: jest.fn() }
      AuthDomainPopup.browserInterface.getOpener = jest
        .fn()
        .mockReturnValue(mockOpener)

      AuthDomainPopup.readAuthMessage(onHandoffComplete, authDomain)

      expect(mockOpener.postMessage).toHaveBeenCalledWith('popup-ready', '*')
    })

    it('does not send popup-ready if no opener', () => {
      const onHandoffComplete = jest.fn()
      const authDomain = 'auth.example.com'
      AuthDomainPopup.browserInterface.getOpener = jest
        .fn()
        .mockReturnValue(null)

      // Should not throw
      expect(() =>
        AuthDomainPopup.readAuthMessage(onHandoffComplete, authDomain),
      ).not.toThrow()
    })

    it('accepts a message from the opener even when origin does not match authDomain (reverse flow)', () => {
      const onHandoffComplete = jest.fn()
      const authDomain = 'auth.example.com'
      const mockOpener = { postMessage: jest.fn() }
      let messageHandler: (event: Partial<MessageEvent>) => void = () => {}
      AuthDomainPopup.browserInterface.getOpener = jest
        .fn()
        .mockReturnValue(mockOpener)
      AuthDomainPopup.browserInterface.addEventListener = jest
        .fn()
        .mockImplementation((type, handler) => {
          if (type === 'message') messageHandler = handler
        })

      AuthDomainPopup.readAuthMessage(onHandoffComplete, authDomain)

      messageHandler({
        origin: 'https://project.example.com',
        source: mockOpener as unknown as MessageEventSource,
        data: { auth: { user: { _id: '1' } }, rememberMe: false },
      })

      expect(onHandoffComplete).toHaveBeenCalled()
      expect(localStorage.getItem('veysur.authHandoff')).toEqual(
        JSON.stringify({ auth: { user: { _id: '1' } }, rememberMe: false }),
      )
    })

    it('ignores a message from neither authDomain nor opener', () => {
      const onHandoffComplete = jest.fn()
      const authDomain = 'auth.example.com'
      const mockOpener = { postMessage: jest.fn() }
      let messageHandler: (event: Partial<MessageEvent>) => void = () => {}
      AuthDomainPopup.browserInterface.getOpener = jest
        .fn()
        .mockReturnValue(mockOpener)
      AuthDomainPopup.browserInterface.addEventListener = jest
        .fn()
        .mockImplementation((type, handler) => {
          if (type === 'message') messageHandler = handler
        })

      AuthDomainPopup.readAuthMessage(onHandoffComplete, authDomain)

      messageHandler({
        origin: 'https://untrusted.example.com',
        source: {} as unknown as MessageEventSource,
        data: { auth: { user: { _id: '1' } }, rememberMe: false },
      })

      expect(onHandoffComplete).not.toHaveBeenCalled()
    })
  })

  describe('signalAuthComplete', () => {
    it('posts auth-complete to opener with wildcard origin', () => {
      const mockOpener = { postMessage: jest.fn() }
      AuthDomainPopup.browserInterface.getOpener = jest
        .fn()
        .mockReturnValue(mockOpener)

      AuthDomainPopup.signalAuthComplete()

      expect(mockOpener.postMessage).toHaveBeenCalledWith('auth-complete', '*')
    })

    it('does not throw if no opener', () => {
      AuthDomainPopup.browserInterface.getOpener = jest
        .fn()
        .mockReturnValue(null)

      expect(() => AuthDomainPopup.signalAuthComplete()).not.toThrow()
    })
  })
})
