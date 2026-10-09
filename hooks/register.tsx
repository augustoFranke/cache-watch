import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { LastTurn } from '../types'

const TTL_MS = 5 * 60 * 1000
const last = atom({ plugin: 'cache-watch', key: 'last' } as const, null)
const tick = atom({ plugin: 'cache-watch', key: 'tick' } as const, 0)

const k = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : `${n}`)
const clock = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export const register: Register = on => {
  on('session.start', ($, e, next) => {
    void $.clock.every(1000, () => {
      void update($, tick, n => n + 1)
      $.ui.invalidate('ui.render')
    })

    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    const stream = next(e)

    while (true) {
      const { done, value } = await stream.next()

      if (done) {
        return value
      }

      if (value.kind === 'stop' && value.usage && e.agentId === undefined) {
        const u = value.usage
        const turn: LastTurn = {
          model: u.model,
          read: u.cache_read_input_tokens,
          written: u.cache_creation_input_tokens,
          fresh: u.input_tokens,
          endedAt: await $.clock.now(),
        }
        await update($, last, () => turn)
      }

      yield value
    }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    await read($, tick)
    const turn = await read($, last)

    if (e.props.hasSurvey || turn === null) {
      return next(e)
    }

    const now = await $.clock.now()
    const model = await $.session.model()
    const left = turn.endedAt + TTL_MS - now
    const ctx = (await $.session.usage()).context.tokens ?? turn.read + turn.written + turn.fresh
    const isSwitched = !turn.model.includes(model) && !model.includes(turn.model)
    const { Box, Text } = $.ui.resolve(e)

    const cache =
      left > 0 ? `cache expires in ${clock(left)}` : 'cache expired (next prompt rewrites everything)'
    const warn = isSwitched
      ? ` · model switched: next prompt will NOT read cache, rewrites ~${k(ctx)} tokens`
      : ''

    return (
      <Box>
        <Text dimColor={!isSwitched && left > 0} color={isSwitched || left <= 0 ? 'rgb(185,28,28)' : undefined}>
          ctx {k(ctx)} · read {k(turn.read)} · written {k(turn.written)} · {cache}
          {warn}
        </Text>
      </Box>
    )
  })
}
