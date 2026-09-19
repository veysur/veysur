import {
  PersistedClient,
  Persister,
} from '@tanstack/react-query-persist-client'

/**
 * Storage type for query persistence
 * - 'local': Use localStorage for long-term persistence
 * - 'session': Use sessionStorage for session-only persistence
 */
export type StorageType = 'local' | 'session'

/**
 * Persistence configuration for individual queries
 */
export interface PersistenceConfig {
  /** Whether persistence is enabled for this query */
  enabled?: boolean
  /** Storage type to use (defaults to 'local') */
  storageType?: StorageType
}

/**
 * Default persistence configuration for BrowserPersister
 */
export interface DefaultPersistenceConfig {
  /** Default enabled state for queries without explicit config (defaults to true) */
  enabled?: boolean
  /** Default storage type for queries without explicit config (defaults to 'local') */
  storageType?: StorageType
  /** Storage key for persisted data (defaults to 'REACT_QUERY_OFFLINE_CACHE') */
  storageKey?: string
  /**
   * Query-key first segments that follow the "remember me" choice: routed to localStorage when
   * `isRemembered` returns true, sessionStorage otherwise. Everything else without an explicit
   * `meta.persistence.storageType` uses the static `storageType` default.
   */
  rememberableQueryKeyPrefixes?: string[]
  /** Inspects the full query list to decide whether the user opted into a remembered session */
  isRemembered?: (queries: PersistedClient['clientState']['queries']) => boolean
  /** App build version stamped into every persisted blob (defaults to 'dev') */
  buildVersion?: string
  /**
   * Query-key first segments that survive a `buildVersion` mismatch untouched. Everything else
   * is dropped on restore (simply refetched fresh) rather than blindly rehydrated.
   */
  protectedQueryKeyPrefixes?: string[]
  /**
   * Max age (ms) of the sessionStorage blob before it is discarded on restore. sessionStorage
   * is already cleared on browser close; this bounds stale data in a long-lived open tab.
   * Defaults to `Infinity`.
   */
  sessionMaxAge?: number
  /**
   * Max age (ms) of the localStorage blob (the remembered auth session) before it is discarded
   * on restore, forcing re-login. Defaults to `Infinity`.
   */
  localMaxAge?: number
}

/**
 * Shape of the JSON blob actually written to storage — a `PersistedClient` plus a
 * storage-only version stamp used to detect stale blobs from a previous deploy.
 */
type StoredClient = PersistedClient & { veysurBuildVersion?: string }

/**
 * Augment TanStack Query's RegisteredQueryMeta to include persistence config
 */
declare module '@tanstack/react-query' {
  interface Register {
    queryMeta: {
      /** Persistence configuration for this query */
      persistence?: PersistenceConfig
    }
  }
}

/**
 * Browser persister that routes queries to different storage types based on their meta configuration
 */
export class BrowserPersister implements Persister {
  private localStorage: Storage
  private sessionStorage: Storage
  private defaults: Required<
    Omit<
      DefaultPersistenceConfig,
      | 'isRemembered'
      | 'rememberableQueryKeyPrefixes'
      | 'protectedQueryKeyPrefixes'
    >
  > & {
    isRemembered?: DefaultPersistenceConfig['isRemembered']
    rememberableQueryKeyPrefixes: string[]
    protectedQueryKeyPrefixes: string[]
  }

  constructor(
    localStorage: Storage,
    sessionStorage: Storage,
    defaults?: DefaultPersistenceConfig,
  ) {
    this.localStorage = localStorage
    this.sessionStorage = sessionStorage
    this.defaults = {
      enabled: defaults?.enabled ?? true,
      storageType: defaults?.storageType ?? 'local',
      storageKey: defaults?.storageKey ?? 'QUERY_CACHE',
      rememberableQueryKeyPrefixes:
        defaults?.rememberableQueryKeyPrefixes ?? [],
      isRemembered: defaults?.isRemembered,
      buildVersion: defaults?.buildVersion ?? 'dev',
      protectedQueryKeyPrefixes: defaults?.protectedQueryKeyPrefixes ?? [],
      sessionMaxAge: defaults?.sessionMaxAge ?? Infinity,
      localMaxAge: defaults?.localMaxAge ?? Infinity,
    }
  }

