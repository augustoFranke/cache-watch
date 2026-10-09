# cache-watch

A Claude Code mod that adds a band above the prompt:

`ctx 125k · read 125k · written 0.3k · cache expires in 4:40`

- `ctx`: current context size (same figure as the context window meter).
- `read` / `written`: prompt-cache tokens read / written by the last request.
- Countdown: time left on the cache, assuming a 5-minute TTL from the last request.
- After you switch model, the band turns dark red: the next prompt will not read the old cache and rewrites the whole context.

## Install

```
/plugin install cache-watch --marketplace augustoFranke/cache-watch
```

Answer `y` to add the marketplace, then pick a scope.
