# Moderation: a moderator can delete any quack

As a moderator,
I want to delete any quack, not only my own,
so that a nasty post is gone even when its author won't delete it.

## Context

Someone started posting nasty quacks. Their author won't delete them, and today nobody else can: only a quack's author can delete it. This is a deliberately minimal first version: a moderator can delete anything, and nothing more.

The moderator is the existing `admin` role. No new role is introduced.

## Acceptance criteria

The examples use the standard seed data (local). The seed's moderator is **Admin (Delete in Prod)** (`admin@example.com` / `adminpassword`, role `admin`). **Pond Admin** is an ordinary user despite the name and is not a moderator. On production there is no seed data, so the same criteria are checked with an account that has the `admin` role and quacks posted by other accounts.

### Deleting as a moderator
1. Signed in as the moderator, every quack in the feed has the Delete action, whoever wrote it: in All, in Mine, and in search results.
2. Deleting someone else's quack asks for confirmation first. The dialog names the author and says I'm acting as a moderator. Example: "Delete Deep Duck Thoughts' quack? You're deleting it as a moderator."
3. Cancelling the dialog deletes nothing.
4. After I confirm, the quack disappears from the feed, the same as when an author deletes their own quack. A poll goes with its answers and votes.
5. If the delete fails, the dialog stays open and says what went wrong, the same as for an author.
6. The moderator's own quacks are deleted exactly as today: the usual "Delete this quack?" dialog, without the moderator wording.

### Everyone else
7. Nothing changes for people who aren't moderators. They see the Delete action only on their own quacks and get the usual dialog.
8. After a moderator deletes a quack, it is gone for everyone, its author included. The author gets no notice, and the feed shows no placeholder where the quack was.

### Enforced on the server
9. The server decides who may delete a quack: the author, or a user with the `admin` role. Both the user and their role come from the session, never from the URL or the request body.
10. The check lives in the quack service, alongside the existing author check.
11. Calling the API directly (e.g. through Swagger), a non-moderator deleting someone else's quack still gets 403 and nothing is deleted. The moderator gets 204 and the quack is deleted. A quack that doesn't exist gets 404 for everyone.
12. Signed-out visitors get 401, as today.

### No record
13. A moderator's delete leaves no record and no extra log entry. Deleted is deleted, the same as an author delete.

## Out of scope
- Telling the author their quack was removed, or showing "Removed by a moderator" in its place
- A record or log of who deleted what, or a way to undo a deletion
- Making someone a moderator from the app (the role is set as it is today, outside the app)
- Any other moderator powers: editing quacks, blocking or banning users, deleting accounts
- Users reporting or flagging quacks
- A separate moderation page or queue
- A moderator role separate from `admin`
