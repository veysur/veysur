import momentTimezone from 'moment-timezone'
// moment's per-locale bundles ship no type declarations
// @ts-expect-error - side-effect import, no types
import 'moment/locale/en-gb'

// House style is British English (see root AGENTS.md). Without this, moment's
// default 'en' locale renders `L`/`LL`/`ll` in US order (08/28/2026). Import
// once per sub-app entry point (and in the jest setup) before any date is
// formatted. See `docs/timestamps.md`.
momentTimezone.locale('en-gb')
