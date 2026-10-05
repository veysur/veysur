import { Collection } from '@datacapy/schema'
import * as constructorsLocal from './constructor'

export const constructors: typeof constructorsLocal & { Collection: typeof Collection } = {
  Collection: Collection,
  ...constructorsLocal,
}
export default constructors
