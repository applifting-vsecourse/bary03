# Replies: answer a quack and see the answers under it

As someone reading the feed,
I want to reply to a quack and see the replies under it,
so that everyone can tell what a reply is answering.

## Context

Today people discuss by posting a new quack that starts with "@name …". It lands in the feed on its own, and nobody can tell which quack it answers.

The product owner set two rules that pull against each other:

- **Replies belong to the people who wrote them.** If an author deletes a quack that already has replies, the replies stay.
- **Deleted means gone.** When someone deletes their quack, its content really disappears from the app. Hiding it is not enough.

Both hold because a deleted quack that has replies is **wiped, not removed**. Its text, mood, poll and author are erased from the database. An empty row stays only so the replies have something to hang under, and the feed shows it as "This quack was deleted". When its last reply is deleted, that empty row is deleted too.

This is a deliberately minimal first version: one level of replies, text only.

## Acceptance criteria

The examples use the standard seed data (local), plus two seeded replies under Deep Duck Thoughts' "If a pond reflects the sky…" quack: one by Caffeinated Duck ("ok but who reflects the pond"), then one by The Bread Critic ("The sky has never once fed me."). On production there is no seed data, so the same criteria are checked with my own quacks and replies from a second account.

### Seeing replies
1. Every quack in the feed has a replies control under its text. It reads "Reply" when the quack has no replies, "1 reply" for one, and "2 replies" and so on for more. This applies in All, in Mine and in search results.
2. The replies are hidden until I open them. Opening "2 replies" on the pond-sky quack shows Caffeinated Duck's reply, then The Bread Critic's, oldest first, under the quack. Opening it again hides them.
3. Each reply shows its author's name, @username, the time and the text, laid out like a quack but visibly nested under its parent (see `DESIGN.md`). A reply has no mood, no poll and no replies control of its own.
4. A reply never appears as a feed item of its own: not in All, not in Mine, not in search. Searching `who reflects` finds nothing.

### Writing a reply
5. Opening the replies on a quack shows a reply box under the replies, with a visible label ("Your reply"), a hint ("Up to 280 characters.") and a "Post reply" button (not "Reply", which is already the name of the control that opens the box). It's there even when the quack has no replies yet.
6. After I post, my reply appears at the bottom of the list. The count goes up by one, the box empties, and the feed doesn't jump or reorder.
7. A reply is text only: 1–280 characters. My default mood from settings does not apply to replies.
8. An empty reply, or one that is only spaces, shows "Reply can't be empty — write something first." in place of the hint, and nothing is sent.
9. A reply that's too long shows "Reply is too long — use at most 280 characters (you have 312)." with the real count, in place of the hint.
10. If posting fails, my text stays in the box and the error says what went wrong.
11. There is no reply box under a reply. Replies go one level deep.

### Deleting a reply
12. I can delete my own replies, and a moderator (the `admin` role) can delete anyone's, with the same confirmation as for quacks: "Delete this reply?", or "Delete Caffeinated Duck's reply? You're deleting it as a moderator."
13. A deleted reply is gone from the database and from the list, and the count goes down by one.

### Deleting a quack that has replies
14. Deleting a quack with no replies works exactly as it does today.
15. Deleting a quack that has replies says what will happen: "Delete this quack? Its 2 replies will stay, under "This quack was deleted"." A moderator sees the moderator wording from the moderation story, followed by the same sentence about the replies.
16. After I confirm, the quack stays in its place in the feed as "This quack was deleted". It has no avatar, name, @username, time, mood, poll or Delete action. Its replies control still shows the count, and the replies still open, unchanged and still deletable by their authors and by moderators.
17. A deleted quack has no reply box. Calling the API to reply to one gets 409 "This quack was deleted, so it can't get new replies."
18. The deleted quack's text, mood, poll answers, votes and author are erased from the database, not just hidden. The author's Mine tab no longer lists it, and searching its old text, its author's name or its author's username doesn't find it.
19. When the last reply under a deleted quack is deleted, the "This quack was deleted" item disappears from the feed and its row is deleted.

