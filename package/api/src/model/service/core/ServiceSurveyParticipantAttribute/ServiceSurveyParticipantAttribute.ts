import {
  Service,
  ServerErrorBadRequest,
  ServerErrorNotFound,
} from 'mzen-server'
import {
  SurveyParticipantAttribute,
  SurveyParticipantAttributeDefinition,
  SurveyParticipantAttributeLanguage,
  SurveyParticipantAttributeLanguageData,
  isValidCustomAttributeName,
  SURVEY_PARTICIPANT_SYSTEM_ATTRIBUTE_METADATA,
} from 'veysur-common'

export type AttributeBatchChange = {
  attributeName: string
  newName?: string
  fields?: Partial<
    Pick<
      SurveyParticipantAttributeDefinition,
      'required' | 'internal' | 'example'
    >
  >
  language?: Record<string, SurveyParticipantAttributeLanguageData>
}

export type BatchSaveParams = {
  surveyId: string
  projectId: string
  changes: AttributeBatchChange[]
  orderedAttributeNames?: string[]
}

import {
  RepoSurveyParticipant,
  RepoSurveyParticipantAttribute,
  RepoSurveyParticipantAttributeLanguage,
} from 'model'
import { contextForProject } from 'common'

export class ServiceSurveyParticipantAttribute extends Service {
  constructor() {
    super({ name: 'surveyParticipantAttribute' })
  }

  async list({
    surveyId,
    projectId,
  }: {
    surveyId: string
    projectId: string
  }): Promise<{
    systemAttributes: Array<{ name: string } & Record<string, unknown>>
    attributes: Array<
      SurveyParticipantAttributeDefinition & {
        languages: Record<string, SurveyParticipantAttributeLanguageData>
      }
    >
  }> {
    const context = contextForProject(projectId)
    const repoAttribute = this.getRepo<RepoSurveyParticipantAttribute>(
      'surveyParticipantAttribute',
    )
    const repoAttributeLanguage =
      this.getRepo<RepoSurveyParticipantAttributeLanguage>(
        'surveyParticipantAttributeLanguage',
      )

    const [doc, languageDocs] = await Promise.all([
      repoAttribute.findOne({ surveyId }, { context }),
      repoAttributeLanguage.find({ surveyId }, { context }),
    ])

    const languagesByCode = new Map<
      string,
      SurveyParticipantAttributeLanguage['data']
    >()
    for (const langDoc of languageDocs) {
      languagesByCode.set(langDoc.languageCode, langDoc.data)
    }

    const systemAttributes = Object.entries(
      SURVEY_PARTICIPANT_SYSTEM_ATTRIBUTE_METADATA,
    ).map(([name, meta]) => ({ name, ...meta }))

    const definitions = doc?.attributes ?? []

    return {
      systemAttributes,
      attributes: definitions.map((def) => {
        const languages: Record<
          string,
          SurveyParticipantAttributeLanguageData
        > = {}
        for (const [code, data] of languagesByCode) {
          if (data[def.name] !== undefined) {
            languages[code] = data[def.name]
          }
        }
        return { ...def, languages }
      }),
    }
  }

  async create({
    surveyId,
    projectId,
    attribute,
  }: {
    surveyId: string
    projectId: string
    attribute: Partial<SurveyParticipantAttributeDefinition>
  }): Promise<SurveyParticipantAttributeDefinition> {
    const context = contextForProject(projectId)
    const repoAttribute = this.getRepo<RepoSurveyParticipantAttribute>(
      'surveyParticipantAttribute',
    )

    const { valid, reason } = isValidCustomAttributeName(attribute.name ?? '')
    if (!valid) {
      throw new ServerErrorBadRequest({ name: [reason] })
    }

    const doc = await repoAttribute.findOne({ surveyId }, { context })

    if (doc?.attributes.some((a) => a.name === attribute.name)) {
      throw new ServerErrorBadRequest({
        name: ['An attribute with this name already exists'],
      })
    }

    const newDef: SurveyParticipantAttributeDefinition = {
      name: attribute.name,
      required: attribute.required ?? false,
      internal: attribute.internal ?? false,
      example: attribute.example ?? null,
    }

    if (doc) {
      const updated = [...doc.attributes, newDef]
      await repoAttribute.updateOne(
        { _id: doc._id },
        { $set: { attributes: updated, updatedAt: new Date() } },
        { context },
      )
    } else {
      await repoAttribute.insertOne(
        new SurveyParticipantAttribute({
          surveyId,
          attributes: [newDef],
        }),
        { context },
      )
    }

    return newDef
  }

