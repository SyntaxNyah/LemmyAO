# Teleport (`TP`) — LemmyAO Client Notes

> Client: **LemmyAO** (TypeScript / Bun / aolib-ts 2.6.1)
> Server: **Nyathena** · Sibling client: **AsyncAO**
> Status: **groundwork landed** on branch `timeleap` (branch name predates the
> rename). POC: save/restore.
> §9 specifies **D-Mail (`DM`)**, a sibling extension that is **designed but not
> implemented**.

**Companion documents**

| Repo | Document |
|---|---|
| LemmyAO (this repo) | `docs/TELEPORT.md` |
| Nyathena (server, protocol authority) | <https://github.com/SyntaxNyah/Nyathena/blob/timeleap/docs/TELEPORT.md> |
| AsyncAO (Go client) | <https://github.com/SyntaxNyah/AsyncAO/blob/timeleap/docs/TELEPORT.md> |
| Background | `docs/GROUP_PAIRING.md` |

The Nyathena document is normative (wire schema, field semantics, modes,
handshake). This file covers the browser implementation and what is still open.

---

## Why this exists

A Teleport snapshot rewinds a room: the chat log, who was standing where, the
background, the music. Players use it for flashbacks ("this is what actually
happened that night"), to recover a scene that got wiped, or to branch a scene at
a decision point.

On this client you will see the room re-stage itself — background and music first,
then the transcript replaying in order, then the cast and the divergence meter. In
`authoritative` mode the whole room has moved; in `overlay` mode only
Teleport-capable clients are looking at the older moment.

This file is the client plan. The wire format, gating and command design are
normative in the Nyathena document linked above.

---

## 0. TP in one paragraph

`TP` is a JSON-only custom packet the server sends on demand. It carries a full
room snapshot; the client replaces its TP state wholesale and re-stages the room
from it. It is **second-class**: it goes through aolib-ts's `registerPacket` /
`sendCustom` / `onCustom` surface, is never added to `spec/`, and has no
conformance vector. Nothing here required a binding version bump — the custom
registry predates the 2.6.1 pin in `package.json`.

---

## 1. Status

Branch `teleport` (base `c84fb279`):

| Commit | What |
|---|---|
| `f5d55a1a` | `fix(fl): advertise grouppair in JSON mode too` |
| `c78898e3` | `feat(tp): render Teleport snapshots` |

`tsc --noEmit` is clean. **`bun test` has not been run** — `bun` is not installed
on the machine where this landed; see P0-1.

---

## 2. Module layout

Deliberately flat, mirroring `src/groupPair.ts`:

| File | Role |
|---|---|
| `src/teleport.ts` | packet types, `registerPacket("TP")`, state + listeners, `applyTeleport` |
| `src/stateRestore.ts` | replays a snapshot into the existing renderers |
| `src/divergenceMeter.ts` | canvas meter + roll animation (no VN art bundled) |
| `src/registerProtocol.ts` | `registerTeleportCodec()`, `server.onCustom("TP", applyTeleport)` |
| `src/client/featureFlags.ts` | advertises `teleport` when the server offers it |
| `src/viewport/utils/playMusic.ts` | `playMusicChange(packet, silent)` — new optional flag |

> There is no `src/ui/` directory (the repo has a `src/ui.ts` file), so the TP
> modules sit at the root next to `groupPair.ts` rather than inventing a folder.

---

## 3. Receive path

```
WebSocket frame (JSON)
  -> client.server.receive
     -> decodeCustom("TP")           registered by registerTeleportCodec()
        -> server.onCustom("TP")     registerProtocol.ts
           -> applyTeleport(packet)  teleport.ts
              -> setTeleport(packet)          state + listeners
              -> import("./stateRestore")     lazy, avoids an import cycle
                 -> restoreTeleport(packet)   stateRestore.ts
```

`decodeCustom` runs for **every** inbound frame before spec dispatch, so TP must
be registered or `onCustom` never fires. That is why `registerTeleportCodec()` is
called from `registerProtocol()` alongside `registerGroupPairCodec()`.

`applyTeleport` ignores `op:"save"` (the private ack) and treats everything else
as a replace: TP is idempotent exactly like GP (GroupPair).

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
if (features.includes("teleport"))  sendRawFL("teleport");
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

Manual: two tabs against a Nyathena build with TP. Tab A `/tp save radio`; Tab B
speaks three lines; Tab A `/bg other`; Tab B `/tp wr-1`. Expect the background to
revert, the three lines to replay, and the meter to roll to `1.048596`.

In DevTools → Network → WS, confirm the advert is the text frame
`FL#teleport#%` — not a JSON object. A JSON advert is silently dropped by the
server's FL shim.

---

## 7. Known limitations (POC)

| Limitation | Impact |
|---|---|
| `bun test` never run | the TP modules have no automated test yet |
| Slots into GP's sprite container | a live GP roster and a TP cast compete for the same layers |
| Evidence/testimony ignored | snapshot carries them, nothing applies them |
| Meter art is code-drawn | no authentic nixie tubes without an operator-supplied sheet |
| No UI affordance | `/tp` must be typed in OOC |
| `overlay` looks the same as `authoritative` locally | the mode describes server behaviour only |
| Duplicate-text de-dupe | `handleChatMessage` skips a message whose text equals the current one, so two identical consecutive log lines replay as one |
| Replay is unbounded | 256 lines replay at once if the server's buffer is full |

---

## 8. Next steps (detailed)

### P0 — correctness

**P0-1 Add and run the TP tests.** `bun` was unavailable when this landed, so
nothing under `src/tests/` covers TP. Minimum set:
`registerPacket("TP")` does not throw; `decodeCustom` returns an object for a TP
frame; `applyTeleport` ignores `op:"save"`; `restoreTeleport` calls
background → music → log in that order (mock the three helpers); the advert is
sent only when the feature is advertised. Then wire `bun test` into CI.

**P0-2 Fix the duplicate-text de-dupe.** `handleChatMessage` returns early when
`packet.message === client.viewport.getChatmsg().content`. During a replay, two
identical consecutive lines collapse into one — a visible transcript error. Either
bypass the de-dupe for replays (a flag on the synthetic message, or a dedicated
`renderICLine` entry point) or accept it and document. Bypassing is correct: the
snapshot *is* history, so it cannot be a duplicate.

**P0-3 Resolve the GP container collision.** TP reuses `#client_group`. If a
group roster is active while a snapshot is restored, the two fight for the same
layers. Either render the TP cast into its own container (cleanest), or clear the
GP roster on restore and let the next `GP` frame rebuild it.

**P0-4 Apply evidence + testimony** (`applyEvidenceList`, `applyTestimonyState`),
or drop the fields from `TPArea` on both sides.

### P1 — the feature a player would recognise

**P1-1 A rewind affordance.** A button/menu entry that saves a snapshot and one
that lists/restores them, plus a visible "REWOUND" badge showing the label and
`divergence` with a "return to live" action. Right now the only clue that a client
is showing an old world is that the room looks wrong.

**P1-2 Meter integration.** `divergenceMeter.ts` exists but nothing mounts it.
Decide the host element (the viewport overlay is the natural place), size it from
the layout, and hook it to `onTeleportChange` so it also resets when the snapshot
clears. Handle HiDPI (`devicePixelRatio`) — the canvas currently renders at CSS
pixel size.

**P1-3 Replay pacing + skip.** Replace the tight loop with either a bounded
replay (last N lines) or a fast path that stages only the final message when the
user has "reduce motion"/"instant" preferences. There are already
`calculateGifLength`/animation helpers that suggest the codebase cares about this.

**P1-4 Asset hook.** Wire `MeterOpts.sheetUrl` to the asset origin
(`applyAssetOrigin`/`ASS`) so a server can serve meter art at
`<origin>/teleport/divergence.png`. **Do not bundle VN art**: the code licences
(New BSD for the HTML toy, MIT for TriggersTools) cover the code, not the
Nitroplus/MAGES pixels. The fallback in `divergenceMeter.ts` exists so the repo
stays clean.

### P2 — polish

* `docs/GROUP_PAIRING.md`: note that the advert guard changed and why (a future
  reader will otherwise copy the old `!jsonMode` line).
* Add TP to the README's protocol/extensions section with the Nyathena link.
* Consider a `src/tp/` folder if the three TP modules grow (currently flat on
  purpose, to match `groupPair.ts`).
---

## 9. D-Mail (`DM`) — client behaviour

> **Status: specification only.** Nothing in this repo handles `DM` today. The
> normative packet, gating and command design live in the Nyathena doc (§13); this
> is the LemmyAO plan.

### 9.1 What the client has to do

A `DM` frame is a **message plus a worldline shift**:

1. popup with sender, subject and body;
2. roll the meter from `divergence_from` to `divergence_to`;
3. if `reading_steiner`, show the prior worldline and a "you remember" badge;
4. otherwise a single déjà-vu line;
5. never restore state itself — a D-Mail that changes the past is followed by a
   separate `TP` frame, which the existing `stateRestore.ts` already handles.

The server guarantees `DM` before `TP`. `applyBackgroundChange` and
`handleChatMessage` do not touch the popup, so ordering is already safe — but any
future "clear overlays on restore" work must exempt it.

### 9.2 Files (proposed)

| File | Role |
|---|---|
| `src/dm.ts` | `DMPacket` type, `registerPacket("DM")`, `applyDMail` |
| `src/dmUi.ts` | the popup DOM + dismiss handling |
| `src/divergenceMeter.ts` | **reused as-is** — `animateDivergence(target, ms)` already rolls left-to-right at ~1400 ms |
| `src/registerProtocol.ts` | `registerDMailCodec()` + `server.onCustom("DM", applyDMail)` |
| `src/client/featureFlags.ts` | `if (features.includes("dmail")) sendRawFL("dmail")` |

`animateDivergence` animates *to* one target; a D-Mail needs *from → to*. Two
options, in order of preference:

* **extend it** with an optional `from` argument (smallest change, keeps one
  renderer): `animateDivergence(to, ms, from?)`;
* or call it twice with a short delay (roll to `from` instantly, then to `to`),
  which is a hack and will look like it.

The popup should mount above `#client_gamewindow` and use the same stacking
context trick the group renderer uses (`isolation: isolate`), so a `TP` restore
cannot paint over it.

### 9.3 Reading Steiner

`reading_steiner` is a hint, not a permission (Nyathena §13.7). Store the
"holder" preference client-side — the existing settings surface is the place —
and render:

* holder + `reading_steiner: true` → badge `1.048596 → 1.130205`, prior number
  struck through;
* otherwise → the roll and one flavour line, no prior number.

### 9.4 Tests to add (bun)

1. `registerPacket("DM")` does not throw; `decodeCustom` returns an object.
2. `applyDMail` calls `animateDivergence` with `divergence_to` and the popup
   fields; mock the meter.
3. `reading_steiner: false` omits the prior-number node.
4. A `TP` frame arriving after `DM` leaves the popup mounted.

These are the same shape as the TP tests in P0 of §8, and they should land
together so DM never ships untested the way TP nearly did.

### 9.5 Next steps for DM (after TP is signed off)

**P0** — `src/dm.ts` + registration + advert line; no UI. One test for the codec.

**P1** — `src/dmUi.ts` popup; extend `animateDivergence` with `from`; RS
preference + badge; the four tests above.

**P2** — queueing if two D-Mails land together (today the last wins); an inbox
view (deferred in the Nyathena doc, so do not build it first); and the
operator-supplied tube sheet, which is the same asset hook TP's meter needs
(`MeterOpts.sheetUrl` → `ASS` origin).

### 9.6 Licensing reminder

The meter's fallback exists so this repo never bundles Nitroplus/MAGES pixels.
That applies doubly to D-Mail: a popup is a tempting place to drop a screenshot
of the PhoneWave. Don't. Code-drawn art or operator-supplied assets only.


