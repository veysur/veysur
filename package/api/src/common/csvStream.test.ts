import type { HttpResponse, StreamOptions } from '@datacapy/server'
import type { Readable } from 'stream'

import { generateCsvFilename, streamCsv } from './csvStream'

function fakeResponse() {
  const sent: { text: string; options?: StreamOptions } = { text: '' }
  const res = {
    stream: async (readable: Readable, options?: StreamOptions) => {
      for await (const chunk of readable) sent.text += String(chunk)
      sent.options = options
    },
  } as unknown as HttpResponse
  return { res, sent }
}

describe('streamCsv', () => {
  it('writes the header row then every mapped row, with download headers', async () => {
    const { res, sent } = fakeResponse()
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce([{ n: 'a' }, { n: 'b' }])
      .mockResolvedValueOnce([])

    await streamCsv<{ n: string }>(
      res,
      'out.csv',
      ['Name'],
      fetcher,
      (d) => [d.n],
      2,
    )

    expect(sent.text).toBe('Name\na\nb\n')
    expect(sent.options?.headers).toEqual({
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="out.csv"',
    })
    expect(fetcher.mock.calls).toEqual([
      [0, 2],
      [2, 2],
    ])
  })

  it('stops after a short batch without another fetch', async () => {
    const { res, sent } = fakeResponse()
    const fetcher = jest.fn().mockResolvedValueOnce([{ n: 'x' }])

    await streamCsv<{ n: string }>(
      res,
      'o.csv',
      ['N'],
      fetcher,
      (d) => [d.n],
      5,
    )

    expect(sent.text).toBe('N\nx\n')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('quotes values that contain commas, quotes or newlines', async () => {
    const { res, sent } = fakeResponse()
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce([{ n: 'a,"b"\nc' }])
      .mockResolvedValueOnce([])

    await streamCsv<{ n: string }>(
      res,
      'o.csv',
      ['N'],
      fetcher,
      (d) => [d.n],
      1,
    )

    expect(sent.text).toBe('N\n"a,""b""\nc"\n')
  })

  it('writes only the header row when there is no data', async () => {
    const { res, sent } = fakeResponse()

    await streamCsv(
      res,
      'o.csv',
      ['A', 'B'],
      async () => [],
      () => [],
      10,
    )

    expect(sent.text).toBe('A,B\n')
  })

  it('rejects when the data fetcher fails', async () => {
    const { res } = fakeResponse()
    const fetcher = jest.fn().mockRejectedValue(new Error('db down'))

    await expect(
      streamCsv(res, 'o.csv', ['A'], fetcher, () => [], 10),
    ).rejects.toThrow('db down')
  })
})

describe('generateCsvFilename', () => {
  it('joins prefix, survey id and the current date', () => {
    expect(generateCsvFilename('participants', 's1')).toMatch(
      /^participants-s1-\d{4}-\d{2}-\d{2}\.csv$/,
    )
  })
})
