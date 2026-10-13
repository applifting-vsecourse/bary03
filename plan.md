# Plan: polls

Implementation plan for [`story.md`](story.md) (criteria are referenced as #1–#29).

A poll is part of a quack: the quack's text is the question, and the quack gains answers and votes. Everything lives in the existing `quack` backend module and `features/quack` frontend feature. Polls are not a separate feature, because features can't import from each other and a poll is always shown inside a quack.

## Data model

Two new tables. The existing `quack` table doesn't change: a quack is a poll exactly when it has answers.

### `poll_option`: the answers

| Column      | Type        | Notes                                          |
| ----------- | ----------- | ---------------------------------------------- |
| `id`        | text, cuid  | primary key                                    |
| `quackId`   | text        | FK → `quack.id`, `ON DELETE CASCADE`           |
| `position`  | smallint    | 0–3, the order the author typed them in        |
| `text`      | varchar(50) | trimmed; Postgres counts characters, not bytes |
| `createdAt` | timestamp   |                                                |

Constraints:

- `UNIQUE (quackId, position)`: no two answers in the same slot.
- `UNIQUE (id, quackId)`: redundant as a key, since `id` is already unique. It exists so `poll_vote` can reference an answer _together with its poll_ (see below).

### `poll_vote`: one row per person per poll

| Column      | Type      | Notes                                                         |
| ----------- | --------- | ------------------------------------------------------------- |
| `quackId`   | text      | part of the primary key; FK → `quack.id`, `ON DELETE CASCADE` |
| `userId`    | text      | part of the primary key; FK → `user.id`, `ON DELETE CASCADE`  |
| `optionId`  | text      | the chosen answer                                             |
| `clientId`  | uuid      | which browser tab sent the vote (see "My last click wins")    |
| `clientSeq` | integer   | that tab's click counter (see "My last click wins")           |
| `createdAt` | timestamp | first vote                                                    |
| `updatedAt` | timestamp | last change                                                   |

Constraints:

- `PRIMARY KEY (quackId, userId)`: one vote per person per poll. Explained below.
- `FOREIGN KEY (optionId, quackId) → poll_option (id, quackId)`, `ON DELETE CASCADE`. A vote can only point at an answer that belongs to the same poll. Without the composite key, a vote for Ramen could be filed under some other poll and be counted there.
- `INDEX (optionId)`: for counting votes per answer.

### How it links

```
user ─┬─< quack ─┬─< poll_option ─┐
      │          │                │ (optionId, quackId)
      │          └─< poll_vote >──┘
      └──────────────< poll_vote
```

### Not enforced by the database (and why that's fine)

- **2–4 answers per poll.** Answers are created in the same transaction as the quack, and no endpoint adds or removes them later. The create endpoint is the only door, and it validates the count.
- **No duplicate answers, ignoring case (#5).** This would need an expression index (`lower(text)`), which Prisma can't describe in the schema; the next `migrate dev` would try to drop it as drift. A duplicate answer wouldn't break any count, so validating it in the app is enough.

## Guarantees

### One vote per person per poll (#17, #27)

The primary key of `poll_vote` is `(quackId, userId)`, so Postgres refuses a second row for the same person and poll. This holds no matter what the application code does.

Voting never does "read, then insert or update", which two tabs could interleave. It is a single atomic statement:

```sql
INSERT INTO poll_vote (...) VALUES (...)
ON CONFLICT (quackId, userId) DO UPDATE SET optionId = EXCLUDED.optionId, ...
```

Two simultaneous first votes from the same person (two tabs, #27) cannot both insert. One inserts and the other turns into an update of that same row, so the person ends up with exactly one vote. Votes from different people (#26) touch different rows and never block each other.

Changing your vote (#18) updates `optionId` on the same row, so there is never a moment with two votes or none.

### My last click wins (#21)

**The problem:** I click Pizza, then Ramen. Both requests are in flight. The network can deliver them in either order. If Pizza arrives second, a naive update would make Pizza my vote.

**The fix:** every vote carries `(clientId, clientSeq)`.

- `clientId` is a random UUID made once per page load (one per browser tab).
- `clientSeq` is a counter in that tab that goes up by one on every click (Pizza = 7, Ramen = 8).

The upsert above only overwrites an existing vote when the incoming one is newer:

```sql
... DO UPDATE SET optionId = EXCLUDED.optionId,
                  clientId = EXCLUDED.clientId,
                  clientSeq = EXCLUDED.clientSeq,
                  updatedAt = now()
WHERE poll_vote.clientId <> EXCLUDED.clientId
   OR poll_vote.clientSeq < EXCLUDED.clientSeq
```

| Arrival order     | What happens                                                                                        |
| ----------------- | --------------------------------------------------------------------------------------------------- |
| Pizza, then Ramen | Pizza is stored (seq 7); Ramen has a higher seq (8) and overwrites it. The vote is Ramen.           |
| Ramen, then Pizza | Ramen is stored (seq 8); Pizza (seq 7) fails the `WHERE`, the update is skipped. The vote is Ramen. |

Because the check is part of the same statement as the write, Postgres evaluates it under the row lock. No other request can slip in between the check and the write.

Why not a timestamp: device clocks disagree and can jump. A counter only ever has to be compared with numbers from the same tab, which never go backwards.

Why a different `clientId` always overwrites: a vote from another tab or device is treated as newer simply because it arrived later. Different tabs don't share a counter, so "later click" can't be compared across them, and the story only asks for one vote across tabs (#27), which the primary key already guarantees.

**On the client**, the matching rule: only the response to my latest click updates the screen. Responses to older clicks are ignored, even though they succeed. Otherwise a late "Pizza saved" response would briefly flip the screen back to Pizza.

### Counts can't drift from the votes (#11–#13, #24)

There are no stored counters. Counts are computed from `poll_vote` every time a poll is read:

```sql
SELECT optionId, count(*) FROM poll_vote WHERE quackId IN (...) GROUP BY optionId
```

- Each vote row points at exactly one answer, so the answer counts always add up to the number of voters, which is the total shown (#12).
- Changing a vote moves one row from one answer to another in one statement, so no reader can ever see a half-moved vote.
- With no counter, there's nothing to fall out of step with the votes after a lost update, a failed transaction or a manual fix in the database. Votes are the single source of truth.
- Cost: one grouped count over an indexed column per feed page, which is negligible at this size. Counters would be an optimisation for much later, and they'd need their own reconciliation.
- Counts, "my answer" and the total for a poll are read in one transaction, so they always describe the same moment.
- Percentages are rounded to whole numbers in the browser from the counts (#11).

## Endpoints

All of these require a signed-in user. The voter is always taken from the session, never from the request body (same rule as authoring quacks).

### `POST /api/quacks`: extended

New optional body field `poll: { answers: string[] }`.

- 2–4 answers. Each is trimmed, required and at most 50 characters, and no two are the same ignoring case (#4, #5, #7).
- The messages are the same as the form's, from shared rule functions (`poll-rules.ts` in the backend, `pollRules.ts` in the frontend), per the `CLAUDE.md` validation rule (#6).
- The quack and its answers are created in one transaction.
- Response: the quack, with `poll` included.

### `GET /api/quacks`: extended

Every quack in the response gets a `poll` field:

```
poll: null | {
  options: { id, text, votes }[]   // in the author's order
  totalVotes: number
  myOptionId: string | null        // the signed-in user's answer
}
```

Search (`q`) is unchanged and matches the question only, never the answers (#29).

### `PUT /api/quacks/:quackId/vote`: new

Body: `{ optionId, clientId, clientSeq }`.

- `PUT`, because it sets my vote to a value: sending the same request twice changes nothing.
- 200 → the poll in the same shape as above, read after the write. When the request was an older click and the write was skipped, it returns the current poll and the client ignores it.
- 404 → no such quack, or the quack has no poll.
- 400 → `optionId` isn't one of this poll's answers. The composite foreign key also guarantees this, but the API should answer clearly.
- 401 → not signed in.

There is no `DELETE`: a vote can't be taken back (#19).

## Frontend shape

- **`QuackPoll`** (in `features/quack/components/`): rendered by `QuackItem` under the text whenever `quack.poll` is set. That covers the feed and search results (#10).
  - Each answer is a `<button>` with its text, count, percent and a bar (#11).
  - My answer is marked with an icon and text, not colour alone, and has `aria-pressed` (#14, #16).
  - It shows the total or "No votes yet" (#12).
  - The vote-failed message appears under the poll (#22).
- **`useVote`**: does the optimistic update, the stale-response guard and the rollback.
  - **On click:** stop any feed refetch in flight, then update this poll in every cached feed list at once (normal feed and any search), moving my vote and adjusting the counts (#20).
  - **On the response to my latest click:** write the server's poll into those caches (#24).
  - **Once no vote is pending:** invalidate the feed, so other people's votes arrive as well (#25). Refetching earlier could overwrite the optimistic state.
  - **On failure of my latest click:** put back the last poll the server confirmed, show the message (#22), then invalidate.
- **Post form:** an "Add a poll" button reveals two labelled answer fields. You can add answers up to 4, remove them down to 2, or remove the whole poll (#1–#3). After posting, the form resets to no poll (#9). Mood and default mood work exactly as they do now (#8).

## Slices

Each slice ends with something to check in the browser and adds unit tests in the repo's usual style (see [Testing the guarantees](#testing-the-guarantees)). `pnpm check-all` must pass after each slice.

### 1. See a poll (read-only)

- **Build:**
  - The two tables, constraints and migration.
  - A lunch poll in the seed (#13 data): Pizza ← Deep Duck Thoughts and The Bread Critic; Ramen ← Migration Season; Salad bar ← no votes.
  - `GET /api/quacks` returns `poll`.
  - `QuackPoll` shows answers, counts, percents, bars and the total, with nothing clickable yet.
- **Browser:**
  - The seed poll shows Pizza 2 (67%), Ramen 1 (33%), Salad bar 0 (0%) and "3 votes".
  - Other posts look unchanged.
  - Search `lunch` finds the poll and `Ramen` doesn't (#10–#13, #15, #29).
- **Before checking:** reset the local database with `pnpm backend db:reset`, because the seed only runs on an empty database. This also deletes accounts and posts made by hand.

### 2. Vote and change my vote

- **Build:**
  - `PUT /api/quacks/:quackId/vote` with the upsert and the composite foreign key. The `clientSeq` guard comes in slice 3.
  - `myOptionId` in `GET`.
  - Answers become buttons. A click waits for the server and then refreshes the feed (nothing optimistic yet).
- **Browser:**
  - As Caffeinated Duck: pick Salad bar → 2/1/1, 4 votes. Pick Pizza → 3/1/0, still 4. Pick Pizza again → nothing changes.
  - Reload: the vote is kept.
  - As The Bread Critic: Pizza is marked.
  - Sign in as the same user in two tabs and vote in both. After a reload, the total grew by one, not two.
  - After each check, the counts add up to the total and match what another user sees after a reload (#16–#19, #23, #26–#28).

### 3. Instant voting

- **Build:**
  - `clientId`/`clientSeq` columns and the `WHERE` guard on the upsert.
  - `useVote`: optimistic update, ignoring stale responses, rollback with the message.
- **Browser:**
  - With DevTools → Network → Slow 3G, a click updates immediately.
  - Click Pizza then Ramen quickly → Ramen stays, also after reload.
  - Go offline and click → the poll returns to how it was and "Your vote wasn't saved. Try again." appears under that poll only (#20–#22, #24, #25).

### 4. Create a poll

- **Build:**
  - `poll` on `POST /api/quacks` with the shared rules and messages.
  - The poll part of the post form.
- **Browser:**
  - Add a poll, add and remove answers (2–4).
  - Leave one empty / type 57 characters / type a duplicate → see the specific message under that answer.
  - Remove the poll → it posts as a normal quack.
  - Post a poll → it appears on top and the form is empty again.
  - My default mood is preselected (#1–#9).

Slices 2 and 3 are split on purpose. Slice 2 proves the data rules with simple, waiting UI. Slice 3 adds only the optimistic layer and the ordering guard, so a bug in either is easy to place.

## Testing the guarantees

Decided: no database-backed tests, and no changes to `ci.yml`. Tests stay as the repo has them now: DTO validation, services with mocked repositories, and components with stubbed hooks.

Those tests cover the rules and the screen behaviour. They can't cover the three guarantees, because those are enforced by SQL that the mocked repositories never run. The guarantees are verified by hand in the browser instead, with the two-tab and quick-click checks in slices 2 and 3.

What these checks can and can't show: they confirm the everyday behaviour. They can't reliably produce the two cases the guarantees exist for: two votes reaching the database at the same instant, and a slow older request arriving after a newer one. Throttling makes requests overlap, but they usually still arrive in order. For those cases, the evidence is the design itself: the primary key and the `WHERE` condition on the upsert.
