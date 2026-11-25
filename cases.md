# Likes — test cases

Product request: "People want to show they like a quack without having to reply. I want a like button and a like count on every quack. Everyone can like a quack only once, and take the like back."

Scope decisions:

- **Replies are quacks.** Every quack can be liked, replies included, with the same button and count.
- **Only signed-in users.** Signed-out visitors can't see the feed at all (`GET /api/quacks` returns 401). The only signed-out case is calling the like or unlike request directly.
- **You can like your own quack.**
- **Admins get no special power over likes.** An admin likes and takes back likes like any other user and can't remove anyone else's like.
- **Placeholders keep no likes.** A deleted quack kept for its replies has no like button and no count. Liking or unliking it returns 404, the same as voting on its poll.
- **Liking and taking back a like are both idempotent.** Liking twice, or taking back a like you never gave, succeeds and changes nothing.
- **The like button updates optimistically** (`networkMode: "always"`). It rolls back with an error message on failure and is disabled while its request is pending.
- **Out of scope: live updates.** Another user's like reaches my screen only when my page refetches.
- How likes are stored and counted is decided in the ADR, not here.

---

## 1. Rules (unit tests)

### Liking and taking back a like

**R1. Liking counts once per user**

- Given a quack with 0 likes
- When I like it
- Then its count is 1 and it is liked by me

**R2. Liking again changes nothing**

- Given a quack I have liked, with 1 like
- When I like it again
- Then its count stays 1 and it is still liked by me

**R3. Taking back a like**

- Given a quack I have liked, with 1 like
- When I take my like back
- Then its count is 0 and it is not liked by me

**R4. Taking back a like I never gave changes nothing**

- Given a quack I haven't liked, with 0 likes
- When I take my like back
- Then its count stays 0 and the action succeeds

**R5. Likes from different users add up**

- Given a quack with 0 likes
- When user A and user B each like it
- Then its count is 2

**R6. One user's unlike never removes another user's like**

- Given a quack liked by me and by another user (count 2)
- When the other user takes their like back
- Then its count is 1 and it is still liked by me

**R7. I can like my own quack**

- Given my own quack with 0 likes
- When I like it
- Then its count is 1 and it is liked by me

**R8. An admin has no power over other users' likes**

- Given a quack liked by another user (count 1), which the admin hasn't liked
- When an admin takes back a like on it
- Then its count stays 1 and it is still liked by the other user

### What can be liked

**R9. A reply can be liked on its own**

- Given a reply to a quack, where both have 0 likes
- When I like the reply
- Then the reply's count is 1 and the parent quack's count stays 0

**R10. Replying doesn't change a quack's likes**

- Given a quack with 2 likes
- When someone replies to it
- Then its count is still 2

**R11. A placeholder can't be liked**

- Given a placeholder (a deleted quack kept for its replies)
- When I try to like it or take a like back
- Then I am refused as "not found" and nothing is stored

**R12. Deleting a liked quack that has replies leaves a placeholder with no likes**

- Given a quack with replies and 3 likes
- When its author deletes it
- Then it becomes a placeholder with no likes and no count

### What the like control shows (frontend component)

**R13. Zero is shown**

- Given a quack with 0 likes
- When I view it
- Then the like button shows the count 0

**R14. Liked state is visible and announced**

- Given a quack I have liked
- When I view it
- Then the button looks liked (filled icon) and has `aria-pressed="true"`
- And given a quack I haven't liked, the button looks unliked and has `aria-pressed="false"`

**R15. Accessible name gives the action and the count**

- Given a quack with 3 likes
- When a screen reader reads the like button
- Then it announces "Like, 3 likes"

**R16. Singular and plural**

- Given a quack with 1 like
- When I view it
- Then the text reads "1 like", not "1 likes"
- And given 0 or 2 likes, it reads "0 likes" and "2 likes"

**R17. A placeholder shows no like control**

- Given a placeholder in the feed or as a replies-view header
- When I view it
- Then it shows no like button and no count

### Optimistic update (frontend hook)

**R18. The screen updates before the server answers**

- Given a quack with 0 likes that I haven't liked
- When I click like
- Then the button shows liked and the count shows 1 right away, before the server responds

**R19. A rejected like is rolled back**

- Given I clicked like on a quack with 0 likes and the screen shows liked with 1
- When the server rejects the request (for example 404 because the quack was just deleted)
- Then the button goes back to unliked, the count goes back to 0, and I see an error message

**R20. Offline never looks saved**

- Given I am offline
- When I click like
- Then the request fails at once, the button and count roll back, and I see an error message

**R21. No second click while a request is pending**

- Given I clicked like and that request hasn't finished
- When I look at the button
- Then it is disabled, so a second click can't race the first
- And the count has already changed

