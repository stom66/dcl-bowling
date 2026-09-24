# To-do

Central backlog for playtest findings, review notes, and future work.

## Backlog

- [ ] Style the customization catalog scrollbar when the SDK exposes it. Native
  `overflow: 'scroll'` bars cannot be colored or resized in the current SDK;
  catalog column `padding-right: 4` currently keeps the bar off the pane edge.

- [ ] Add spotlights that follow the player's ball during a roll. Drive each
  spotlight's shadow mask from that player's currently equipped items.
- [ ] Rename player-facing "customizations" terminology to "items" throughout the
  scene and UI.
- [ ] Add custom lane floors as unlockable items. Catalog/spawn/swap is stubbed:
  default lane models spawn at each lane root and swap to the roller's equipped
  lane on their turn. Bumpers are a separate `lane_bumpers` model with idle/up/down
  clips. Still need to strip baked lanes from the environment and add extra
  designs (colours, rainbow, stars, galaxies).
- [x] Add lane bumper support for each player's turn.
  - Check the existing physics flag and any existing bumper model or animation work.
  - [ ] Finish the bumper model and raising/lowering animations as needed.
  - [ ] Add a bumper control near the bottom of the turn UI, rather than in the top bar.
  - Save the setting as a player preference and apply it on their turns.
  - [ ] Research how bumper use should affect scoring, records, and score display. Decide
    whether bumper scores are invalidated or clearly marked.
- [x] Add a player-facing career stats / match-history UI that reads the synced
  `PlayerStats` component (games, wins, losses, perfect games, recent matches).
- [ ] Get rid of border raidus on laoding screen background, as the
- [x] Add a playtest debug panel on the right that lets any player add tickets
  and reset unlocks while `GameSettings.PLAYTEST_DEBUG_PANEL` is on.
- Add animations for SPLIT, TURKEY, BADGER, DOUBLE STRIKE, etc
- Add scoreboard highlight for SPLIT 8
