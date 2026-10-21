# Polls: ask a question with answers to choose from

As someone posting in the feed,
I want to ask a question with a few answers that others can pick from and see how many picked each,
so that a group can decide something without counting replies by hand and getting the numbers wrong.

## Context

People ask questions in posts ("where do we go for lunch?") and count the answers by hand. The counts end up wrong, and the question gets lost. This is a deliberately minimal first version to find out whether people use polls at all.

## Acceptance criteria

The examples use the standard seed data (local). The seed includes one poll by Caffeinated Duck: "Where do we go for lunch?" with the answers **Pizza** (voted by Deep Duck Thoughts and The Bread Critic), **Ramen** (voted by Migration Season) and **Salad bar** (no votes). On production there is no seed data, so the same criteria are checked with a poll I create.

### Creating a poll
1. The post form on /quacks has a way to add a poll to the post. The post text is the poll's question.
2. Adding a poll shows two empty answer fields, each with a visible label. I can add answers up to a total of 4, and remove answers down to 2.
3. I can remove the poll again before posting, and the post is then an ordinary post.
4. Each answer is required and can be at most 50 characters. Leading and trailing spaces are ignored.
5. Two answers can't be the same, ignoring case and surrounding spaces ("Pizza" and " pizza " count as the same).
6. Each problem is shown under the field it belongs to and says exactly what is wrong. Examples: "Answer is required.", "Answer is too long — use at most 50 characters (you have 57).", "This answer is the same as answer 1."
7. The server checks the same rules and returns the same messages. A poll with fewer than 2 or more than 4 answers is rejected.
8. The post text and mood work exactly as for any post. The text is required and can be at most 280 characters, and my default mood is preselected.
9. After posting, the poll appears at the top of the feed and the form is empty again with no poll.

### Seeing a poll
10. A poll shows under its post's text wherever the post appears: in the normal feed and in search results.
11. For each answer I see its text, how many people picked it, its percentage (whole numbers), and a bar showing its share.
12. The poll shows the total number of votes: "3 votes", "1 vote", or "No votes yet".
13. Anyone signed in sees the results, including before voting. Example: in the seed poll I see Pizza 2 (67%), Ramen 1 (33%), Salad bar 0 (0%), and "3 votes".
14. If I have voted, my answer is clearly marked, in a way that doesn't rely on colour alone.
15. Nobody can see who voted for what. Only the counts are shown.

### Voting
16. I vote by clicking (or using the keyboard on) an answer. Anyone signed in can vote, including the poll's author.
17. One person has at most one vote per poll. Example: signed in as Caffeinated Duck, I pick Salad bar. The results become Pizza 2 (50%), Ramen 1 (25%), Salad bar 1 (25%), with 4 votes in total.
18. I can change my vote by picking another answer. My vote moves from my old answer to the new one and the total stays the same. Example: continuing from the previous example, picking Pizza gives Pizza 3 (75%), Ramen 1 (25%), Salad bar 0 (0%), still 4 votes.
19. I can't take my vote back. Picking the answer I already chose changes nothing.
20. My vote shows immediately: the mark and the counts update without waiting for the server.
21. If I click several answers quickly, my last click is my vote, both on screen and on the server. At no point do the counts show me voting twice.
22. If my vote isn't saved, that poll goes back to how it was before I clicked. A message under the poll says "Your vote wasn't saved. Try again." Nothing else on the page changes.
23. My vote survives a page reload and shows the same on another device or browser.

### Numbers are right for everyone
24. The counts always come from the server. After my vote is saved, the poll shows the server's numbers, including other people's votes cast in the meantime.
25. Other people's votes appear when the feed refreshes itself: when I come back to the tab, after I post or vote, and on reload. They don't need to appear live while I'm looking.
26. Votes cast at the same moment by different people are all counted.
27. The same person voting from two tabs at once still ends up with exactly one vote.
28. Example: signed in as The Bread Critic, I see Pizza marked as my answer in the seed poll.

### Search
29. Searching works as it does today, and the question is found because it is the post text. Example: `lunch` finds the seed poll. The answer texts aren't searched, so `Ramen` does not find it.

## Out of scope
- Taking a vote back without picking another answer
- Seeing who voted for which answer
- Closing a poll, by the author or after a set time
- Results updating live while I'm looking at them
- Hiding results until I've voted
- More than 4 answers, or picking more than one answer
- Editing a poll or its answers after posting (posts can't be edited today)
- Searching by answer text
- Measuring usage (the product owner will ask users directly)
