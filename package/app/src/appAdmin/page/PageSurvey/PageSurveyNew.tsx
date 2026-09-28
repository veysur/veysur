import React from 'react'
import { FilePlus, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'

import { usePageTitle } from 'hook'
import { AdminPageLayout } from 'appAdmin/component/Layout'
import { SurveyFormNew } from 'appAdmin/component/Survey'
import { PageHeader } from 'component/PageHeader'
import { Button } from 'component/shadcn/button'

export const PageSurveyNew: React.FC = () => {
  usePageTitle('New Survey', { suffix: 'Veysur Admin' })
  return (
    <AdminPageLayout className="container-lg p-4">
      <PageHeader
        icon={FilePlus}
        title="New Survey"
        description="Start building your survey by providing a name, from scratch or from a template."
        maxWidth="max-w-none"
        showBack={false}
        inlineNav={
          <Button size="sm" variant="outline" tooltip="Import Survey" asChild>
            <Link to="/survey/import">
              <Upload className="h-4 w-4" />
            </Link>
          </Button>
        }
      />
      <div className="mt-10">
        <SurveyFormNew />
      </div>
    </AdminPageLayout>
  )
}

export default PageSurveyNew