### Enforced on the server
20. The author of a reply is taken from the session, never from the request body. The quack being replied to is taken from the URL.
21. The server applies the same text rules as the form, with the same wording (a shared `reply-rules.ts` / `replyRules.ts`, following the pattern of the settings rules). A body with anything other than `text`, such as `mood` or `poll`, gets 400.
22. Replying to a quack that doesn't exist gets 404. Replying to a reply gets 400: "You can't reply to a reply — reply to the quack instead."
23. Who may delete a reply follows the existing quack rule: its author or a moderator (403 otherwise, 404 if it doesn't exist). A deleted quack gets 404 on delete. It goes away by itself (criterion 19).
24. Signed-out visitors get 401 on every replies endpoint.
25. Two things happening at once can't break the rules:
    - A reply posted while its quack is being deleted either lands before the wipe, so the quack becomes a placeholder, or gets 409. It never ends up under a quack that was hard-deleted.
    - Two last replies deleted at the same moment still remove the placeholder.
26. Swagger (`/api/docs`) lists `GET /api/quacks/{quackId}/replies` and `POST /api/quacks/{quackId}/replies`, and "Try it out" reaches them, returning 200, 201, 401 or 404 as described, not `/api/api/...`.

## Out of scope
- Replying to a reply, nested threads, or "replying to @name" inside a thread
- Mood or polls in replies
- Replies in Mine or in search results
- Notifications ("someone replied to your quack")
- Editing a reply
- A page of its own for a quack and its replies, or a link to one
- Pagination of replies
- Deleting a user account. The database refuses to delete a user whose quacks have replies (see Decisions). Account deletion has to reuse the wipe when it's built.

## Where it lands in the code

All of it extends the existing quack feature. There is no new module.

- **Backend, `modules/quack`**
  - `QuacksController`: `GET` and `POST /quacks/:quackId/replies`.
  - `CreateReplyDto`: text only.
  - `domain/reply-rules.ts`: the text rules and their wording.
  - `QuacksService`: `getReplies`, `createReply`. `deleteQuack` decides between hard delete, wipe and placeholder clean-up.
  - `QuackRepository`:
    - `parentId: null` on the feed query, with a reply count.
    - `getReplies`.
    - Reply creation that locks the parent row (`FOR SHARE`) and checks that it isn't deleted and isn't a reply.
    - Delete in one transaction that locks the parent (`FOR UPDATE`).
  - The response DTO gains `replyCount` and `deleted`, and `user`/`text` become nullable.
  - Seed: the two replies above.
- **Frontend, `features/quack`**
  - `quackSchemas.ts`: `replyCount`, `deleted`, nullable `user`/`text`, and a reply schema.
  - `repliesQueryOptions` and a key in `quackKeys`.
  - `useAddReply`. It's not optimistic; it invalidates the replies and the feed. If it's ever made optimistic, it must use `networkMode: "always"`.
  - `useDeleteQuack` also invalidates the parent's replies.
  - New `QuackReplies` and `QuackReplyForm` components, plus `replyRules.ts`.
  - `QuackItem` renders the replies control and the placeholder.
  - `QuackDeleteButton` gets the reply and "replies will stay" wording.
  - Controls come from `src/components/ui/` (shadcn). Tests go next to the components, never in `src/routes/`.

## Decisions

1. **A reply is a `Quack` with a `parentId`**, not a separate `Reply` table.
   - Rejected: a separate `Reply` model. It would keep the feed queries untouched, but search, the moderator delete and validation would have to be built twice, and turning replies into quacks later means moving data.
   - Rejected: a reply that quotes its parent's text. That's a second copy of content that must be erasable.
2. **One level of replies.** A reply can't be replied to.
   - Rejected: nested threads of any depth. They need recursive queries or a stored `rootId`, and they break at phone width.
   - Rejected: a flat list with "replying to". It needs two links per reply.
   - One level is also the cheapest to extend: allowing nesting later only relaxes a server check.
3. **A deleted quack that has replies is wiped and kept as a placeholder. A deleted quack without replies is hard-deleted.**
   - Rejected: always hard-delete with `onDelete: SetNull`. The orphaned replies would land in the feed as top-level quacks with no context.
   - Rejected: soft delete. The text would stay in the database, breaking "really disappear".
4. **A placeholder keeps nothing about its author.** `userId` is set to null, and the UI shows no name and no time.
   - Rejected: keeping `userId` but hiding it. The database would still record who posted there and when, which is invisible to anyone checking the UI.
   - Rejected: "@name deleted this quack". It suggests the author did it, even when a moderator did, and keeps the name of someone who wanted their post gone on screen.
5. **Replies are collapsed and load on demand.** The feed carries only a count.
   - Rejected: always showing every reply. The feed would grow with every reply, with no pagination.
   - Rejected: a separate page per quack. Readers would have to leave the feed, the opposite of "see the replies under it".
6. **Replies are text only.**
   - Rejected: text plus mood. It makes the inline form heavier, and the column exists, so mood can be added later without a migration.
   - Rejected: polls in replies. Votes hanging off a reply under a quack that may be wiped is a lot of edge cases for little value.
7. **No new replies under a deleted quack.**
   - Rejected: letting replies continue. A placeholder could then grow forever around content nobody can see.
8. **Mine and search list top-level quacks only.**
   - Rejected: replies as feed items with "Replying to @name". It's a second kind of feed item, plus a join to the parent.
   - Rejected: search matching reply text but showing the parent. Surprising, and the most complicated query.
   - Adding either later is purely additive.
9. **`parentId` is `onDelete: Restrict`.** Even code that bypasses the service can't silently destroy other people's replies.
   - Rejected: `Cascade`. Exactly the outcome the product owner forbade.
   - Rejected: `SetNull`. Orphans in the feed.
   - The known cost: deleting a user row whose quacks have replies fails until account deletion is built with the wipe.
10. **Everything stays in the quack module (backend and frontend).** Replies are under `/api/quacks/:quackId/replies`.
    - Rejected: a separate `reply` module. Deleting a quack has to know about its replies, so two modules would own one table.
11. **There's no `deletedAt` or `deleted` column. A placeholder is exactly a row with no author (`userId IS NULL`).**
    - Rejected: a `deletedAt` column. It would be a second copy of the same fact that could disagree with the row. It would also be a record of when something was deleted, which the moderation story rules out.
    - A CHECK constraint keeps the shape honest instead: no author ⇔ no text.

## Proposed schema

Changes to `Quack` only. Everything else stays as it is.

```prisma
model Quack {
  id        String     @id @default(cuid())
  // null only on a deleted quack kept for its replies (a placeholder)
  text      String?    @db.Text
  mood      QuackMood?
  // null only on a placeholder: a deleted quack keeps nothing about its author
  user      User?      @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String?
  createdAt DateTime   @default(now())
  updatedAt DateTime   @default(now()) @updatedAt

  // A reply is a quack with a parent; replies go one level deep. Restrict:
  // a quack with replies is wiped, never deleted, so replies can't vanish
  // with it, even if something bypasses the service.
  parent    Quack?     @relation("QuackReplies", fields: [parentId], references: [id], onDelete: Restrict)
  parentId  String?
  replies   Quack[]    @relation("QuackReplies")

  // A quack is a poll exactly when it has answers.
  pollOptions PollOption[]
  pollVotes   PollVote[]

  @@index([userId])
  // the feed (parentId null, newest first) and a quack's replies (oldest first)
  @@index([parentId, createdAt])
  @@map("quack")
}
```

Prisma can't express the remaining rules, so the migration adds them by hand. Generate it with `--create-only`, then append:

```sql
-- A placeholder has neither author nor text; a live quack has both.
ALTER TABLE "quack" ADD CONSTRAINT "quack_placeholder_shape"
  CHECK (("userId" IS NULL) = ("text" IS NULL));
-- A placeholder has no mood; a reply never has one.
ALTER TABLE "quack" ADD CONSTRAINT "quack_mood_only_on_live_top_level"
  CHECK ("mood" IS NULL OR ("userId" IS NOT NULL AND "parentId" IS NULL));
-- Replies are never placeholders: they have no replies to keep.
ALTER TABLE "quack" ADD CONSTRAINT "quack_reply_has_author"
  CHECK ("parentId" IS NULL OR "userId" IS NOT NULL);
```

The service enforces "a reply's parent is not a reply" and "a reply has no poll". Both need another row, which a CHECK can't see. A parent's `parentId` never changes, so a check when the reply is created is enough.

### Queries for everything the user sees

| What | Query |
|---|---|
| Feed (All / Mine / search) | `quack.findMany({ where: { parentId: null, userId?, OR? }, include: { user, poll…, _count: { select: { replies: true } } }, orderBy: { createdAt: 'desc' } })`. Placeholders come back with `user: null`. They never match Mine or search, because they have no author and no text. |
| A quack's replies | `quack.findMany({ where: { parentId }, include: { user: true }, orderBy: { createdAt: 'asc' } })` |
| Post a reply | In one transaction: `SELECT "parentId", "userId" FROM quack WHERE id = $1 FOR SHARE`. Then 404, 400 or 409 as needed, then `quack.create({ data: { text, userId, parentId } })`. |
| Delete a quack | In one transaction: lock the row `FOR UPDATE` and count its replies. If there are none, `delete` (poll goes by cascade). Otherwise wipe it: `pollOption.deleteMany` (votes cascade), then `update { text: null, mood: null, userId: null }`. |
| Delete a reply | In one transaction: lock the parent `FOR UPDATE`, delete the reply, then `deleteMany({ where: { id: parentId, userId: null, replies: { none: {} } } })` to remove a placeholder left empty. |

### Is anything stored twice?

No.
- The reply count is computed with `_count` on every read, the same way poll vote counts are.
- "Deleted" isn't a column. It is `userId IS NULL`, and a CHECK ties it to `text IS NULL`, so the two can't disagree.
- A reply doesn't copy its parent's text or author.

### What happens to related rows when a quack is deleted?

- **No replies:** the row is deleted. Its `poll_option` and `poll_vote` rows go by the existing cascades, as today.
- **With replies:** the row stays as a placeholder. Its `poll_option` rows are deleted explicitly, `poll_vote` goes by cascade, and `text`, `mood` and `userId` are set to null. The replies are not touched.
- **A reply:** the row is deleted. If that leaves its placeholder parent with no replies, the parent is deleted in the same transaction.
- **A hard delete that bypasses the service:** if the quack has replies, the `Restrict` foreign key makes the statement fail.
- **Deleting a user:** it cascades to their live quacks and replies. It fails if any of their quacks has replies (out of scope, see above).

### Will the migration run on a production database with data?

Yes. It only adds things:
- a nullable `parentId` column, with no default and no backfill;
- `DROP NOT NULL` on `text` and `userId`;
- a foreign key and an index;
- three CHECK constraints.

Every existing row has `text` and `userId` set and `parentId` null, so all three CHECKs hold, and adding the constraints and the foreign key validates them immediately. On a table this size, the locks this takes are brief.

Rolling back is the only harder direction. Restoring `NOT NULL` fails once placeholders exist, so a down-migration would first have to delete placeholders and their replies.
