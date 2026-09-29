import { Collection } from '@datacapy/schema'
import * as constructorsLocal from './constructor'

export const constructors = {
  Collection: Collection,
  ...constructorsLocal,
}
export default constructors
