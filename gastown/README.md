# Gastown Pack

Gastown is the domain-specific coding workflow pack. It provides the city
coordinator roles, rig worker roles, patrol formulas, and the pack-local dog
pool used for stuck-agent shutdown warrants.

## Import

```toml
[imports.gastown]
source = "../packs/gastown"
```

Use the pack as the workspace pack for city-scoped agents and as a rig pack for
rig-scoped agents.

## Composition

Gas City composes the builtin core pack (mechanical housekeeping orders)
through the explicit `includes` entries that `gc init` writes into
city.toml; this pack composes alongside it via `[imports.gastown]`. The
retired maintenance pack no longer exists: gastown's `mol-shutdown-dance`
and dog prompt fragments (`propulsion-dog`, `architecture`,
`following-mol`) are the only copies in play, and cross-pack agent name
collisions are hard errors rather than fallback resolutions.

Verify the composed recipe after changing imports:

```bash
gc formula show mol-shutdown-dance
```

The recipe must read warrant metadata from the claimed bead via
`$GC_BEAD_ID` and must not declare a required `warrant_id` var.

## Mouse wheel

The pack keeps tmux copy-mode scrollback on the main screen, including over
mouse-reporting applications. Alternate-screen applications that request mouse
reports, including Pi fullscreen mode, receive wheel events instead. Applications
without mouse reporting use copy-mode scrollback even on the alternate screen.
Existing copy-mode handles its own wheel events and exits at the bottom.
A fullscreen application's transcript is not tmux's history buffer.

The bindings are server-wide. Validate changes on a separate socket before
applying the pack's session-live script to a shared server. Updating a running
server's bindings does not require restarting it or its applications.
The session-live writer reapplies this condition on subsequent session starts;
new and recreated sessions inherit the current root table, not a frozen copy.
Existing session-private tables are not changed by this script.

## Dog Pool

Gastown owns `mol-shutdown-dance` and the dog agent that runs stuck-agent
warrants, including the dog's `wake_mode` and `work_dir` settings. In import
composition gastown's dog expands as the distinct `gastown.dog` agent; the
dolt pack ships its own separate dog for Dolt maintenance formulas, and the
two coexist under their binding-qualified names.

Gastown deliberately does not ship retired dog formulas for JSONL export or
stale-session reaping. The Gas City builtin core pack provides JSONL export,
stale-session and stale-data cleanup, and Dolt housekeeping as deterministic
exec orders.
