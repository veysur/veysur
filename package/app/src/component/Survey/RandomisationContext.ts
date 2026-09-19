import { createContext, useContext } from 'react'

export type RandomisationContextValue = {
  randomSeeds: Record<string, number>
  onSeedRequired: (key: string, seed: number) => void
}

export const RandomisationContext = createContext<RandomisationContextValue>({
  randomSeeds: {},
  onSeedRequired: () => {},
})

export const useRandomisationContext = () => useContext(RandomisationContext)
