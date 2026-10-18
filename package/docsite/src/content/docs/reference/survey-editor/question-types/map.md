---
title: Map Question Type
description: Reference for the Map question type in VeySur.
---

The Map question type lets a participant mark one place on a map. Use it to collect a location, such as where an incident happened.

## Options

| Option | Description |
|--------|-------------|
| Required | Participant must choose a place. |
| Map provider | Project default, OpenStreetMap or Google Maps. Google Maps needs a key; without one the question uses OpenStreetMap. |
| Starting view | Automatic opens on the participant's likely place, guessed from browser settings. Fixed point opens on a latitude and longitude, with an optional zoom (1 to 18). |
| Address search | Lets participants search for a place by name. |
| Use my location | Adds a button that uses the device location. |
| Allowed countries | Accepts places only in the listed countries. Empty means anywhere. |
| Precision | Exact, or approximate (rounded to about 11 km, with no address stored). |

## Google Maps key

A project admin can set a Google Maps key under **Settings > Survey**, and a single survey can override it in its own settings. The key replaces any key configured for the whole installation. Participants receive the key, so restrict it to the survey websites in the Google Cloud console.

## Results

The statistics page shows a Map question as a map. Nearby places merge into numbered bubbles that split as the map zooms in. Locations are grouped to about 110 metres. The results map always uses OpenStreetMap.

## Notes

- Anonymous surveys always store approximate places, hide the device location button.
- The project owner is responsible for any participant consent that a map provider requires.
- An embedded survey contacts no map service until the participant selects **Show map**.
- CSV export writes one column in the form `latitude,longitude,address`. CSV import reads the same form.

## Common behaviours

Map questions can have a **condition** controlling whether they are shown. See [Conditional Questions](/reference/survey-editor/conditional-questions/). Each question also has a **code** used in exports and conditions.
