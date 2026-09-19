import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { RegistrationForm } from './RegistrationForm'
import { useSurveyParticipantAttributeSnapshot } from '../hook/useSurveyParticipantAttributeSnapshot'
import { getAuthParticipantApi } from '../registry'
import i18next from '../i18n'

jest.mock('react-i18next', () => ({
  ...jest.requireActual('react-i18next'),
  useTranslation: () => ({ t: (key: string) => key }),
}))

jest.mock('../hook/useSurveyParticipantAttributeSnapshot', () => ({
  useSurveyParticipantAttributeSnapshot: jest.fn(),
}))

jest.mock('../registry', () => ({
  getAuthParticipantApi: jest.fn(),
}))

jest.mock('../i18n', () => ({
  __esModule: true,
  default: { changeLanguage: jest.fn() },
}))

const mockedSnapshot = jest.mocked(useSurveyParticipantAttributeSnapshot)
const mockedGetApi = jest.mocked(getAuthParticipantApi)
const mockedChangeLanguage = jest.mocked(i18next.changeLanguage)

const snapshotState = {
  attributes: [] as never[],
  languageDefault: 'en',
  languageOptions: ['en', 'de'],
  isLoading: true,
}

const register = jest.fn().mockResolvedValue(undefined)

const buildUi = (search: string) => (
  <MemoryRouter initialEntries={[`/survey/s1/register${search}`]}>
    <Routes>
      <Route
        path="/survey/:surveyId/register"
        element={<RegistrationForm surveyId="s1" />}
      />
    </Routes>
  </MemoryRouter>
)

const renderAt = (search: string) => {
  const utils = render(buildUi(search))
  // The initial-language logic only fires on the isLoading -> loaded
  // transition, mirroring the real hook. Re-render with a fresh element so
  // React actually re-invokes the component with the flipped mock value.
  snapshotState.isLoading = false
  utils.rerender(buildUi(search))
  return utils
}

describe('RegistrationForm language handling', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    snapshotState.isLoading = true
    mockedSnapshot.mockImplementation(() => ({ ...snapshotState }))
    mockedGetApi.mockReturnValue({
      register,
    } as unknown as ReturnType<typeof getAuthParticipantApi>)
  })

  test('seeds the language from the ?lang= URL param', async () => {
    renderAt('?lang=de')

    await waitFor(() =>
      expect(screen.getByTestId('lang-selector-trigger')).toHaveAttribute(
        'data-lang',
        'de',
      ),
    )
    expect(mockedChangeLanguage).toHaveBeenCalledWith('de')
  })

  test('ignores a ?lang= value the survey does not support', async () => {
    renderAt('?lang=fr')

    // navigator.language is en-* under jsdom, which is a supported option
    await waitFor(() =>
      expect(screen.getByTestId('lang-selector-trigger')).toHaveAttribute(
        'data-lang',
        'en',
      ),
    )
  })

  test('submits the URL language so the registration email link matches', async () => {
    renderAt('?lang=de')

    fireEvent.change(screen.getByLabelText('registration.nameFirst.label'), {
      target: { value: 'Ada' },
    })
    fireEvent.change(screen.getByLabelText('registration.nameLast.label'), {
      target: { value: 'Lovelace' },
    })
    fireEvent.change(screen.getByLabelText('registration.email.label'), {
      target: { value: 'ada@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'registration.submit' }))

    await waitFor(() =>
      expect(register).toHaveBeenCalledWith(
        's1',
        expect.objectContaining({ language: 'de' }),
      ),
    )
  })
})
