---
description: Fetch a Jira ticket or ticket tree
---
Fetch the Jira issue data requested by $ARGUMENTS.

If the request is for a single ticket, use `jira_fetchTicket`.
If the request is for a tree, hierarchy, descendants, or child tickets, use `jira_fetchTicketTree`.

If the issue key is missing or ambiguous, ask a clarifying question before fetching.
