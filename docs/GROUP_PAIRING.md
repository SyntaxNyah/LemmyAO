# Group Pairing (`/grouppair`) — LemmyAO Client

> Server: **Nyathena**. See Nyathena `docs/GROUP_PAIRING.md` for the full wire
> contract (GP packet, `additional_chars`, ordering, offset escaping, `side`).

## Overview

Unbounded group pairing. N players form a group; when any member speaks, all
members render in the roster's front→back order around the speaker (speaker
included in the ordered list). There is no size limit.

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
   `renderGroupPeers(membersFromAdditionalChars(chatmsg.$extras?.additional_chars), chatmsg.char_id, chatmsg.side, { honorOrder: true })`.
3. `src/viewport/groupRender.ts` — `renderGroupPeers` draws the non-speaker
   members as `.client_char` div+img layers inside `#client_group_behind`
   and/or `#client_group_front`, anchored immediately before/after the
   speaker's own sprite layer.
4. `src/viewport/utils/preloadMessageAssets.ts` — `buildEmoteUrls` (exported)
   builds the sprite candidate URLs.

## Key files

| file | role |
|---|---|
| `src/groupPair.ts` | `GPMember`/`GP` types, `applyGroupPair`, GP codec registration |
| `src/viewport/groupRender.ts` | `renderGroupPeers`, `membersFromAdditionalChars`, behind/front containers |
| `src/viewport/utils/handleICSpeaking.ts` | `buildChatMsg` `hasGroup`, `renderGroupPeers` call site |
| `src/viewport/utils/preloadMessageAssets.ts` | `buildEmoteUrls` (exported for group sprites) |
| `src/utils/assetCache.ts` | `resolveAndPreloadImage` (used by group sprites) |

## Gotchas / pitfalls

- **Resolve sprites via the asset cache**, not a hardcoded
  `characters/<name>/(a)<emote>.gif`. Most packs use `.webp` / `.apng` / `.png`
  or a nested `(a)/` folder. `buildEmoteUrls` + `resolveAndPreloadImage` handle
  every extension and layout; the naive `.gif` URL 404s and renders nothing.
- **Stacking is DOM order, not `z-index`.** `#client_group_behind` is inserted
  immediately before the speaker layer and `#client_group_front` immediately
  after it; both need `isolation: isolate`. Within each container, members are
  appended front-most last. Do **not** give the layers or containers a positive
  `z-index`: the chatbox (`#client_chatcontainer`) is a later sibling of
  `#client_gamewindow`, and a positive z-index can lift sprites above it.
- **Order is the array position, not `m.order`.** The roster array is
  front→back with the speaker included (`order 0` is the front-most member).
  The renderer finds the speaker's array index and splits the peers around it;
  a member before the speaker is drawn in front, a member after is drawn
  behind. The old code filtered the speaker out and put every peer in one
  container before the speaker, which made `/pairorder` unable to move the
  speaker at all; it also used `zIndex = order`, which is inverted (higher
  `order` means further back).
- **Render from `additional_chars`, not the `groupPair` roster.** The roster is
  only for group lifecycle. (Fixes the new-joiner blank + "4th partner" ghost.)
- **FL direction.** aolib-ts models `FL` as server→client only; the
  client→server `grouppair` advert is a raw `FL#grouppair#%` wire send, and it
  must be guarded so a failure never hides the feature-gated UI
  (`src/client/featureFlags.ts`).
- **`membersFromAdditionalChars`** maps `charid`→`char_id` and defaults
  `offset.x/y` to `0`, producing the non-optional `GPMember.offset` shape.

## Pair order (wire-aware)

Pair order is wire-aware, mirroring AsyncAO:

- **Classic pair (not in a group)** — "To front" / "To behind" set a local
  `pairOrder` (0/1) sent as the MS `paired_order` field. aolib packs it as the
  `^0`/`^1` suffix on FantaCode and keeps it as a separate `paired_order` field
  on JSON, so the SAME toggle works on both wires with no manual detection.
  `onICEnter` parses `#pair_select` with `parsePairedCharID`, so character slot
  `0` is a valid partner (the old `Number(value) || -1` turned it into "no
  pair" and prevented the order suffix from being sent). The server must relay
  the suffix unchanged: Nyathena's force-pair injection rewrites the partner ID
  and used to strip `^1`, which is why the order only worked after the unusual
  pair/unpair sequence that left the client not force-paired.
- **Group (JSON)** — the same buttons send `/pairorder <uid> front|back`, and
  the group list (`#group_order_list`) reorders any member via
  `/pairorder <uid> up|down`. The next MS's `additional_chars` carries the new
  order, and `renderGroupPeers` honors the speaker's own position in it.

`src/dom/pairOrder.ts` owns the state (`getPairOrder`); `onICEnter.ts` sends
`paired_order` on every IC message. The controls live in `public/client.html`,
gated behind `cccc_ic_support`, with tooltips explaining the wire nuance. This
requires `aolib-ts` **2.6.1** (published) for the `paired_order` field.
