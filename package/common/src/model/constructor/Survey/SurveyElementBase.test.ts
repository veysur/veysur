import { SurveyContent } from './SurveyContent'
import { SurveyQuestion } from './SurveyQuestion'

describe('SurveyElementBase shared mutators', () => {
  test('withChanges returns the concrete subclass, not the base', () => {
    const q = new SurveyQuestion({ _id: 'q1', sectionId: 's1' })
    const c = new SurveyContent({ _id: 'c1', sectionId: 's1' })

    expect(q.updateSectionId('s2')).toBeInstanceOf(SurveyQuestion)
    expect(c.updateSectionId('s2')).toBeInstanceOf(SurveyContent)
  })

  test('updateText / updateSectionId are immutable', () => {
    const q = new SurveyQuestion({ _id: 'q1', sectionId: 's1' })
    const moved = q.updateSectionId('s2')
    expect(moved).not.toBe(q)
    expect(q.sectionId).toBe('s1')
    expect(moved.sectionId).toBe('s2')

    const relabelled = q.updateText('Hello', 'en')
    expect(relabelled).not.toBe(q)
    expect(relabelled.text.getLang('en')).toBe('Hello')
    expect(q.text.getLang('en')).not.toBe('Hello')
  })

  test('condition mixin keeps conditionReferences in sync and clears cleanly', () => {
    const c = new SurveyContent({ _id: 'c1', sectionId: 's1' })
    const conditioned = c.updateCondition('Q001 == "yes"')
    expect(conditioned.condition).toBe('Q001 == "yes"')
    expect(conditioned.conditionReferences).toContain('Q001')

    const cleared = conditioned.clearCondition()
    expect(cleared.condition).toBeNull()
    expect(cleared.conditionReferences).toBeNull()
  })

  test('attribute mixin sets and deletes on a content element', () => {
    const c = new SurveyContent({ _id: 'c1', sectionId: 's1' })
    const withAttr = c.setAttribute('foo', 'bar')
    expect(withAttr.attributes.foo).toBe('bar')
    expect(withAttr).toBeInstanceOf(SurveyContent)

    const withoutAttr = withAttr.deleteAttribute('foo')
    expect(withoutAttr.attributes.foo).toBeUndefined()
  })
})
