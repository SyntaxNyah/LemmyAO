# TimeLeap (`TL`) — LemmyAO Client Notes

> Client: **LemmyAO** (TypeScript / Bun / aolib-ts 2.6.1)
> Server: **Nyathena** · Sibling client: **AsyncAO**
> Status: **groundwork landed** on branch `timeleap`. POC: save/restore.

**Companion documents**

| Repo | Document |
|---|---|
| LemmyAO (this repo) | `docs/TIMELEAP.md` |
| Nyathena (server, protocol authority) | <https://github.com/SyntaxNyah/Nyathena/blob/timeleap/docs/TIMELEAP.md> |
| AsyncAO (Go client) | <https://github.com/SyntaxNyah/AsyncAO/blob/timeleap/docs/TIMELEAP.md> |
| Background | `docs/GROUP_PAIRING.md` |

The Nyathena document is normative (wire schema, field semantics, modes,
handshake). This file covers the browser implementation and what is still open.

---

## 0. TL in one paragraph

`TL` is a JSON-only custom packet the server sends on demand. It carries a full
room snapshot; the client replaces its TL state wholesale and re-stages the room
from it. It is **second-class**: it goes through aolib-ts's `registerPacket` /
`sendCustom` / `onCustom` surface, is never added to `spec/`, and has no
conformance vector. Nothing here required a binding version bump — the custom
registry predates the 2.6.1 pin in `package.json`.

---

## 1. Status

Branch `timeleap` (base `c84fb279`):

| Commit | What |
|---|---|
| `f5d55a1a` | `fix(fl): advertise grouppair in JSON mode too` |
| `c78898e3` | `feat(tl): render TimeLeap snapshots` |

`tsc --noEmit` is clean. **`bun test` has not been run** — `bun` is not installed
on the machine where this landed; see P0-1.

---

## 2. Module layout

Deliberately flat, mirroring `src/groupPair.ts`:

| File | Role |
|---|---|
| `src/timeLeap.ts` | packet types, `registerPacket("TL")`, state + listeners, `applyTimeLeap` |
| `src/stateRestore.ts` | replays a snapshot into the existing renderers |
| `src/divergenceMeter.ts` | canvas meter + roll animation (no VN art bundled) |
| `src/registerProtocol.ts` | `registerTimeLeapCodec()`, `server.onCustom("TL", applyTimeLeap)` |
| `src/client/featureFlags.ts` | advertises `timeleap` when the server offers it |
| `src/viewport/utils/playMusic.ts` | `playMusicChange(packet, silent)` — new optional flag |

> There is no `src/ui/` directory (the repo has a `src/ui.ts` file), so the TL
> modules sit at the root next to `groupPair.ts` rather than inventing a folder.

---

## 3. Receive path

```
WebSocket frame (JSON)
  -> client.server.receive
     -> decodeCustom("TL")           registered by registerTimeLeapCodec()
        -> server.onCustom("TL")     registerProtocol.ts
           -> applyTimeLeap(packet)  timeLeap.ts
              -> setTimeLeap(packet)          state + listeners
              -> import("./stateRestore")     lazy, avoids an import cycle
                 -> restoreTimeLeap(packet)   stateRestore.ts
```

`decodeCustom` runs for **every** inbound frame before spec dispatch, so TL must
be registered or `onCustom` never fires. That is why `registerTimeLeapCodec()` is
called from `registerProtocol()` alongside `registerGroupPairCodec()`.

`applyTimeLeap` ignores `op:"save"` (the private ack) and treats everything else
as a replace: TL is idempotent exactly like GP.

---

## 4. Restore order (and why)

```ts
applyBackgroundChange({ $header: "BN", background, position: side })
playMusicChange({ $header: "MC", … }, /* silent */ true)
for (const line of log) handleChatMessage(toMS(line))
renderGroupPeers(cast, lastSpeaker.char_id, lastSpeaker.side)
animateDivergence(packet.divergence)
```

1. **Background first**, because `applyBackgroundChange` re-stages the viewport;
   anything drawn before it would be wiped.
2. **Music silently.** `playMusicChange` normally appends "changed music to …" to
   the IC log. A rewind must not forge history, so the new `silent` flag skips
   only that log line — URL/loop/`play()` behaviour is unchanged.
3. **Transcript through `handleChatMessage`**, so chatbox, blips, showname, side
   and text colour behave exactly as they do live. `toMS` fills fields the
   snapshot does not carry (offsets, effects, pairing) with inert defaults so a
   replay cannot shake, flash or re-pair the stage.
4. **Cast last**, through `renderGroupPeers`: the snapshot's cast is
   field-compatible with GP's roster, so the group sprite layer is reused instead
   of duplicated. The last log speaker is treated as the speaker (excluded from
   the peer layer, since `handleChatMessage` already staged them).
5. **Meter last**, so the roll lands on a settled scene.

A `setTimeout(0)` yield between log lines lets the sprite preloader settle; a
synchronous loop races the asset cache and drops later sprites.

---

## 5. The FL advert fix

The old code suppressed the client→server FL advert whenever the session was in
JSON mode:

```ts
if (socket && socket.readyState === WebSocket.OPEN && !jsonMode) socket.send("FL#grouppair#%");
```

That is backwards: JSON mode is exactly when the advert matters. Nyathena
auto-detects the wire format per frame, so a positional FL frame is accepted on a
JSON session. The guard is now the **advertised feature**, not the wire mode:

