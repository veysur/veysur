---
'veysur-common': minor
'veysur-api': minor
'veysur-app': minor
---

A map question's starting latitude, longitude and zoom are now optional. Left blank, the map opens on the participant's city, or their country, found from their IP address, or on the world map. Set `API_MAPS_AUTO_LOCATE=false` to turn the lookup off. Anonymous surveys never look the participant up.
