---
name: explore-github
description: Search GitHub repositories, pull requests, and issues with gh.
compatibility: opencode
metadata:
  audience: agents
  workflow: github
---

## What I do
- Find GitHub repositories quickly.
- Read and analyze pull request comments and issue discussions.
- Report search results clearly and concisely.

## How I work
- Assume the local GitHub CLI `gh` is available and already authenticated.
- Use `gh` for all GitHub searches and prefer machine-friendly output like `--json` or `gh api`.
- Before running queries, check authentication with `gh auth status`.
- Public GitHub uses `github.com` and the `jmaygarden` account.
- Samsung enterprise GitHub uses `github.ecodesamsung.com` and the `judge-maygarden` account.
- If `gh auth status` shows the wrong active account for the target host, switch with `gh auth switch --user <user>`.
- For public repos, use `gh` against `github.com` directly.
- For enterprise repos, always include `--hostname github.ecodesamsung.com` or use the enterprise host in the repo reference.
- Treat `iot/*` and `iot-hub/*` as enterprise repositories.
- Treat `PhysicalGraph/*` as public GitHub repositories.
- Consult the `gh` manual when needed: https://cli.github.com/manual/
- Do not search the local project or filesystem unless the user explicitly asks for that.
- Do not use local git commands that modify repository state.
- Do not create files or run commands that modify the user's system state.
- Adapt search depth to the thoroughness level requested by the caller.
- Avoid emojis in responses.
- When inspecting pull request feedback, do not rely on a single endpoint.
- For PR feedback triage, collect:
  - review comments via `gh api repos/<owner>/<repo>/pulls/<number>/comments --paginate`
  - issue comments via `gh api repos/<owner>/<repo>/issues/<number>/comments --paginate`
  - review summaries via `gh pr view <number> --repo <owner>/<repo> --json reviews`
- Reconstruct review threads using `in_reply_to_id`.
- Treat every top-level review comment as a feedback item even if it has no replies.
- Treat standalone issue comments and non-empty review bodies as separate feedback items.
- Distinguish author replies from reviewer feedback when summarizing action items.

## When to use me
Use this skill when you need to locate GitHub repositories, issues, pull requests, or comments, especially when the task requires careful GitHub-side searching rather than local code inspection.
