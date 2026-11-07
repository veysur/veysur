# Participant read caching

Every participant of a published survey reads the same data until the next publish. Caching it cuts database and ORM work per participant, which is what limits throughput under load (see the stress tests).

Both caches use `RedisTwoTierCache` (`src/service/cache/`): a per-pod L1 map plus a shared L2 in the `cacheDb` Redis datasource. Without Redis, or if its setup fails, they run L1 only. L1 has a size limit (`maxEntries`, oldest entry out first) and `getOrLoad` shares one load between concurrent misses. A missing result or a thrown error is never cached. L2 returns plain JSON, so cached values must not rely on class instances.

## Snapshot bodies (response save)

`ServiceSurveyParticipantResponse.save` needs the full published snapshot on every save. Snapshots never change, so they are cached for 10 minutes by project and snapshot id (50 entries per pod). Deleting a snapshot does not invalidate; a deleted one is served for at most the TTL.

## Live survey, views and bot protection (auth and snapshot GET)

`ServiceSurveyParticipantCache` (`surveyParticipantCache`) holds three caches with a 5 second TTL:

| Cache | Key | Used by |
|---|---|---|
| `live` | project, survey | publication and partial snapshot in `ServiceAuthParticipant.auth` and `ServiceSurveyParticipantSnapshot` |
| `view` | project, snapshot, language | the assembled survey view returned to a participant |
| `botProtection` | project | the project's bot-protection setting without secrets (verification reads it uncached) |

Writers invalidate explicitly, and Redis pub/sub carries it to the other pods:

| Change | Call |
|---|---|
| Publish, republish, unpublish, snapshot or survey deletion | `invalidateSurvey(projectId, surveyId)` |
| Project or survey settings write | `invalidateProject(projectId)` |

A response that has started is not affected by any of this. Saves use the snapshot id in the participant's token, and a returning participant with saved answers is resumed on their original snapshot, so both read caches keyed by that immutable id. Invalidating `live` only changes what a participant who starts afterwards gets.

Anything with no hook, such as an entitlement an extension gates the view on, is stale for at most the 5 second TTL. So is a stopped survey on a pod that missed the message: it can issue participant tokens for up to 5 seconds.

## Adding a cached read

Put the loader in the consumer, call the cache's `get*` method, and add an invalidation call next to every write that changes the data. Tests that exercise loaders use `passthroughParticipantCache()` (`src/test-utils/`).
