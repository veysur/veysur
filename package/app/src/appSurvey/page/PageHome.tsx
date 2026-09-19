import { useTranslation } from 'react-i18next'
import { usePageTitle } from 'hook'

export const PageHome: React.FC = () => {
  const { t } = useTranslation('app-survey')
  usePageTitle(t('page.home.title'))
  return (
    <div className="container-fluid vh-10 mt-3">{t('page.home.welcome')}</div>
  )
}

export default PageHome
