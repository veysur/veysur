import { strict as assert } from 'assert'
import type { DataSourceRedis } from 'mzen-om'
import { AuthHandoffStore } from './AuthHandoffStore'

// ─── Minimal DataSourceRedis mock, simulating SET EX / GET+DEL via eval ───────

class MockRedis {
  private store = new Map<string, { value: string; expiresAt: number }>()

  async eval(script: string, _numKeys: number, ...args: string[]) {
    const [key] = args
    const isMint = script.includes("redis.call('SET'")

    if (isMint) {
      const [, value, ttlSeconds] = args
      this.store.set(key, {
        value,
        expiresAt: Date.now() + Number(ttlSeconds) * 1000,
      })
      return 1
    }

    // redeem: GET then conditional DEL
    const entry = this.store.get(key)
    if (!entry || entry.expiresAt <= Date.now()) {
      this.store.delete(key)
      return null
    }
    this.store.delete(key)
    return entry.value
  }
}

function makeStore(redis: MockRedis | null) {
  const store = new AuthHandoffStore()
  store.init(redis as unknown as DataSourceRedis)
  return store
}

describe('AuthHandoffStore', () => {
  test('mint then redeem returns the same payload', async () => {
    const store = makeStore(new MockRedis())
    const payload = { auth: { jwt: 'abc' }, rememberMe: true }

    const { token } = await store.mint(payload)
    const redeemed = await store.redeem(token)

    assert.deepEqual(redeemed, payload)
  })

  test('redeem is single-use - a second redeem of the same token returns null', async () => {
    const store = makeStore(new MockRedis())
    const { token } = await store.mint({ auth: {}, rememberMe: false })

    const first = await store.redeem(token)
    const second = await store.redeem(token)

    assert.ok(first)
    assert.equal(second, null)
  })

  test('redeem returns null for an unknown token', async () => {
    const store = makeStore(new MockRedis())
    const result = await store.redeem('does-not-exist')
    assert.equal(result, null)
  })

  test('mint throws when Redis is unavailable', async () => {
    const store = makeStore(null)
    await expect(store.mint({ auth: {}, rememberMe: false })).rejects.toThrow()
  })

  test('redeem throws when Redis is unavailable', async () => {
    const store = makeStore(null)
    await expect(store.redeem('any-token')).rejects.toThrow()
  })
})
