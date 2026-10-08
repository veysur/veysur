import React, { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

// Inline SVG data URI: Veysur V mark scaled into a white rounded square with black border.
// The favicon viewBox is "135 88 300 300"; scale=70/300≈0.2333, translate to 15px padding.
const QR_LOGO_SRC = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="15%" stop-color="#1AC47C"/><stop offset="85%" stop-color="#097742"/></linearGradient></defs><rect x="2" y="2" width="96" height="96" rx="12" fill="white" stroke="black" stroke-width="4"/><path transform="translate(-16.5,-5.5) scale(0.2333)" fill="url(#g)" d="M383.419800,130.315704 C396.050323,124.669411 408.663361,120.229607 421.909668,117.757393 C422.692749,120.015701 421.147736,120.554230 420.173279,121.226318 C376.987610,151.011200 344.621918,190.643295 316.882507,234.514847 C292.524261,273.038940 272.126587,313.616730 254.093643,355.417572 C252.648560,358.767303 250.836517,360.299042 247.027237,360.240112 C233.035538,360.023590 219.037827,360.007416 205.045120,360.162292 C201.133759,360.205597 199.069580,358.745483 197.469177,355.202515 C181.226913,319.245789 164.870956,283.340210 148.429092,247.474289 C146.892807,244.123093 147.488419,242.425507 150.792953,240.883896 C162.109390,235.604553 173.369675,230.199234 184.555099,224.648010 C188.040115,222.918427 189.770355,223.510101 191.415787,227.157440 C201.548264,249.617661 211.890717,271.983185 222.183731,294.370850 C222.993759,296.132721 223.358643,298.244812 225.507629,299.163330 C227.789001,298.194305 228.217743,295.870178 229.183899,294.030579 C252.363831,249.895401 280.889954,209.744400 317.522217,175.667358 C337.150574,157.408127 358.671204,141.835632 383.419800,130.315704 z"/></svg>`,
)}`
import { Copy, Check, Download, ExternalLink } from 'lucide-react'
import { getLanguageName, sortLanguageCodesByName } from 'veysur-common'

import { copyToClipboard } from 'common/copyToClipboard'
import { cn } from 'common/cn'
import { SurveyNotPublishedAlert } from 'component/SurveyNotPublishedAlert'
import { Button } from 'component/shadcn/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from 'component/shadcn/tooltip'
import { Input } from 'component/shadcn/input'
import { Card, CardContent, CardHeader, CardTitle } from 'component/shadcn/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'component/shadcn/select'
import {
  SurveyEditorNavContainer,
  useSurveyEditorStore,
} from 'appAdmin/component/SurveyEditor'
import {
  usePublished,
  SurveyEditorPublish,
} from 'appAdmin/component/SurveyEditorPublish'
import { SurveyEmbedCard } from 'appAdmin/component/SurveyEmbed/SurveyEmbedCard'
import { useSettingSurvey } from 'appAdmin/component/SettingSurvey'
import { useProjectDomain } from 'appAdmin/hook'
import { usePageTitle } from 'hook'

const SOCIAL_SHARE_POPUP_FEATURES = 'width=600,height=400'

const FacebookIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
      clipRule="evenodd"
    />
  </svg>
)

const LinkedInIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
)

const XIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
)

type SocialNetwork = {
  key: string
  label: string
  Icon: React.FC<{ className?: string }>
  iconColorClass: string
  buildShareUrl: (surveyUrl: string) => string
}

const SOCIAL_NETWORKS: SocialNetwork[] = [
  {
    key: 'facebook',
    label: 'Facebook',
    Icon: FacebookIcon,
    iconColorClass: 'text-[#1877F2]',
    buildShareUrl: (surveyUrl) =>
      `https://www.facebook.com/sharer/sharer.php?${new URLSearchParams({ u: surveyUrl }).toString()}`,
  },
  {
    key: 'linkedIn',
    label: 'LinkedIn',
    Icon: LinkedInIcon,
    iconColorClass: 'text-[#0A66C2]',
    buildShareUrl: (surveyUrl) =>
      `https://www.linkedin.com/sharing/share-offsite/?${new URLSearchParams({ url: surveyUrl }).toString()}`,
  },
  {
    key: 'x',
    label: 'X',
    Icon: XIcon,
    iconColorClass: '',
    buildShareUrl: (surveyUrl) =>
      `https://twitter.com/intent/tweet?${new URLSearchParams({ url: surveyUrl }).toString()}`,
  },
]

