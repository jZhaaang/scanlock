# Scanlock Privacy Policy

_Last updated: August 30, 2026_

Scanlock is a Reddit bot that replies to comments and posts containing `[[double bracketed]]` item or ability names. This policy describes what it does with data.

## What it reads

In a subreddit where a moderator has installed it, Scanlock is given the body of each new comment and post. It looks for bracketed names and ignores everything else. It also reads the author's username for the single purpose of recognizing its own comments so it does not reply to itself.

Scanlock reads only content that is already public on Reddit. It does not read private messages, and it does not read comment or post history.

## What it stores

Scanlock stores no personal data.

Its only stored data is a snapshot of public Deadlock game data: item and ability names, stats, and descriptions. These are fetched from [deadlock-api.com](https://deadlock-api.com). Nothing about a user, a comment, or a subreddit is written to storage.

## What it logs

Scanlock writes short diagnostic lines to Reddit's developer logs, containing the Reddit ID of the comment or post it acted on, how many names it found, and how many it answered.

When a bracketed name matches nothing, that name is logged too, so that missing and mispelled entries can be found and fixed. It is recorded in a reduced form (lowercased, stripped of punctuation, and truncated). Only the text between the brackets is ever recorded, never the rest of the comment. Scanlock does not log usernames.

These logs are held by Reddit under Reddit's own retention rules and are visible to the app developer.

## What it sends elsewhere

Scanlock makes outbound requests to one host, `api.deadlock-api.com`, and only to fetch public game data. No Reddit content, username, or identifier is ever included in those requests. Scanlock uses no analytics, and shares no data with any third party.

## What it publishes

Scanlock's replies are ordinary public Reddit comments and are subject to Reddit's Content Policy and to the rules of the subreddit they appear in. Moderators can remove them and can uninstall the app at any time, which stops it immediately.

## Contact

Questions, corrections, and removal requests:
[/u/-porkdumpling](https://www.reddit.com/user/-porkdumpling) or
[send a message](https://www.reddit.com/message/compose/?to=-porkdumpling&subject=Scanlock%20Inquiry).
