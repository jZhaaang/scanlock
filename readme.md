# Scanlock

A Reddit bot for [/r/DeadlockTheGame](https://www.reddit.com/r/DeadlockTheGame/). Write an item or ability name in double brackets `[[ ]]` and it replies with that asset's current stats. It aims to improve discussion about Deadlock for both new and experienced players by supplementing context about mentioned items and abilities.

Up to five lookups per comment, names are matched loosely. A name that matches nothing gets no reply.

## How it works

Item and ability data comes from [deadlock-api.com](https://deadlock-api.com). A scheduled task checks hourly for a new game build and, when it finds one, rebuilds a snapshot into Redis under versioned keys.

Every comment and post in the subreddit is scanned for bracket tokens. A comment with no tokens never touches Redis. 

### Example

Make a comment with item or ability names in double brackets in a subreddit where Scanlock is installed.

**User:**

"[[Mystic Shot]] used to work with [[Tankbuster]]+[[Spirit Burn]] but they nerfed it"

**Scanlock:**
- [Mystic Shot](https://deadlock.wiki/Mystic_Shot) | **[Weapon Item]** Tier 2, 1600 Souls  
  **+7** Spirit Power  
  **[Passive (8s)]** Your next bullet deals bonus **spirit damage**.  
  **+40** <sup>+0.9×Spirit</sup> Spirit Damage
- [Tankbuster](https://deadlock.wiki/Tankbuster) | **[Spirit Item]** Tier 3, 3200 Souls  
  **+50** Bonus Health  
  **[Passive]** Charges up over time with **bonus spirit damage**, causing abilities dealing more than **165** damage to deal additional damage. **Ignores Spirit Resistance.**  
  **40** Damage, **8%** Current Health Bonus Damage, **14s** Charge-Up Time
- [Spirit Burn](https://deadlock.wiki/Spirit_Burn) | **[Spirit Item]** Tier 4, 6400 Souls  
  **+6%** Ability Range  
  **[Passive]** Dealing significant **spirit damage** to an enemy within 5s causes an explosion dealing damage and a burn to that enemy. While burning, enemies take damage over time and receive reduced healing.  
  *The cooldown is per enemy, so each target can only be burned once per cooldown. Deals half-damage on non-heroes.*  
  **500** Damage Threshold, **50** Explosion Damage, **24** <sup>+0.06×Spirit</sup> Damage Per Second, **20s** Immunity Duration, **8s** Debuff Duration, **-70%** Healing Reduction

---

<sup>Call me with up to 5 [[ name ]]</sup> <sup>|</sup> <sup>Deadlock build 6684, as of 2026-09-02</sup> <sup>|</sup> <sup>data from deadlock-api.com</sup> <sup>|</sup> <sup>[Questions?](https://www.reddit.com/message/compose/?to=-porkdumpling&subject=Scanlock%20Inquiry)</sup>



## Layout

```
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

## Changelog

- 0.0.3 - Extend doc, add usage examples
- 0.0.2 - Initial Release

## Notes

Not affiliated with Valve. Deadlock is in development and its data changes often. The reply footer names the build the information comes from.
