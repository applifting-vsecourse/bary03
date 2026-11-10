# 0001. A deleted quack that has replies is wiped, not removed

## Status

Accepted, 2026-11-10. Comes from the replies story (`story.md`, Decisions 3, 4, 9 and 11).

## Context

Replies are quacks with a `parentId` (one level deep). The product owner set two rules that pull against each other:

- **Replies belong to the people who wrote them.** Deleting a quack must not take other people's replies with it.
- **Deleted means gone.** When someone deletes their quack, its content really disappears from the app. Hiding it is not enough.

Until now, deleting a quack was always a hard delete: one `DELETE`, with poll answers and votes going by cascade. That applies to both the author's delete and the moderator's delete (`QuacksService.deleteQuack`, the moderation story). With replies, a hard delete either destroys the replies or leaves them with nothing to hang under.

## Decision

Deleting a quack that **has no replies** stays a hard delete, exactly as today.

Deleting a quack that **has replies** wipes it instead:

- Its poll answers and votes are deleted.
- `text`, `mood` and `userId` are set to null.
- The row stays, so its replies keep their parent. The UI shows it as "This quack was deleted", with no name and no time.
- When the last reply under a placeholder is deleted, the placeholder row is deleted in the same transaction.

The rules are enforced in the database, not only in the service:

- A placeholder is exactly a row with `userId IS NULL`. There is no `deletedAt` or `deleted` column. A CHECK constraint ties no author to no text, and further CHECKs forbid a mood on a placeholder and forbid a reply from being a placeholder.
- `parentId` references `quack` with `onDelete: Restrict`. Anything that hard-deletes a quack with replies fails, including code that bypasses the service.

## Options considered

- **Wipe the content and keep the row as a placeholder.** Chosen. The content is erased from the database, not hidden, and replies keep their context. Placeholders cost a nullable `text` and `userId`, which every reader of `quack` has to handle.
- **Always hard-delete, with `onDelete: SetNull` on `parentId`.** Rejected. The orphaned replies would become top-level quacks in the feed, where "Totally agree!" means nothing. Telling them apart would need an extra flag, and the link to what they answered would be lost for good.
- **Always hard-delete, with `onDelete: Cascade`.** Rejected. Other people's replies disappear with the quack, which is exactly what the product owner forbade.
- **Refuse to delete a quack that has replies (`Restrict` with no wipe).** Rejected. Authors could never remove their own content once someone has replied.
- **Soft delete (`deletedAt`, content kept but hidden).** Rejected. The text stays in the database, which breaks "really disappear". It also leaves a record of when something was deleted, which the moderation story rules out.
- **Keep `userId` on the placeholder but don't show it.** Rejected. The database would still record "this person posted here at this time", and nobody checking the UI could tell.
- **Show "@name deleted this quack".** Rejected. For a moderator's delete it would wrongly suggest the author did it, and it keeps the name of someone who wanted their post gone on screen.

## Consequences

- **The delete from week 5 changes for both author and moderator.**
  - `QuacksService.deleteQuack` and `QuackRepository.deleteQuack` no longer always delete. When the quack has replies, they wipe it.
  - The choice is made in one transaction that locks the row, so a reply arriving mid-delete can't be lost.
  - Who may delete is unchanged (author or `admin`), and a moderator's wipe is indistinguishable from an author's.
  - The confirmation dialog says the replies will stay.
- **Nothing may show a placeholder's former text or author: not the feed, not search, not replies, nor anything built later.**
  - The data is gone, so there is nothing to leak. But every reader must treat `user` and `text` as nullable, all the way through the domain type, the response DTO and the frontend zod schema.
  - Mine and search exclude placeholders naturally, since they have no author and no text to match. Any new query or feature must not assume that every quack has an author.
- **The schema is less strict than it looks in Prisma.** `text` and `userId` are optional in the generated types. The real shape rules live in hand-written CHECK constraints in the migration. Changing a quack's columns later means updating those constraints too.
- **Deleting a user account is blocked while any of their quacks has replies.**
  - `User → Quack` cascades, but `parentId` restricts, so the delete fails.
  - When account deletion is built, it has to reuse the wipe for those quacks rather than rely on the cascade. The same applies to any admin script that deletes users or quacks directly.
- **Deleting is no longer a single statement.**
  - Deleting a reply may also delete its now-empty placeholder.
  - Posting a reply locks its parent (`FOR SHARE`) so it can't slip under a quack being wiped.
  - Any future bulk delete has to follow the same rules.
- **It can't be undone for data already wiped.** Switching to soft delete or to cascades later can't bring back wiped content or authors. Restoring `NOT NULL` on `text` and `userId` requires first deleting every placeholder and its replies.