  async update({
    surveyId,
    projectId,
    attributeName,
    attribute,
  }: {
    surveyId: string
    projectId: string
    attributeName: string
    attribute: Partial<SurveyParticipantAttributeDefinition>
  }): Promise<boolean> {
    const context = contextForProject(projectId)
    const repoAttribute = this.getRepo<RepoSurveyParticipantAttribute>(
      'surveyParticipantAttribute',
    )

    if (attribute.name !== undefined) {
      throw new ServerErrorBadRequest({
        name: ['Use the rename endpoint to change the attribute name'],
      })
    }

    const doc = await repoAttribute.findOne({ surveyId }, { context })
    const idx = doc?.attributes.findIndex((a) => a.name === attributeName) ?? -1
    if (!doc || idx === -1) {
      throw new ServerErrorNotFound('Participant attribute not found')
    }

    const updated = [...doc.attributes]
    updated[idx] = {
      ...updated[idx],
      ...(attribute.required !== undefined
        ? { required: attribute.required }
        : {}),
      ...(attribute.internal !== undefined
        ? { internal: attribute.internal }
        : {}),
      ...(attribute.example !== undefined
        ? { example: attribute.example }
        : {}),
    }

    await repoAttribute.updateOne(
      { _id: doc._id },
      { $set: { attributes: updated, updatedAt: new Date() } },
      { context },
    )

    return true
  }

  async rename({
    surveyId,
    projectId,
    attributeName,
    newName,
  }: {
    surveyId: string
    projectId: string
    attributeName: string
    newName: string
  }): Promise<boolean> {
    const context = contextForProject(projectId)
    const repoAttribute = this.getRepo<RepoSurveyParticipantAttribute>(
      'surveyParticipantAttribute',
    )
    const repoAttributeLanguage =
      this.getRepo<RepoSurveyParticipantAttributeLanguage>(
        'surveyParticipantAttributeLanguage',
      )
    const repoParticipant =
      this.getRepo<RepoSurveyParticipant>('surveyParticipant')

    const { valid, reason } = isValidCustomAttributeName(newName)
    if (!valid) {
      throw new ServerErrorBadRequest({ name: [reason] })
    }

    const doc = await repoAttribute.findOne({ surveyId }, { context })
    const idx = doc?.attributes.findIndex((a) => a.name === attributeName) ?? -1
    if (!doc || idx === -1) {
      throw new ServerErrorNotFound('Participant attribute not found')
    }

    if (attributeName === newName) {
      return true
    }

    if (doc.attributes.some((a) => a.name === newName)) {
      throw new ServerErrorBadRequest({
        name: ['An attribute with this name already exists'],
      })
    }

    const updatedAttributes = doc.attributes.map((a) =>
      a.name === attributeName ? { ...a, name: newName } : a,
    )

    await repoAttribute.transaction(context, async (context) => {
      await repoAttribute.updateOne(
        { _id: doc._id },
        { $set: { attributes: updatedAttributes, updatedAt: new Date() } },
        { context },
      )

      await repoAttributeLanguage.updateMany(
        { surveyId },
        { $rename: { [`data.${attributeName}`]: `data.${newName}` } },
        { context },
      )

      await repoParticipant.updateMany(
        { surveyId },
        {
          $rename: { [`attributes.${attributeName}`]: `attributes.${newName}` },
        },
        { context },
      )
    })

    return true
  }

  async updateLanguage({
    surveyId,
    projectId,
    attributeName,
    languageCode,
    data,
  }: {
    surveyId: string
    projectId: string
    attributeName: string
    languageCode: string
    data: SurveyParticipantAttributeLanguageData
  }): Promise<boolean> {
    const context = contextForProject(projectId)
    const repoAttribute = this.getRepo<RepoSurveyParticipantAttribute>(
      'surveyParticipantAttribute',
    )
    const repoAttributeLanguage =
      this.getRepo<RepoSurveyParticipantAttributeLanguage>(
        'surveyParticipantAttributeLanguage',
      )

    const doc = await repoAttribute.findOne({ surveyId }, { context })
    if (!doc?.attributes.some((a) => a.name === attributeName)) {
      throw new ServerErrorNotFound('Participant attribute not found')
    }

    const existing = await repoAttributeLanguage.findOne(
      { surveyId, languageCode },
      { context },
    )
    if (existing) {
      await repoAttributeLanguage.updateOne(
        { _id: existing._id },
        { $set: { [`data.${attributeName}`]: data, updatedAt: new Date() } },
        { context },
      )
    } else {
      await repoAttributeLanguage.insertOne(
        new SurveyParticipantAttributeLanguage({
          surveyId,
          languageCode,
          data: { [attributeName]: data },
        }),
        { context },
      )
    }

    return true
  }

