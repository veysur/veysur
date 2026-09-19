import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useBeforeUnload, useBlocker } from 'react-router-dom'
import { useUnifiedNavigationBlocker } from './useUnifiedNavigationBlocker'

jest.mock('react-router-dom', () => ({
  useBeforeUnload: jest.fn(),
  useBlocker: jest.fn(),
}))

function TestComponent({
  blockerConditions,
  options = {},
  allowedPathPattern,
}: {
  blockerConditions: { condition: boolean; message: string }[]
  options?: Parameters<typeof useUnifiedNavigationBlocker>[1]
  allowedPathPattern?: RegExp
}) {
  return useUnifiedNavigationBlocker(
    blockerConditions,
    options,
    allowedPathPattern,
  )
}

describe('useUnifiedNavigationBlocker', () => {
  const mockUseBeforeUnload = useBeforeUnload as jest.Mock
  const mockUseBlocker = useBlocker as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseBlocker.mockReturnValue({
      state: 'unblocked',
      proceed: jest.fn(),
      reset: jest.fn(),
    })
  })

  describe('blocking conditions', () => {
    it('should not block when no conditions are met', () => {
      render(
        React.createElement(TestComponent, {
          blockerConditions: [
            { condition: false, message: 'Message 1' },
            { condition: false, message: 'Message 2' },
          ],
        }),
      )

      expect(mockUseBlocker).toHaveBeenCalled()
      const blockerFn = mockUseBlocker.mock.calls[0][0]
      expect(typeof blockerFn).toBe('function')
      expect(
        blockerFn({
          nextLocation: { pathname: '/other' },
          currentLocation: { pathname: '/current' },
          historyAction: 'PUSH',
        }),
      ).toBe(false)
    })

    it('should block when at least one condition is met', () => {
      render(
        React.createElement(TestComponent, {
          blockerConditions: [
            { condition: false, message: 'Message 1' },
            { condition: true, message: 'Message 2' },
          ],
        }),
      )

      expect(mockUseBlocker).toHaveBeenCalled()
      const blockerFn = mockUseBlocker.mock.calls[0][0]
      const result = blockerFn({
        nextLocation: { pathname: '/other' },
        currentLocation: { pathname: '/current' },
        historyAction: 'PUSH',
      })
      expect(result).toBe(true)
    })

    it('should call useBeforeUnload with a handler when blocking conditions are met', () => {
      render(
        React.createElement(TestComponent, {
          blockerConditions: [{ condition: true, message: 'Unsaved changes' }],
        }),
      )

      expect(mockUseBeforeUnload).toHaveBeenCalled()
      const beforeUnloadHandler = mockUseBeforeUnload.mock.calls[0][0]
      expect(typeof beforeUnloadHandler).toBe('function')
    })
  })

  describe('dialog rendering', () => {
    it('does not show the dialog when unblocked', () => {
      render(
        React.createElement(TestComponent, {
          blockerConditions: [{ condition: true, message: 'Unsaved changes' }],
        }),
      )

      expect(screen.queryByText('Unsaved Changes')).not.toBeInTheDocument()
    })

    it('shows the dialog with title and description when blocked', async () => {
      mockUseBlocker.mockReturnValue({
        state: 'blocked',
        proceed: jest.fn(),
        reset: jest.fn(),
      })

      render(
        React.createElement(TestComponent, {
          blockerConditions: [{ condition: true, message: 'Unsaved changes' }],
          options: {
            title: 'Discard changes?',
            description: 'Your edits have not been saved.',
          },
        }),
      )

      await waitFor(() => {
        expect(screen.getByText('Discard changes?')).toBeInTheDocument()
      })
      expect(
        screen.getByText('Your edits have not been saved.'),
      ).toBeInTheDocument()
    })

    it('calls blocker.proceed when the confirm button is clicked', async () => {
      const proceed = jest.fn()
      mockUseBlocker.mockReturnValue({
        state: 'blocked',
        proceed,
        reset: jest.fn(),
      })

      render(
        React.createElement(TestComponent, {
          blockerConditions: [{ condition: true, message: 'Unsaved changes' }],
          options: { confirmLabel: 'Leave Page' },
        }),
      )

      const confirmButton = await screen.findByText('Leave Page')
      fireEvent.click(confirmButton)

      expect(proceed).toHaveBeenCalled()
    })

    it('calls blocker.reset when the cancel button is clicked', async () => {
      const reset = jest.fn()
      mockUseBlocker.mockReturnValue({
        state: 'blocked',
        proceed: jest.fn(),
        reset,
      })

      render(
        React.createElement(TestComponent, {
          blockerConditions: [{ condition: true, message: 'Unsaved changes' }],
          options: { cancelLabel: 'Stay' },
        }),
      )

      const cancelButton = await screen.findByText('Stay')
      fireEvent.click(cancelButton)

      expect(reset).toHaveBeenCalled()
    })

    it('does not show a save-and-continue button by default', async () => {
      mockUseBlocker.mockReturnValue({
        state: 'blocked',
        proceed: jest.fn(),
        reset: jest.fn(),
      })

      render(
        React.createElement(TestComponent, {
          blockerConditions: [{ condition: true, message: 'Unsaved changes' }],
        }),
      )

      await screen.findByText('Unsaved Changes')
      expect(screen.queryByText('Save & Continue')).not.toBeInTheDocument()
    })

    it('calls onSaveAndContinue then proceeds when save-and-continue is clicked', async () => {
      const proceed = jest.fn()
      const onSaveAndContinue = jest.fn().mockResolvedValue(undefined)
      mockUseBlocker.mockReturnValue({
        state: 'blocked',
        proceed,
        reset: jest.fn(),
      })

      render(
        React.createElement(TestComponent, {
          blockerConditions: [{ condition: true, message: 'Unsaved changes' }],
          options: {
            onSaveAndContinue,
            saveAndContinueLabel: 'Save & Continue',
          },
        }),
      )

      const saveButton = await screen.findByText('Save & Continue')
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(onSaveAndContinue).toHaveBeenCalled()
      })
      await waitFor(() => {
        expect(proceed).toHaveBeenCalled()
      })
    })

    it('resets the blocker if onSaveAndContinue rejects', async () => {
      const reset = jest.fn()
      const onSaveAndContinue = jest.fn().mockRejectedValue(new Error('fail'))
      mockUseBlocker.mockReturnValue({
        state: 'blocked',
        proceed: jest.fn(),
        reset,
      })

      render(
        React.createElement(TestComponent, {
          blockerConditions: [{ condition: true, message: 'Unsaved changes' }],
          options: {
            onSaveAndContinue,
            saveAndContinueLabel: 'Save & Continue',
          },
        }),
      )

      const saveButton = await screen.findByText('Save & Continue')
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(reset).toHaveBeenCalled()
      })
    })
  })

  describe('allowed path pattern', () => {
    it('should allow navigation within the same path pattern', () => {
      const pattern = /^\/admin\/survey\/[^/]+/

      render(
        React.createElement(TestComponent, {
          blockerConditions: [{ condition: true, message: 'Unsaved changes' }],
          allowedPathPattern: pattern,
        }),
      )

      const blockerFn = mockUseBlocker.mock.calls[0][0]
      const result = blockerFn({
        nextLocation: { pathname: '/admin/survey/123/preview' },
        currentLocation: { pathname: '/admin/survey/123/edit' },
        historyAction: 'PUSH',
      })

      expect(result).toBe(false)
    })

    it('should block navigation to a different survey', () => {
      const pattern = /^\/admin\/survey\/[^/]+/

      render(
        React.createElement(TestComponent, {
          blockerConditions: [{ condition: true, message: 'Unsaved changes' }],
          allowedPathPattern: pattern,
        }),
      )

      const blockerFn = mockUseBlocker.mock.calls[0][0]
      const result = blockerFn({
        nextLocation: { pathname: '/admin/survey/456/edit' },
        currentLocation: { pathname: '/admin/survey/123/edit' },
        historyAction: 'PUSH',
      })

      expect(result).toBe(true)
    })

    it('should block navigation outside the pattern', () => {
      const pattern = /^\/admin\/survey\/[^/]+/

      render(
        React.createElement(TestComponent, {
          blockerConditions: [{ condition: true, message: 'Unsaved changes' }],
          allowedPathPattern: pattern,
        }),
      )

      const blockerFn = mockUseBlocker.mock.calls[0][0]
      const result = blockerFn({
        nextLocation: { pathname: '/admin/survey' },
        currentLocation: { pathname: '/admin/survey/123/edit' },
        historyAction: 'PUSH',
      })

      expect(result).toBe(true)
    })

    it('should block navigation when no pattern is provided', () => {
      render(
        React.createElement(TestComponent, {
          blockerConditions: [{ condition: true, message: 'Unsaved changes' }],
        }),
      )

      const blockerFn = mockUseBlocker.mock.calls[0][0]
      const result = blockerFn({
        nextLocation: { pathname: '/admin/survey/456/edit' },
        currentLocation: { pathname: '/admin/survey/123/edit' },
        historyAction: 'PUSH',
      })

      expect(result).toBe(true)
    })
  })

  describe('beforeunload handler', () => {
    it('combines multiple active blocking messages', () => {
      render(
        React.createElement(TestComponent, {
          blockerConditions: [
            { condition: true, message: 'Unsaved changes.' },
            { condition: true, message: 'Upload in progress.' },
          ],
        }),
      )

      const beforeUnloadHandler = mockUseBeforeUnload.mock.calls[0][0]
      const mockEvent = {
        preventDefault: jest.fn(),
        returnValue: '',
      } as unknown as BeforeUnloadEvent

      beforeUnloadHandler(mockEvent)

      expect(mockEvent.returnValue).toBe('Unsaved changes. Upload in progress.')
    })

    it('only includes messages for active conditions', () => {
      render(
        React.createElement(TestComponent, {
          blockerConditions: [
            { condition: true, message: 'Unsaved changes.' },
            { condition: false, message: 'Upload in progress.' },
          ],
        }),
      )

      const beforeUnloadHandler = mockUseBeforeUnload.mock.calls[0][0]
      const mockEvent = {
        preventDefault: jest.fn(),
        returnValue: '',
      } as unknown as BeforeUnloadEvent

      beforeUnloadHandler(mockEvent)

      expect(mockEvent.returnValue).toBe('Unsaved changes.')
    })
  })
})