export const PageSurveyEditShare: React.FC = () => {
  const survey = useSurveyEditorStore((state) => state.survey)
  const operations = useSurveyEditorStore((state) => state.operations)
  const { settingSurvey } = useSettingSurvey()
  const project = useProjectDomain()
  const { isPublished } = usePublished({ surveyId: survey?._id })
  const [copied, setCopied] = useState(false)

  // Get available languages from survey
  const languageOptions = sortLanguageCodesByName(
    survey?.language?.options || [],
  )
  const defaultLanguage =
    survey?.language?.default || languageOptions[0] || 'en'
  const hasMultipleLanguages = languageOptions.length > 1

  // State for selected language
  const [selectedLanguage, setSelectedLanguage] =
    useState<string>(defaultLanguage)

  usePageTitle(`Share - ${survey?.name || 'Loading...'}`, {
    suffix: 'Veysur Admin',
  })

  const surveyUrl = survey?._id
    ? `${window.location.origin}/survey/${survey._id}?lang=${selectedLanguage}`
    : ''

  const handleCopyLink = async () => {
    if (!surveyUrl || !isPublished) return
    if (await copyToClipboard(surveyUrl)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownloadQR = () => {
    if (!isPublished) return
    const svgElement = document.getElementById('qr-code-svg')
    if (!svgElement) return

    const svgData = new XMLSerializer().serializeToString(svgElement)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx?.drawImage(img, 0, 0)
      const pngFile = canvas.toDataURL('image/png')
      const downloadLink = document.createElement('a')
      downloadLink.download = `survey-${survey?._id}-qr.png`
      downloadLink.href = pngFile
      downloadLink.click()
    }

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData)
  }

  const shareOnSocial = (network: SocialNetwork) => {
    if (!isPublished) return
    window.open(
      network.buildShareUrl(surveyUrl),
      '_blank',
      SOCIAL_SHARE_POPUP_FEATURES,
    )
  }

  const notPublishedTooltip = (verb: string, normalTooltip: string) =>
    isPublished ? normalTooltip : `Publish the survey to ${verb}`

  return (
    <SurveyEditorNavContainer surveyName={survey?.name}>
      <div className="container-fluid p-4">
        {!isPublished && survey?._id && (
          <div className="max-w-7xl mx-auto mb-4">
            <SurveyNotPublishedAlert
              surveyId={survey._id}
              publishAction={<SurveyEditorPublish />}
            />
          </div>
        )}
        <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Share via Link</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {hasMultipleLanguages && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Survey Language
                      </label>
                      <Select
                        value={selectedLanguage}
                        onValueChange={setSelectedLanguage}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue>
                            {getLanguageName(selectedLanguage) ||
                              selectedLanguage}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {languageOptions.map((langCode) => (
                            <SelectItem key={langCode} value={langCode}>
                              {getLanguageName(langCode) || langCode}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input value={surveyUrl} readOnly className="flex-1" />
                    <Button
                      onClick={handleCopyLink}
                      variant="outline"
                      disabled={!isPublished}
                      tooltip={notPublishedTooltip(
                        'share this link',
                        copied ? 'Copied!' : 'Copy link',
                      )}
                    >
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      onClick={() => window.open(surveyUrl, '_blank')}
                      variant="outline"
                      disabled={!surveyUrl || !isPublished}
                      tooltip={notPublishedTooltip(
                        'open this link',
                        'Open survey',
                      )}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {survey && settingSurvey && project?._id && (
              <SurveyEmbedCard
                survey={survey}
                settingSurvey={settingSurvey}
                projectId={project._id}
                language={hasMultipleLanguages ? selectedLanguage : undefined}
                isPublished={isPublished}
                onEmbedChange={(embed) =>
                  operations?.updateSurveyAccessSetting('embed', embed)
                }
              />
            )}

            <Card>
              <CardHeader>
                <CardTitle>Share on Social Media</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center gap-6">
                  {SOCIAL_NETWORKS.map((network) => (
                    <Tooltip key={network.key}>
                      <TooltipTrigger asChild>
                        {/* aria-disabled + no-op click (rather than the native
                            `disabled` attribute) so hover still reaches this
                            Tooltip trigger when the survey isn't published -
                            see button.tsx for the same pattern. */}
                        <button
                          onClick={() => shareOnSocial(network)}
                          aria-disabled={!isPublished}
                          className={cn(
                            'p-3 rounded-full transition-colors',
                            isPublished
                              ? 'hover:bg-muted'
                              : 'opacity-40 cursor-not-allowed',
                          )}
                          aria-label={`Share on ${network.label}`}
                        >
                          <network.Icon
                            className={cn('h-8 w-8', network.iconColorClass)}
                          />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {notPublishedTooltip(
                          `share on ${network.label}`,
                          `Share on ${network.label}`,
                        )}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Share via QR Code</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                {surveyUrl && (
                  <>
                    <div className="bg-white p-4 rounded-lg">
                      <QRCodeSVG
                        id="qr-code-svg"
                        value={surveyUrl}
                        size={200}
                        level="H"
                        includeMargin
                        imageSettings={{
                          src: QR_LOGO_SRC,
                          height: 36,
                          width: 36,
                          excavate: true,
                        }}
                      />
                    </div>
                    <Button
                      variant="link"
                      onClick={handleDownloadQR}
                      disabled={!isPublished}
                      className="flex items-center gap-2"
                      tooltip={notPublishedTooltip(
                        'download the QR code',
                        'Download as PNG',
                      )}
                    >
                      <Download className="h-4 w-4" />
                      Download QR Code
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SurveyEditorNavContainer>
  )
}

export default PageSurveyEditShare
