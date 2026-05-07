---
name: jira-tools
description: Use the Jira fetch tools to inspect a single ticket or a full ticket tree.
compatibility: opencode
metadata:
  audience: agents
  workflow: jira
---

## What I do
- Fetch a single Jira ticket and its direct children with `jira_fetchTicket`.
- Fetch a full recursive ticket tree with `jira_fetchTicketTree`.

## How I work
- Use `jira_fetchTicket` when you only need one ticket plus its immediate child references.
- Use `jira_fetchTicketTree` when you need the full descendant hierarchy.
- Accept an optional `jira_base_url` when the Jira host differs from the default.
- Prefer the smallest fetch that satisfies the request.

## When to use me
Use this skill whenever a task involves reading Jira ticket data, especially when you need to decide between a single ticket fetch and a recursive tree fetch.
