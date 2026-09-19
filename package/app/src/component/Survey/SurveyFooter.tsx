import React from 'react'

export const SurveyFooter: React.FC = () => {
  const appDomain = process.env.PUBLIC_APP_DOMAIN || 'veysur.com'
  const websiteUrl = `${window.location.protocol}//www.${appDomain}`

  return (
    <footer className="py-4 px-4 border-t">
      <div className="flex items-center justify-end">
        <a href={websiteUrl} target="_blank" rel="noopener noreferrer">
          <img
            src="/image/veysur-logo-light.svg"
            alt="VeySur"
            className="h-8 w-auto opacity-90"
          />
        </a>
      </div>
    </footer>
  )
}
