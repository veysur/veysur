import { useState, useMemo, useCallback } from 'react'
import { useAuthdQuery } from 'hook/useAuthdQuery'
import { EmailTemplate, EmailTemplateCollection, Patch } from 'veysur-common'
import { PropsOf } from '@datacapy/schema'

import { useProjectDomain } from 'appAdmin/hook'
import { Api } from 'model'
import { getRestClient } from 'registry'

export class ProjectEmailTemplateApi extends Api {
  async getAll(): Promise<{
    projectTemplates: PropsOf<EmailTemplate>[]
    systemTemplates: PropsOf<EmailTemplate>[]
    projectDefaultLang: string
  }> {
    return await this.getClient().get(`/email-template`)
  }

  async patch(patches: Patch[]) {
    return await this.getClient().patch(`/email-template`, { patches })
  }
}

export function useProjectEmailTemplates() {
  const project = useProjectDomain()
  const [localTemplates, setLocalTemplates] = useState<
    Map<string, EmailTemplate>
  >(new Map())
  // Track whether we've made any local modifications
  const [hasLocalModifications, setHasLocalModifications] = useState(false)

  const { data, isLoading, error } = useAuthdQuery({
    queryKey: ['projectEmailTemplates', project?._id],
    queryFn: async () => {
      const api = new ProjectEmailTemplateApi(getRestClient())
      return await api.getAll()
    },
    enabled: !!project?._id,
  })

  // Convert server data arrays to Maps keyed by ${type}-${lang}
  const serverTemplatesMap = useMemo(() => {
    const map = new Map<string, EmailTemplate>()
    if (data?.projectTemplates) {
      data.projectTemplates.forEach((template) => {
        const key = `${template.type}-${template.lang}`
        map.set(key, new EmailTemplate(template))
      })
    }
    return map
  }, [data])

  const systemTemplatesCollection = useMemo(() => {
    if (data?.systemTemplates) {
      return EmailTemplateCollection.fromArray(
        data.systemTemplates.map((t) => new EmailTemplate(t)),
      )
    }
    return EmailTemplateCollection.fromArray([])
  }, [data])

  const projectDefaultLang = data?.projectDefaultLang || 'en'

  // Initialize local state when server data changes — done at render time
  // (React's "adjusting state when a prop changes" pattern) instead of in
  // an effect, to avoid an extra render showing stale local templates.
  const [prevServerTemplatesMap, setPrevServerTemplatesMap] =
    useState(serverTemplatesMap)
  if (
    serverTemplatesMap.size > 0 &&
    serverTemplatesMap !== prevServerTemplatesMap
  ) {
    setPrevServerTemplatesMap(serverTemplatesMap)
    setLocalTemplates(new Map(serverTemplatesMap))
    setHasLocalModifications(false)
  }

  // Update a template field locally
  const updateTemplate = useCallback(
    (type: string, lang: string, field: 'subject' | 'body', value: string) => {
      setHasLocalModifications(true)
      setLocalTemplates((prev) => {
        const key = `${type}-${lang}`
        const newMap = new Map(prev)
        const existingTemplate = newMap.get(key)

        if (existingTemplate) {
          // Update existing template
          const updated = new EmailTemplate({
            ...existingTemplate,
            [field]: value,
          })
          newMap.set(key, updated)
        } else {
          // Create new template with minimal data
          const newTemplate = new EmailTemplate({
            type,
            lang,
            surveyId: null,
            [field]: value,
            subject: field === 'subject' ? value : '',
            body: field === 'body' ? value : '',
          })
          newMap.set(key, newTemplate)
        }

        return newMap
      })
    },
    [],
  )

  // Delete a template locally (revert to system default)
  const deleteTemplate = useCallback((type: string, lang: string) => {
    setHasLocalModifications(true)
    setLocalTemplates((prev) => {
      const key = `${type}-${lang}`
      const newMap = new Map(prev)
      newMap.delete(key)
      return newMap
    })
  }, [])

  // Create a new template with both subject and body
  const createTemplate = useCallback(
    (type: string, lang: string, subject: string, body: string) => {
      setHasLocalModifications(true)
      setLocalTemplates((prev) => {
        const key = `${type}-${lang}`
        const newMap = new Map(prev)
        const newTemplate = new EmailTemplate({
          type,
          lang,
          surveyId: null,
          subject,
          body,
        })
        newMap.set(key, newTemplate)
        return newMap
      })
    },
    [],
  )

  return {
    templates: hasLocalModifications ? localTemplates : serverTemplatesMap,
    systemTemplates: systemTemplatesCollection,
    projectDefaultLang,
    isLoading,
    error,
    updateTemplate,
    deleteTemplate,
    createTemplate,
  }
}
