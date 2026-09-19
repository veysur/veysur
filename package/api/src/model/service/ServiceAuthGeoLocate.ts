import { Service } from 'mzen-server'
import { lookupIp } from 'model/common'

export class ServiceAuthGeoLocate extends Service {
  constructor() {
    super({
      name: 'authGeoLocate',
    })
  }

  async geoLocate(user, clientData, accessToken) {
    if (clientData.ip) {
      accessToken.ip = clientData.ip

      const clientOld = user.client
        ? user.client.filter((client) => clientData._id == client._id).shift()
        : null
      const accessTokens =
        clientOld && clientOld.accessToken ? clientOld.accessToken.slice() : []

      const previousTokenWithSameIp = accessTokens
        .filter((accessToken) => accessToken.ip == clientData.ip)
        .shift()

      try {
        if (previousTokenWithSameIp && previousTokenWithSameIp.geo) {
          // Deep clone hack
          accessToken.geo = JSON.parse(
            JSON.stringify(previousTokenWithSameIp.geo),
          )
        } else {
          const geo = await lookupIp(clientData.ip)
          if (geo) {
            accessToken.geo = {
              country: geo.country,
              countryCode: geo.countryCode,
              region: geo.region,
              regionCode: geo.regionCode,
              city: geo.city,
              location: {
                type: 'Point',
                coordinates: [geo.lon, geo.lat],
              },
              timezone: geo.timezone,
            }
          }
        }
      } catch (e) {
        // GeoIP failure should not be fatal
        this.logger.warn('geo lookup failed with: ' + e)
      }
    }
  }
}

export default ServiceAuthGeoLocate
