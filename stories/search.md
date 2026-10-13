# Search posts by text or author

As someone reading the feed,
I want to type a word or a name and see only the posts that match,
so that I can find a post I saw earlier without scrolling through the whole feed.

## Context

People often can't find a post they saw last week. They usually remember a word from it or who wrote it. This is a deliberately minimal first version to find out whether people use search at all.

## Acceptance criteria

The examples use the standard seed data (local). On production there is no seed data, so the same criteria are checked with my own posts.

### Search field
1. On the feed page (/quacks) there is a search field above the list of posts, with a visible label.
2. With the field empty, the feed looks exactly as it does today: all posts, newest first.

### What matches
3. Typing `sourdough` shows the Bread Critic post containing "Sourdough" and no other posts.
4. Typing `SOURDOUGH` gives the same result as `sourdough` (case doesn't matter).
5. Typing part of a word works: `sourd` shows the same post as `sourdough`.
6. Typing an author's display name shows that author's posts: `Deep Duck` shows only posts by Deep Duck Thoughts.
7. Typing an author's username shows that author's posts: `BreadCritic` shows only posts by @BreadCritic.
8. A leading @ is ignored: `@BreadCritic` gives the same result as `BreadCritic`.
9. Several words are treated as one exact phrase: `thrown by a child` shows the Sourdough post; `child thrown` shows nothing.
10. A phrase must fit inside one field (text, display name or username); `BreadCritic sourdough` shows nothing.
11. Leading and trailing spaces are ignored. A field with only spaces shows the normal feed.
12. The characters `%` and `_` are matched literally, not as wildcards.

### Behaviour while typing
13. Results update by themselves shortly after typing stops, without pressing Enter or a button.
14. Typing `sourdough` at normal speed does not send a request for each letter (check in DevTools → Network).
15. Clearing the field brings back the full feed.

### Results and states
16. Matching posts look the same as in the normal feed (author, date, mood, text), newest first.
17. When nothing matches, the message "No posts match your search." is shown. The field stays visible and keeps the typed text.
18. If the search request fails, an error message with a way to retry is shown, and the field keeps its text.
19. Posting a new quack while a search is active keeps the search; the new post appears only if it matches.

### Not persisted
20. After reloading the page, the search field is empty and the full feed is shown.

## Out of scope
- Ignoring diacritics (`kava` does not have to find `Káva`)
- Matching words in any order, or any one of several words
- Filtering by mood or by date
- Highlighting the matched text
- Pagination of search results
- A separate search page
- Keeping the search in the URL or after a reload
- Measuring usage (the product owner will ask users directly)
