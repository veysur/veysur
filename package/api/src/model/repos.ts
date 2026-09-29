import { Repo } from '@datacapy/server'

import { classArrayInstantiate } from './classArrayInstantiate'
import * as repoMap from './repo'

export const repos = classArrayInstantiate(
  Repo<unknown>,
  Object.values(repoMap),
)

export default repos