---

## 2. API behaviour (integration tests)

Each case goes through the HTTP API against a real database.

**A1. Like from 0 to 1**

- Given a signed-in user and a quack with 0 likes
- When they send a like request for it
- Then the request succeeds, and the quack appears in the feed with count 1 and liked by them

**A2. Liking twice keeps 1**

- Given a signed-in user who has liked a quack (count 1)
- When they send a like request for it again
- Then the request succeeds and the count is still 1

**A3. Take back from 1 to 0**

- Given a signed-in user who has liked a quack (count 1)
- When they send an unlike request for it
- Then the request succeeds, and the feed shows count 0 and not liked by them

**A4. Taking back a like never given succeeds and changes nothing**

- Given a signed-in user who hasn't liked a quack with 0 likes
- When they send an unlike request for it
- Then the request succeeds and the count is still 0

**A5. Two users give a count of 2**

- Given two signed-in users and a quack with 0 likes
- When each sends a like request for it
- Then the feed shows count 2, liked by each user when they request it

**A6. Liked state is per user**

- Given user A has liked a quack and user B hasn't
- When each requests the feed
- Then both see the same count, A sees it as liked and B sees it as not liked

**A7. One user's unlike doesn't touch another's like**

- Given a quack liked by user A and user B (count 2)
- When user B sends an unlike request
- Then the count is 1 and user A still sees it as liked

**A8. Liking my own quack**

- Given a signed-in user's own quack with 0 likes
- When they send a like request for it
- Then the request succeeds and the count is 1

**A9. An admin can't remove another user's like**

- Given a quack liked by a regular user (count 1) and an admin who hasn't liked it
- When the admin sends an unlike request for it
- Then the request succeeds, the count is still 1, and the regular user still sees it as liked

**A10. Signed-out like and unlike are refused**

- Given a signed-out visitor and a quack with 1 like
- When they send a like request, then an unlike request
- Then each returns 401 and the count stays 1

**A11. A reply can be liked; its parent is unaffected**

- Given a quack and a reply to it, both with 0 likes
- When a signed-in user likes the reply
- Then the reply's count in its replies list is 1 and the parent's count in the feed is still 0

**A12. A reply doesn't change its parent's likes**

- Given a quack with 2 likes
- When a signed-in user posts a reply to it
- Then the quack's count is still 2

**A13. Replies carry the count and liked state**

- Given a reply liked by the signed-in user
- When they request that quack's replies
- Then the reply comes back with count 1 and liked by them

**A14. Liking or unliking a placeholder returns 404**

- Given a placeholder (a deleted quack kept for its replies)
- When a signed-in user sends a like request, then an unlike request, for it
- Then each returns 404 and no like is stored

**A15. A placeholder comes back with no likes**

- Given a quack with replies and 3 likes
- When its author deletes it and the feed is requested
- Then the placeholder carries no count and no liked state

**A16. Deleting a quack without replies removes it and its likes**

- Given a quack with no replies, liked by me
- When its author deletes it
- Then it is gone from the feed, and a like or unlike request for it returns 404

**A17. Unknown quack returns 404**

- Given no quack has the id `does-not-exist`
- When a signed-in user sends a like request, then an unlike request, for it
- Then each returns 404 and no like is stored

---

## 3. End-to-end flows

**E1. Like, reload, take back**

- Given I am signed in and the feed shows a quack with 0 likes that I haven't liked
- When I click its like button
- Then it shows liked with "1 like"
- When I reload the page
- Then it still shows liked with "1 like"
- When I click the button again
- Then it shows unliked with "0 likes", and after another reload it is still unliked with "0 likes"

**E2. Two users**

- Given user A has liked a quack
- When user B signs in, opens the feed and likes the same quack
- Then user B sees it liked with "2 likes"

**E3. Like in the replies view, see it in the feed**

- Given I am signed in and open a quack's replies
- When I like the quack at the top of the replies view and go back to the feed
- Then the feed shows that quack as liked with the new count, without a reload

**E4. Like a reply, reopen the view**

- Given I am signed in and open a quack's replies
- When I like a reply, close the replies view and open it again
- Then the reply still shows as liked with its count, and the parent quack's count hasn't changed

---

## 4. Manual checks

**M1. Swagger**

- Given the API docs at `localhost:4050/api/docs`
- When the like and unlike endpoints are called with "Try it out"
- Then the request goes to `/api/...` (not `/api/api/...`) and gets a real response (200/204, 401 or 404), not a wrong-path 404

---

## Out of scope

- **Live updates.** Given another user likes a quack while my page is open, when I do nothing, then my count doesn't change until the page refetches.
- Seeing who liked a quack.
- Notifications about likes.
- How likes are stored and counted (decided in the ADR).
