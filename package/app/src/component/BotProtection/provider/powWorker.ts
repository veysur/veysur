import { searchNonce } from './powSolve'

const BATCH = 5000

interface PowRequest {
  challenge: string
  bits: number
}

self.onmessage = (event: MessageEvent<PowRequest>) => {
  const { challenge, bits } = event.data
  for (let start = 0; ; start += BATCH) {
    const nonce = searchNonce(challenge, bits, start, BATCH)
    if (nonce !== null) {
      self.postMessage({ nonce })
      return
    }
  }
}
