import { Service } from '@datacapy/server'

import * as serviceMap from './service'
import { classArrayInstantiate } from './classArrayInstantiate'

export const services = classArrayInstantiate(
  Service,
  Object.values(serviceMap),
)

export default services
