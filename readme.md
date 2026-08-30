# Scanlock

A Reddit bot for [/r/DeadlockTheGame](https://www.reddit.com/r/DeadlockTheGame/). Write an item or ability name in double brackets `[[ ]]` and it replies with that asset's current stats.

Up to five lookups per comment, names are matched loosely.

## How it works

Item and ability data comes from [deadlock-api.com](https://deadlock-api.com). A scheduled task checks hourly for a new game build and, when it finds one, rebuilds a snapshot into Redis under versioned keys.

Every comment and post in the subreddit is scanned for bracket tokens. A comment with no tokens never touches Redis.

## Layout

```
src/
  server/       triggers, Redis reads and writes, snapshot sync
  shared/
    snapshot/   fetch the API, strip the client's markup, shape the stats
    reply/      finds tokens, resolve names, render reply with markdown
  tools/        build a snapshot to disk for inspection
```

### Commands

- `npm run playtest [r/sub]`: watches changes, builds, uploads, and installs on Reddit
- `npm run build`: builds the server
- `npm run test`: types, lints, unit tests, and a build
- `npm run format`: fixes lints and formatting
- `npm run build-snapshot`: writes a snapshot to `data/`
- `npm run publish`: cleans, builds, uploads, and files a new app review request

## Notes

Not affiliated with Valve. Deadlock is in development and its data changes often. The reply footer names the build the information comes from.
