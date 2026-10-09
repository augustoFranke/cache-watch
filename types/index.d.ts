export type LastTurn = {
  model: string
  read: number
  written: number
  fresh: number
  endedAt: number
}

declare module 'claude-code' {
  interface PluginState {
    'cache-watch': { last: LastTurn | null; tick: number }
  }
}
