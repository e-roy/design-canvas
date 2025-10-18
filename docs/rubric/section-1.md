## Section 1: Core Collaborative Infrastructure (30 points)

### Real-Time Synchronization (12 points)

**Excellent (11-12 points)**

- Sub-100ms object sync
- Sub-50ms cursor sync
- Zero visible lag during rapid multi-user edits

**Good (9-10 points)**

- Consistent sync under 150ms
- Occasional minor delays with heavy load
- Satisfactory (6-8 points)
- Sync works but noticeable delays (200-300ms)
- Some lag during rapid edits

**Poor (0-5 points)**

- Inconsistent sync
- Frequent delays over 300ms
- Broken under concurrent edits

### Conflict Resolution & State Management (9 points)

**Excellent (8-9 points)**

- Two users edit same object simultaneously → both see consistent final state
- Documented strategy (last-write-wins, CRDT, OT, etc.)
- No "ghost" objects or duplicates
- Rapid edits (10+ changes/sec) don't corrupt state
- Clear visual feedback on who last edited

**Good (6-7 points)**

- Simultaneous edits resolve correctly 90%+ of time
- Strategy documented
- Minor visual artifacts (brief flicker) but state stays consistent
- Occasional ghost objects that self-correct

**Satisfactory (4-5 points)**

- Simultaneous edits sometimes create duplicates
- Strategy unclear or undocumented
- State inconsistencies require refresh
- No indication of edit conflicts

**Poor (0-3 points)**

- Simultaneous edits frequently corrupt state
- Objects duplicate or disappear
- Different users see different canvas states
- Requires manual intervention to fix

**Testing Scenarios for Conflict Resolution:**

1. Simultaneous Move: User A and User B both drag the same rectangle at the same time
2. Rapid Edit Storm: User A resizes object while User B changes its color while User C moves it
3. Delete vs Edit: User A deletes an object while User B is actively editing it
4. Create Collision: Two users create objects at nearly identical timestamps

### Persistence & Reconnection (9 points)

**Excellent (8-9 points)**

- User refreshes mid-edit → returns to exact state
- All users disconnect → canvas persists fully
- Network drop (30s+) → auto-reconnects with complete state
- Operations during disconnect queue and sync on reconnect
- Clear UI indicator for connection status

**Good (6-7 points)**

- Refresh preserves 95%+ of state
- Reconnection works but may lose last 1-2 operations
- Connection status shown
- Minor data loss on network issues

**Satisfactory (4-5 points)**

- Refresh loses recent changes (last 10-30 seconds)
- Reconnection requires manual refresh
- Inconsistent persistence
- No clear connection indicators

**Poor (0-3 points)**

- Refresh loses significant work
- Reconnection fails or requires new session
- Canvas resets when last user leaves
- Frequent data loss

**Testing Scenarios for Persistence:**

1. Mid-Operation Refresh: User drags object, refreshes browser mid-drag → object position preserved
2. Total Disconnect: All users close browsers, wait 2 minutes, return → full canvas state intact
3. Network Simulation: Throttle network to 0 for 30 seconds, restore → canvas syncs without data loss
4. Rapid Disconnect: User makes 5 rapid edits, immediately closes tab → edits persist for other users
