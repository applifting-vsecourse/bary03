# Architecture decision records

Decisions that are hard to undo or that shape more of the app than one feature. Check this list before changing the data model or the structure of the app; add a record when you make such a decision.

| #                                                | Title                                                  | Status   | Summary                                                                                                                                                                                       |
| ------------------------------------------------ | ------------------------------------------------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [0001](0001-wipe-deleted-quacks-with-replies.md) | A deleted quack that has replies is wiped, not removed | Accepted | Deleting a quack with replies erases its text, mood, poll and author but keeps an authorless placeholder row so the replies stay, enforced by CHECK constraints and a `Restrict` foreign key. |