```ts
if (features.includes("grouppair")) sendRawFL("grouppair");
if (features.includes("timeleap"))  sendRawFL("timeleap");
```

Gating on the feature also stops us sending FantaCode frames to servers that
implement neither extension. `sendRawFL` is a tiny guarded helper:

```ts
function sendRawFL(feature: string): void {
  try {
    const socket = client.socket;
    if (socket && socket.readyState === WebSocket.OPEN) socket.send(`FL#${feature}#%`);
  } catch { /* the advert is optional */ }
}
```

The raw wire is required because aolib-ts models `FL` as server→client only: the
typed `send.FL` throws the role guard and `sendCustom` refuses spec headers.

---

## 6. Verifying a change

```powershell
node node_modules\typescript\bin\tsc --noEmit     # typecheck (used here)
bun test                                          # full suite (needs bun installed)
bun run lint
```

Manual: two tabs against a Nyathena build with TL. Tab A `/tl save radio`; Tab B
speaks three lines; Tab A `/bg other`; Tab B `/tl wr-1`. Expect the background to
revert, the three lines to replay, and the meter to roll to `1.048596`.

In DevTools → Network → WS, confirm the advert is the text frame
`FL#timeleap#%` — not a JSON object. A JSON advert is silently dropped by the
server's FL shim.

---

## 7. Known limitations (POC)

| Limitation | Impact |
|---|---|
| `bun test` never run | the TL modules have no automated test yet |
| Slots into GP's sprite container | a live GP roster and a TL cast compete for the same layers |
| Evidence/testimony ignored | snapshot carries them, nothing applies them |
| Meter art is code-drawn | no authentic nixie tubes without an operator-supplied sheet |
| No UI affordance | `/tl` must be typed in OOC |
| `overlay` looks the same as `authoritative` locally | the mode describes server behaviour only |
| Duplicate-text de-dupe | `handleChatMessage` skips a message whose text equals the current one, so two identical consecutive log lines replay as one |
| Replay is unbounded | 256 lines replay at once if the server's buffer is full |

---

## 8. Next steps (detailed)

### P0 — correctness

**P0-1 Add and run the TL tests.** `bun` was unavailable when this landed, so
nothing under `src/tests/` covers TL. Minimum set:
`registerPacket("TL")` does not throw; `decodeCustom` returns an object for a TL
frame; `applyTimeLeap` ignores `op:"save"`; `restoreTimeLeap` calls
background → music → log in that order (mock the three helpers); the advert is
sent only when the feature is advertised. Then wire `bun test` into CI.

**P0-2 Fix the duplicate-text de-dupe.** `handleChatMessage` returns early when
`packet.message === client.viewport.getChatmsg().content`. During a replay, two
identical consecutive lines collapse into one — a visible transcript error. Either
bypass the de-dupe for replays (a flag on the synthetic message, or a dedicated
`renderICLine` entry point) or accept it and document. Bypassing is correct: the
snapshot *is* history, so it cannot be a duplicate.

**P0-3 Resolve the GP container collision.** TL reuses `#client_group`. If a
group roster is active while a snapshot is restored, the two fight for the same
layers. Either render the TL cast into its own container (cleanest), or clear the
GP roster on restore and let the next `GP` frame rebuild it.

**P0-4 Apply evidence + testimony** (`applyEvidenceList`, `applyTestimonyState`),
or drop the fields from `TLArea` on both sides.

### P1 — the feature a player would recognise

**P1-1 A rewind affordance.** A button/menu entry that saves a snapshot and one
that lists/restores them, plus a visible "REWOUND" badge showing the label and
`divergence` with a "return to live" action. Right now the only clue that a client
is showing an old world is that the room looks wrong.

**P1-2 Meter integration.** `divergenceMeter.ts` exists but nothing mounts it.
Decide the host element (the viewport overlay is the natural place), size it from
the layout, and hook it to `onTimeLeapChange` so it also resets when the snapshot
clears. Handle HiDPI (`devicePixelRatio`) — the canvas currently renders at CSS
pixel size.

**P1-3 Replay pacing + skip.** Replace the tight loop with either a bounded
replay (last N lines) or a fast path that stages only the final message when the
user has "reduce motion"/"instant" preferences. There are already
`calculateGifLength`/animation helpers that suggest the codebase cares about this.

**P1-4 Asset hook.** Wire `MeterOpts.sheetUrl` to the asset origin
(`applyAssetOrigin`/`ASS`) so a server can serve meter art at
`<origin>/timeleap/divergence.png`. **Do not bundle VN art**: the code licences
(New BSD for the HTML toy, MIT for TriggersTools) cover the code, not the
Nitroplus/MAGES pixels. The fallback in `divergenceMeter.ts` exists so the repo
stays clean.

### P2 — polish

* `docs/GROUP_PAIRING.md`: note that the advert guard changed and why (a future
  reader will otherwise copy the old `!jsonMode` line).
* Add TL to the README's protocol/extensions section with the Nyathena link.
* Consider a `src/tl/` folder if the three TL modules grow (currently flat on
  purpose, to match `groupPair.ts`).
* Confirm `stateRestore`'s dynamic `import()` is still needed once the cycle with
  `handleICSpeaking` is broken; a static import is easier to trace.

