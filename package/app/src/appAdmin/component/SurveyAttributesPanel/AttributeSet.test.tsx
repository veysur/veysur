import { render, screen } from '@testing-library/react'

import { AttributeSet } from './AttributeSet'
import { AttributeConfig, AttributeSetConfig } from './attributesConfig'

jest.mock('./AttributeCard', () => ({
  AttributeCard: ({ attributeConfig }: { attributeConfig: { id: string } }) => (
    <div data-testid="attribute-card">{attributeConfig.id}</div>
  ),
}))

const attribute = (
  id: string,
  isVisible?: AttributeConfig['isVisible'],
): AttributeConfig =>
  ({ id, name: id, description: id, isVisible, getValue: jest.fn() }) as never

function renderSet(attributes: AttributeConfig[]) {
  const setConfig = {
    id: 'basic',
    name: 'Basic',
    entityTypes: [],
    attributeIds: attributes.map((a) => a.id),
    attributes,
  } as AttributeSetConfig
  render(
    <AttributeSet
      setConfig={setConfig}
      entity={{ _id: 'q1', attributes: { textFormat: 'email' } } as never}
      onChangeValue={jest.fn()}
    />,
  )
}

describe('AttributeSet visibility', () => {
  it('renders attributes without isVisible', () => {
    renderSet([attribute('a'), attribute('b')])
    expect(screen.getAllByTestId('attribute-card')).toHaveLength(2)
  })

  it('hides an attribute whose isVisible returns false for the entity', () => {
    renderSet([
      attribute('shown', () => true),
      attribute('hidden', () => false),
    ])
    expect(screen.getByText('shown')).toBeInTheDocument()
    expect(screen.queryByText('hidden')).not.toBeInTheDocument()
  })

  it('passes the focused entity to isVisible', () => {
    const isVisible = jest.fn(() => true)
    renderSet([attribute('a', isVisible)])
    expect(isVisible).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'q1' }),
    )
  })
})
