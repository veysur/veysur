import { SURVEY_PARTICIPANT_SYSTEM_ATTRIBUTE_NAMES } from './systemAttributes'

export interface AttributeCollision {
  name: string
}

/**
 * Given a list of candidate names for future system attributes, returns the
 * subset that collide with the provided custom attribute records.
 *
 * Usage (in a migration PR or CI script):
 *   const existing = await repoSurveyParticipantAttribute.find({})
 *   const collisions = checkSystemAttributeCollisions(['newField'], existing)
 *   assert(collisions.length === 0, 'Collision detected — rename before shipping')
 */
export function checkSystemAttributeCollisions(
  candidateNames: string[],
  existingAttributes: Array<{ name: string }>,
): AttributeCollision[] {
  const existingNames = new Set(existingAttributes.map((a) => a.name))
  const systemNames = new Set(SURVEY_PARTICIPANT_SYSTEM_ATTRIBUTE_NAMES)

  return candidateNames
    .filter((name) => existingNames.has(name) && !systemNames.has(name))
    .map((name) => ({ name }))
}
