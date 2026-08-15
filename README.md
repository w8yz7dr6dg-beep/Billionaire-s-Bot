# Billionaires Bot

## Commands
- `/check roblox_username` — public. Shows a player's Jailbreak inventory value.
- `/verify discord_user roblox_username` — Admin+ only. Looks up their inventory
  value and assigns the matching net-worth role, removing any previous tier role.
- `/leaderboard` — Staff only to run. Posts the ranked leaderboard of everyone
  who's been `/verify`'d. Anyone can click the Prev/Next buttons — each click
  replies **ephemerally** (only the clicker sees it), so browsing pages never
  touches the shared public message.
- `/suggest title url vote` — public. Posts an embed to the suggestions channel
  and logs who submitted it in a staff channel.
- `/inventoryticket [note]` — Staff only to run. Posts the "Premium Access"-style
  panel. Each Buy button opens a private ticket channel under the configured
  category.

## Setup

1. `npm install`
2. Copy `.env.example` → `.env`, fill in `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID`
3. **Fill in `config.js`** — every `'REPLACE_ME'` needs a real ID:
   - `ADMIN_ROLE_ID`, `STAFF_ROLE_ID`
   - `SUGGESTIONS_LOG_CHANNEL_ID`
   - All 14 `roleId` values under `NET_WORTH_TIERS`
   - `TICKET_PANEL.thumbnailUrl` (the banner image from the screenshot)
   - Adjust `TICKET_PANEL.products` if the price list ever changes
4. `npm start`

## Things worth double-checking once it's running
- **`getItemValues()` in `jbvalues.js`** assumes the `/v1/items` response is an
  object of item objects, each with `gameId` and `value` fields. If leaderboard
  totals look wrong, log the raw response once and adjust the field names.
- **Leaderboard data is in-memory only** (`leaderboardCache` in `index.js`) —
  if the bot restarts between someone running `/leaderboard` and clicking a
  page button, they'll get an "expired" message. Fine for normal use, just
  flagging it.
- **`/leaderboard` currently reads `last_value` stored at time of `/verify`**,
  not a live refetch — so values only update when someone re-runs `/verify`.
  If you want it to live-refetch everyone's current inventory value each time
  staff runs `/leaderboard`, say so and I'll change it (it'll just be slower —
  one API call per verified user).
