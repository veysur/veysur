import { Collection } from 'mzen-schema'
import * as constructorsLocal from './constructor'

export const constructors = {
  Collection: Collection,
  ...constructorsLocal,
}
export default constructors
