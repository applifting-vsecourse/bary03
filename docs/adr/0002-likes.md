# 0002. Likes are rows in their own table; counts are computed, never stored

## Status

Accepted, 2026-11-25. Comes from the likes cases (`cases.md`).

## Context

The product owner wants a like button and a like count on every quack. Everyone can like a quack only once and take the like back. `cases.md` pins down what that means:

- **Once per user, and idempotent.** Liking twice, or taking back a like never given, succeeds and changes nothing. One user's unlike never removes another user's like, and an admin gets no special power over likes.
- **Replies are quacks.** They are liked the same way, and a reply's likes are its own.
- **"Liked by me" survives a reload.** The feed and replies must return, per quack, the count and whether the viewer liked it.
- **Placeholders keep no likes** (see [0001](0001-wipe-deleted-quacks-with-replies.md)). A wiped quack shows no count, and liking or unliking it returns 404, the same as voting on its poll.

The app already has a pattern for "one per person per quack": `PollVote`, whose primary key `(quackId, userId)` is the one-vote guarantee. Poll vote counts and reply counts are computed with `_count` in the same query as the feed, and no count is stored anywhere.

## Decision

Likes are stored as one row per person per quack in a new table, and every count is computed from those rows when read.

- **The table.** `QuackLike` (`quack_like`) has `quackId`, `userId` and `createdAt`.
- **The key.** The primary key is `(quackId, userId)`. The database, not the service, guarantees one like per user per quack, as it does for `PollVote`.
- **Cascades.** `quackId` cascades on delete of the quack, and `userId` cascades on delete of the user. Hard-deleting a quack removes its likes, and deleting an account removes that person's likes.
- **An index on `userId`**, as on `poll_vote`, so cascades from `user` don't scan the table.
- **Like** inserts the row only if it is missing. **Unlike** deletes where `(quackId, userId)` matches. Both succeed whether or not a row changed, which makes them idempotent without a read-then-write race.
- **Both are scoped to the signed-in user's id from the session.** No request names another user, which is how admins have no power over other people's likes.
- **Counts and "liked by me" are read in the same statement as the quack.** This uses `_count` on the likes relation plus the viewer's own like, as the poll counts do, so a count and "liked by me" can't disagree when someone likes in between.
- **Placeholders.**
  - The wipe from 0001 deletes the quack's likes in its transaction, as it already deletes poll votes.
  - Like and unlike lock the quack row (`FOR SHARE`, as posting a reply does) and return 404 when the quack doesn't exist or is a placeholder (`userId IS NULL`). A like can't land on a quack while it is being wiped.
  - A placeholder is returned with no count and no "liked by me".

## Options considered

- **A `QuackLike` table, with counts computed when read.** Chosen.
  - The key enforces "once per user", and the count can never drift from the rows.
  - "Liked by me" comes from the same rows.
  - It matches `PollVote` and the reply count.
  - Costs: counting per quack on every feed page, an explicit delete of likes in the wipe, and a row lock when liking.
- **The same table plus a stored `likeCount` on `quack`.** Rejected.
  - There would be two sources of truth. The counter must move only when a row was really inserted or deleted, or the idempotent cases break.
  - Deleting an account cascades likes away without touching the counter, unless a trigger handles it.
  - Every like would take a write lock on the quack row, serializing everyone liking a popular quack.
  - It would be the first stored count in the app. It can still be added later from the existing rows if reads become too slow.
- **A counter only on `quack`.** Rejected. It doesn't know who liked, so it can't enforce "once per user", can't let you take back your like, and can't show "liked by me" after a reload.
- **A `likedBy` array of user ids on `quack`.** Rejected.
  - There is no foreign key, so a deleted user's id stays and keeps counting.
  - Uniqueness is left to the code.
  - Every like rewrites the quack row.
  - Querying "liked by me" across a feed is awkward.

## Consequences

- **Every quack read carries a count and "liked by me".**
  - The feed, the replies list and anything built later that returns quacks must include the likes `_count` and the viewer's like in the same query.
  - Both must go through the domain type, the response DTO and the frontend zod schema.
  - A placeholder carries neither. Readers must treat them as absent on placeholders, as they already treat `text` and `user`.
- **The wipe in 0001 gains one more step.** `QuackRepository`'s wipe deletes the quack's likes in the same transaction as its poll answers and votes. Anything else that turns a quack into a placeholder must do the same, because the cascade doesn't fire when the row stays.
- **Liking is not a single statement.** It locks the quack, checks that it exists and isn't a placeholder, then inserts if missing. Unlike follows the same check. Any future bulk like or import must follow the same rules.
- **Deleting an account removes that person's likes, and the counts drop with them.** This needs no extra code, because the counts are computed. (Account deletion is still blocked by 0001 while the person has quacks with replies.)
- **Feed cost grows with likes.** Each page counts likes per quack using the primary key's `quackId` prefix. If that becomes too slow, adding a stored counter (the rejected option) is additive: add the column, fill it from the rows, and keep it in step in the like transaction.
- **Hard to undo: the one-per-user key.** If the product ever wants reactions of several kinds per person, the key has to become `(quackId, userId, kind)`. Existing rows can be migrated, but every like query and the idempotency rules change with it.