  async delete({
    surveyId,
    projectId,
    attributeName,
  }: {
    surveyId: string
    projectId: string
    attributeName: string
  }): Promise<boolean> {
    const context = contextForProject(projectId)
    const repoAttribute = this.getRepo<RepoSurveyParticipantAttribute>(
      'surveyParticipantAttribute',
    )
    const repoAttributeLanguage =
      this.getRepo<RepoSurveyParticipantAttributeLanguage>(
        'surveyParticipantAttributeLanguage',
      )
    const repoParticipant =
      this.getRepo<RepoSurveyParticipant>('surveyParticipant')

    const doc = await repoAttribute.findOne({ surveyId }, { context })
    if (!doc?.attributes.some((a) => a.name === attributeName)) {
      throw new ServerErrorNotFound('Participant attribute not found')
    }

    const updatedAttributes = doc.attributes.filter(
      (a) => a.name !== attributeName,
    )

    await repoAttribute.transaction(context, async (context) => {
      await repoAttribute.updateOne(
        { _id: doc._id },
        { $set: { attributes: updatedAttributes, updatedAt: new Date() } },
        { context },
      )

      await repoAttributeLanguage.updateMany(
        { surveyId },
        { $unset: { [`data.${attributeName}`]: '' } },
        { context },
      )

      await repoParticipant.updateMany(
        { surveyId },
        { $unset: { [`attributes.${attributeName}`]: '' } },
        { context },
      )
    })

    return true
  }

  async batchSave({
    surveyId,
    projectId,
    changes,
    orderedAttributeNames,
  }: BatchSaveParams): Promise<boolean> {
    // Build a map of original name → new name for all renames in this batch
    const renameMap = new Map<string, string>()
    for (const change of changes) {
      if (change.newName && change.newName !== change.attributeName) {
        renameMap.set(change.attributeName, change.newName)
      }
    }

    // Apply renames first so subsequent operations can use the new names
    for (const [attributeName, newName] of renameMap) {
      await this.rename({ surveyId, projectId, attributeName, newName })
    }

    // Apply field and language updates using the post-rename name
    for (const change of changes) {
      const effectiveName =
        renameMap.get(change.attributeName) ?? change.attributeName

      if (change.fields && Object.keys(change.fields).length > 0) {
        await this.update({
          surveyId,
          projectId,
          attributeName: effectiveName,
          attribute: change.fields,
        })
      }

      if (change.language) {
        for (const [languageCode, data] of Object.entries(change.language)) {
          await this.updateLanguage({
            surveyId,
            projectId,
            attributeName: effectiveName,
            languageCode,
            data,
          })
        }
      }
    }

    // Translate original names to post-rename names for reordering
    if (orderedAttributeNames && orderedAttributeNames.length > 0) {
      const translatedOrder = orderedAttributeNames.map(
        (name) => renameMap.get(name) ?? name,
      )
      await this.reorder({
        surveyId,
        projectId,
        orderedAttributeNames: translatedOrder,
      })
    }

    return true
  }

  async reorder({
    surveyId,
    projectId,
    orderedAttributeNames,
  }: {
    surveyId: string
    projectId: string
    orderedAttributeNames: string[]
  }): Promise<boolean> {
    const context = contextForProject(projectId)
    const repoAttribute = this.getRepo<RepoSurveyParticipantAttribute>(
      'surveyParticipantAttribute',
    )

    const doc = await repoAttribute.findOne({ surveyId }, { context })
    if (!doc) {
      return true
    }

    const byName = new Map(doc.attributes.map((a) => [a.name, a]))
    const reordered = orderedAttributeNames
      .map((name) => byName.get(name))
      .filter(Boolean) as SurveyParticipantAttributeDefinition[]

    await repoAttribute.updateOne(
      { _id: doc._id },
      { $set: { attributes: reordered, updatedAt: new Date() } },
      { context },
    )

    return true
  }
}

export default ServiceSurveyParticipantAttribute
