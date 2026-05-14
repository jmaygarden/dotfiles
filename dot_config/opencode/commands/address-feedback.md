
---
description: Address feedback from a GitHub pull request
---
Assess feedback from the GitHub pull request referenced in $ARGUMENTS.
- Use the `explore-github` skill to gather information from the pull request.
- Collect all feedback sources:
  - PR review comments (`pulls/<number>/comments`)
  - PR issue comments (`issues/<number>/comments`)
  - PR reviews with non-empty bodies
- Build a TODO item for every actionable feedback item:
  - every top-level review comment, even if it has no replies
  - every review thread, grouped by `in_reply_to_id`
  - every standalone issue comment
  - every review summary body with actionable feedback
- Do not skip comments just because they have no replies.
- For each TODO item, provide:
  - source link
  - author
  - short summary
  - recommendation
  - status: actionable, answered, or non-actionable
- Present the recommendations to the user.
- When asked to comment on the PR, post a top-level comment with:
  - a brief reference to the question or comment being answered
  - the response
  - a final line in this exact format:
    `Submitted by AI agent (github-copilot/gpt-5.4)`
- When submitting a comment using `gh`, always use a heredoc body.