  /**
   * Persist client state to appropriate storage based on query meta
   */
  async persistClient(client: PersistedClient): Promise<void> {
    // Separate queries by storage type
    const localQueries: PersistedClient['clientState']['queries'] = []
    const sessionQueries: PersistedClient['clientState']['queries'] = []

    const remembered = this.defaults.isRemembered
      ? this.defaults.isRemembered(client.clientState.queries)
      : false

    for (const query of client.clientState.queries) {
      const meta = query.meta as { persistence?: PersistenceConfig } | undefined
      const persistence = meta?.persistence

      // Determine if persistence is enabled (use query config or default)
      const enabled = persistence?.enabled ?? this.defaults.enabled
      if (!enabled) {
        continue
      }

      // Storage type precedence: explicit meta > rememberable prefix (localStorage only when
      // the session is remembered) > static default.
      const isRememberable =
        Array.isArray(query.queryKey) &&
        this.defaults.rememberableQueryKeyPrefixes.includes(
          query.queryKey[0] as string,
        )
      const storageType =
        persistence?.storageType ??
        (isRememberable
          ? remembered
            ? 'local'
            : 'session'
          : this.defaults.storageType)
      if (storageType === 'session') {
        sessionQueries.push(query)
      } else {
        localQueries.push(query)
      }
    }

    // Persist to localStorage (or clear if no local queries)
    if (localQueries.length > 0) {
      const localClient: StoredClient = {
        ...client,
        clientState: {
          ...client.clientState,
          queries: localQueries,
        },
        veysurBuildVersion: this.defaults.buildVersion,
      }
      this.localStorage.setItem(
        this.defaults.storageKey,
        JSON.stringify(localClient),
      )
    } else {
      this.localStorage.removeItem(this.defaults.storageKey)
    }

    // Persist to sessionStorage (or clear if no session queries)
    if (sessionQueries.length > 0) {
      const sessionClient: StoredClient = {
        ...client,
        clientState: {
          ...client.clientState,
          queries: sessionQueries,
        },
        veysurBuildVersion: this.defaults.buildVersion,
      }
      this.sessionStorage.setItem(
        this.defaults.storageKey,
        JSON.stringify(sessionClient),
      )
    } else {
      this.sessionStorage.removeItem(this.defaults.storageKey)
    }
  }

  /**
   * Drops queries from a stale (or unstamped) blob, keeping only those whose queryKey's first
   * segment is in `protectedQueryKeyPrefixes`. Blobs matching the current buildVersion pass
   * through untouched.
   */
  private filterStaleClient(stored: StoredClient): StoredClient {
    if (stored.veysurBuildVersion === this.defaults.buildVersion) {
      return stored
    }
    return {
      ...stored,
      clientState: {
        ...stored.clientState,
        queries: stored.clientState.queries.filter(
          (query) =>
            Array.isArray(query.queryKey) &&
            this.defaults.protectedQueryKeyPrefixes.includes(
              query.queryKey[0] as string,
            ),
        ),
      },
    }
  }

  /**
   * Reads and parses one store's blob, applies build-version filtering, and discards it
   * (removing the item) when its persisted `timestamp` is older than `maxAge`.
   */
  private readStoredClient(
    storage: Storage,
    maxAge: number,
  ): StoredClient | undefined {
    const raw = storage.getItem(this.defaults.storageKey)
    if (!raw) {
      return undefined
    }
    const stored = JSON.parse(raw) as StoredClient
    const timestamp = stored.timestamp
    if (
      maxAge !== Infinity &&
      (typeof timestamp !== 'number' || Date.now() - timestamp > maxAge)
    ) {
      storage.removeItem(this.defaults.storageKey)
      return undefined
    }
    return this.filterStaleClient(stored)
  }

  /**
   * Restore client state from storage
   * Merges queries from both localStorage and sessionStorage
   */
  async restoreClient(): Promise<PersistedClient | undefined> {
    try {
      // Restore from localStorage
      const localClient = this.readStoredClient(
        this.localStorage,
        this.defaults.localMaxAge,
      )

      // Restore from sessionStorage
      const sessionClient = this.readStoredClient(
        this.sessionStorage,
        this.defaults.sessionMaxAge,
      )

      // If we have data from both storages, merge them
      if (localClient && sessionClient) {
        return {
          ...localClient,
          clientState: {
            ...localClient.clientState,
            queries: [
              ...localClient.clientState.queries,
              ...sessionClient.clientState.queries,
            ],
            mutations: [
              ...localClient.clientState.mutations,
              ...sessionClient.clientState.mutations,
            ],
          },
        }
      }

      // Return whichever one we have
      return localClient || sessionClient
    } catch (error) {
      console.error('Failed to restore query client:', error)
      return undefined
    }
  }

  /**
   * Remove persisted client state from all storage types
   */
  async removeClient(): Promise<void> {
    this.localStorage.removeItem(this.defaults.storageKey)
    this.sessionStorage.removeItem(this.defaults.storageKey)
  }
}
