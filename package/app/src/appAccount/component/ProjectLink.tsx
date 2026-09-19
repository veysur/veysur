import { Link } from 'react-router-dom'

import { useAuth } from 'hook'
import { cn } from 'common'
import { isProjectOwned } from 'appAccount/common'

export const ProjectLink: React.FC<{
  projectId: string
  projectName?: string | null
  className?: string
  fallback?: React.ReactNode
}> = ({ projectId, projectName, className, fallback = null }) => {
  const { auth } = useAuth()

  if (!projectName) return <>{fallback}</>

  return isProjectOwned(auth, projectId) ? (
    <Link
      to={`/project/${projectId}/manage`}
      className={cn('text-primary hover:underline', className)}
      onClick={(e) => e.stopPropagation()}
    >
      {projectName}
    </Link>
  ) : (
    <span className={className}>{projectName}</span>
  )
}
