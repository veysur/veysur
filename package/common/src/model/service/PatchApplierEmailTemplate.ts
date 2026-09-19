import { EmailTemplate, EmailTemplateCollection } from 'model/constructor'

import {
  Patch,
  BUFFERED_PATCH_ACTION_UPDATE,
  BUFFERED_PATCH_ACTION_DELETE,
} from './Patcher'

// Note: BUFFERED_PATCH_TYPE_EMAIL_TEMPLATE is exported from PatchApplierSurvey
// to avoid duplicate exports

/**
 * Applies patches to EmailTemplateCollection
 *
 * Ensures that when fresh data arrives from the server, any buffered
 * patches are reapplied to prevent the view from reverting to a previous state.
 *
 * This is critical for optimistic updates: while patches are being sent to
 * the server, new patches can still be added to the buffer. When the server
 * responds with fresh data, it won't include the newly buffered patches yet,
 * so we must reapply them client-side.
 */
export class PatchApplierEmailTemplate {
  /**
   * Apply multiple patches to an email template collection
   *
   * @param patches - Array of patches to apply
   * @param collection - The email template collection to apply patches to
   * @returns New collection instance with patches applied
   */
  static applyPatches(
    patches: Patch[],
    collection: EmailTemplateCollection,
  ): EmailTemplateCollection {
    try {
      patches.forEach((patch) => {
        collection = this.applyPatch(patch, collection)
      })
    } catch (error) {
      console.error('Error applying email template patches', error)
    }
    return collection
  }

  /**
   * Apply a single patch to an email template collection
   *
   * @param patch - The patch to apply
   * @param collection - The email template collection
   * @returns New collection instance with patch applied
   */
  private static applyPatch(
    patch: Patch,
    collection: EmailTemplateCollection,
  ): EmailTemplateCollection {
    switch (patch.action) {
      case BUFFERED_PATCH_ACTION_UPDATE:
        return this.applyUpdatePatch(patch, collection)
      case BUFFERED_PATCH_ACTION_DELETE:
        return this.applyDeletePatch(patch, collection)
      default:
        console.warn(
          `Unsupported action for email template patch: ${patch.action}`,
        )
        return collection
    }
  }

  /**
   * Apply an UPDATE patch
   *
   * Creates or updates a template in the collection.
   * If subject and body are both null, the template is deleted (revert to default).
   *
   * @param patch - The update patch
   * @param collection - The email template collection
   * @returns New collection instance with template updated
   */
  private static applyUpdatePatch(
    patch: Patch,
    collection: EmailTemplateCollection,
  ): EmailTemplateCollection {
    if (!patch.data || typeof patch.data !== 'object') {
      console.warn('Invalid patch data for email template update')
      return collection
    }

    const { type, lang, subject, body, surveyId, _id } = patch.data as {
      type?: string
      lang?: string
      subject?: string | null
      body?: string | null
      surveyId?: string | null
      _id?: string
    }

    if (!type || !lang) {
      console.warn('Email template patch missing required type or lang')
      return collection
    }

    // If both subject and body are null, delete the template (revert to default)
    if (subject === null && body === null) {
      return collection.delete(type, lang)
    }

    // Get existing template or create new one
    const existingTemplate = collection.get(type, lang)

    const template = new EmailTemplate({
      _id: _id ?? existingTemplate?._id,
      surveyId: surveyId ?? existingTemplate?.surveyId,
      type,
      lang,
      subject: subject ?? existingTemplate?.subject ?? '',
      body: body ?? existingTemplate?.body ?? '',
      createdAt: existingTemplate?.createdAt,
      updatedAt: new Date(),
    })

    return collection.set(type, lang, template)
  }

  /**
   * Apply a DELETE patch
   *
   * Removes a template from the collection (revert to default).
   *
   * @param patch - The delete patch
   * @param collection - The email template collection
   * @returns New collection instance with template removed
   */
  private static applyDeletePatch(
    patch: Patch,
    collection: EmailTemplateCollection,
  ): EmailTemplateCollection {
    if (!patch.data || typeof patch.data !== 'object') {
      console.warn('Invalid patch data for email template delete')
      return collection
    }

    const { type, lang } = patch.data as {
      type?: string
      lang?: string
    }

    if (!type || !lang) {
      console.warn('Email template delete patch missing required type or lang')
      return collection
    }

    return collection.delete(type, lang)
  }
}
