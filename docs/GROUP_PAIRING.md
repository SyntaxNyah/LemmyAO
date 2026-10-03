# Group Pairing (`/grouppair`) — LemmyAO Client

> Server: **Nyathena**. See Nyathena `docs/GROUP_PAIRING.md` for the full wire
> contract (GP packet, `additional_chars`, ordering, offset escaping, `side`).

## Overview

Unbounded group pairing. N players form a group; when any member speaks, all
members render front→back behind the speaker (speaker included in the ordered
list). There is no size limit.

## Wire channels

- **`GP`** — JSON-only roster snapshot, sent to group members on change.
  Registered via `registerPacket("GP", { fanta, json })` and handled with
  `server.onCustom("GP", applyGroupPair)` in `src/groupPair.ts`.
- **`additional_chars`** — JSON field on every `MS`, broadcast to everyone,
  present only when a group member speaks. aolib-ts puts unknown keys in
  `packet.$extras`, so it is read as `packet.$extras.additional_chars`.

## Data flow

1. `src/groupPair.ts` — `GPMember` / `GP` types + `applyGroupPair` (roster
   state) + GP codec.
2. `src/viewport/utils/handleICSpeaking.ts` — `buildChatMsg` reads
   `packet.$extras?.additional_chars` for `hasGroup` (to suppress the legacy
   pair); `renderICMessage` calls
   `renderGroupPeers(membersFromAdditionalChars(chatmsg.$extras?.additional_chars), chatmsg.char_id, chatmsg.side)`.
3. `src/viewport/groupRender.ts` — `renderGroupPeers` draws the non-speaker
   members as `.client_char` div+img layers inside `#client_group`.
4. `src/viewport/utils/preloadMessageAssets.ts` — `buildEmoteUrls` (exported)
   builds the sprite candidate URLs.

## Key files

| file | role |
|---|---|
| `src/groupPair.ts` | `GPMember`/`GP` types, `applyGroupPair`, GP codec registration |
| `src/viewport/groupRender.ts` | `renderGroupPeers`, `membersFromAdditionalChars`, `container` |
| `src/viewport/utils/handleICSpeaking.ts` | `buildChatMsg` `hasGroup`, `renderGroupPeers` call site |
| `src/viewport/utils/preloadMessageAssets.ts` | `buildEmoteUrls` (exported for group sprites) |
| `src/utils/assetCache.ts` | `resolveAndPreloadImage` (used by group sprites) |

## Gotchas / pitfalls

- **Resolve sprites via the asset cache**, not a hardcoded
  `characters/<name>/(a)<emote>.gif`. Most packs use `.webp` / `.apng` / `.png`
  or a nested `(a)/` folder. `buildEmoteUrls` + `resolveAndPreloadImage` handle
  every extension and layout; the naive `.gif` URL 404s and renders nothing.
- **`#client_group` needs `isolation: isolate`** (its own stacking context), or
  the per-member `z-index` leaks out and paints above the speaker/pair **and**
  the chatbox. The chatbox (`#client_chatcontainer`) is a later sibling of
  `#client_gamewindow`, so the group must stay at the auto/0 level to sit below
  it.
- **Render from `additional_chars`, not the `groupPair` roster.** The roster is
  only for group lifecycle. (Fixes the new-joiner blank + "4th partner" ghost.)
- **FL direction.** aolib-ts models `FL` as server→client only; the
  client→server `grouppair` advert is a raw `FL#grouppair#%` wire send, and it
  must be guarded so a failure never hides the feature-gated UI
  (`src/client/featureFlags.ts`).
- **`membersFromAdditionalChars`** maps `charid`→`char_id` and defaults
  `offset.x/y` to `0`, producing the non-optional `GPMember.offset` shape.

## Pair order

LemmyAO reorders the **group** roster via the server's `/pairorder` command:

- **"To front" / "To behind"** buttons send `/pairorder <uid> front|back` with
  `client.playerID`, moving *you* within the roster.
- **Group list** (`#group_order_list`, rendered by `src/dom/pairOrder.ts`) shows
  members front→back with per-member `▲`/`▼` buttons sending
  `/pairorder <uid> up|down`, so any member can be moved to any position.

`initPairOrder()` subscribes to roster changes via `onGroupPairChange`; the
controls live in `public/client.html` behind `cccc_ic_support` with tooltips.

**Classic (non-group) pair order** — the aolib `paired_order` field (FantaCode
`^0`/`^1` suffix) — is pending: it requires aolib-ts **2.6.1**, which has
`paired_order` in `MSToServerInit` but is not yet on npm (latest is 2.6.0).
aolib-go v2.6.1 (Nyathena) already has it; once aolib-ts 2.6.1 is published,
`onICEnter.ts` should send `paired_order` and the buttons should branch on
in-group (classic → `paired_order`, group → `/pairorder`), mirroring AsyncAO.
