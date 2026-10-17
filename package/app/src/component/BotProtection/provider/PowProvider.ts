import {
  BotChallenge,
  BotProtectionProvider,
  BotProtectionSolveOptions,
} from '../BotProtectionProvider'
import { createPowWorker } from './createPowWorker'
import { searchNonce } from './powSolve'

const BATCH = 2000

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * VeySur Bot Detection, a proof of work: find a nonce whose hash has the leading zero
 * bits the API asked for. Runs in a worker, or in short batches on the page
 * when workers are unavailable.
 */
export class PowProvider implements BotProtectionProvider {
  readonly name = 'simple'

  async solve({ fetchChallenge }: BotProtectionSolveOptions) {
    const challenge = await fetchChallenge()
    const startedAt = Date.now()
    const nonce = await this.findNonce(challenge)
    const waitMs = challenge.minSeconds * 1000 - (Date.now() - startedAt)
    if (waitMs > 0) await wait(waitMs)
    return `${challenge.challenge}:${nonce}`
  }

  private findNonce({ challenge, bits }: BotChallenge): Promise<number> {
    const worker = createPowWorker()
    return worker
      ? this.findNonceInWorker(worker, challenge, bits)
      : this.findNonceOnPage(challenge, bits)
  }

  private findNonceInWorker(
    worker: Worker,
    challenge: string,
    bits: number,
  ): Promise<number> {
    return new Promise((resolve, reject) => {
      worker.onmessage = (event: MessageEvent<{ nonce: number }>) => {
        worker.terminate()
        resolve(event.data.nonce)
      }
      worker.onerror = (event) => {
        worker.terminate()
        reject(new Error(event.message))
      }
      worker.postMessage({ challenge, bits })
    })
  }

  private async findNonceOnPage(
    challenge: string,
    bits: number,
  ): Promise<number> {
    for (let start = 0; ; start += BATCH) {
      const nonce = searchNonce(challenge, bits, start, BATCH)
      if (nonce !== null) return nonce
      await wait(0)
    }
  }
}
