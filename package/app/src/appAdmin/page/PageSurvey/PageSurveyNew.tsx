import React from 'react'
import { FilePlus, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'

import { usePageTitle } from 'hook'
import { AdminPageLayout } from 'appAdmin/component/Layout'
import { SurveyFormNew } from 'appAdmin/component/Survey'
import { SectionHeader } from 'component/SectionHeader'
import { Button } from 'component/shadcn/button'

export const PageSurveyNew: React.FC = () => {
  usePageTitle('New Survey', { suffix: 'Veysur Admin' })
  return (
    <AdminPageLayout className="container-lg p-4">
      <SectionHeader
        icon={FilePlus}
        title="New Survey"
        description="Start building your survey by providing a name."
      >
        <Button size="sm" variant="outline" tooltip="Import Survey" asChild>
          <Link to="/survey/import">
            <Upload className="h-4 w-4" />
          </Link>
        </Button>
      </SectionHeader>
      <div className="mt-10">
        <SurveyFormNew />
      </div>
    </AdminPageLayout>
  )
}

export default PageSurveyNew
