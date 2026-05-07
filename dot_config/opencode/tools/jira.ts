import { tool } from "@opencode-ai/plugin"
import fs from "fs"
import os from "os"
import path from "path"
import { spawnSync } from "child_process"

type IssueNode = {
  key: string
  summary: string
  description: string
  issueType: string
  status: string
  assignee: string | null
  reporter: string | null
  created: string
  updated: string
  url: string
  children: string[]
}

type TreeResult = {
  root: string
  issues: Record<string, IssueNode>
  errors: Array<{ key: string; error: string }>
}

type FetchOptions = {
  recursive: boolean
}

function requireCommand(name: string) {
  const res = spawnSync("sh", ["-lc", `command -v ${JSON.stringify(name)} >/dev/null 2>&1`], {
    encoding: "utf8",
  })
  if (res.status !== 0) {
    throw new Error(`Missing required command: ${name}`)
  }
}

function runAcli(args: string[]) {
  const res = spawnSync("acli", args, { encoding: "utf8" })
  return {
    ok: res.status === 0,
    stdout: res.stdout ?? "",
    stderr: res.stderr ?? "",
    status: res.status ?? 1,
  }
}

function normalizeIssue(input: unknown): any {
  const value: any = input
  if (Array.isArray(value)) return value[0]
  if (value?.key != null && (value?.fields != null || value?.summary != null || value?.title != null)) return value
  if (value?.issue) return value.issue
  if (value?.workItem) return value.workItem
  if (value?.workItems) return value.workItems[0]
  if (value?.issues) return value.issues[0]
  if (value?.data) return Array.isArray(value.data) ? value.data[0] : value.data
  if (value?.results) return value.results[0]
  if (value?.items) return value.items[0]
  return value
}

function searchKeys(input: unknown): string[] {
  const value: any = input
  const issues =
    Array.isArray(value)
      ? value
      : value?.issues ?? value?.workItems ?? value?.data ?? value?.results ?? value?.items ?? []

  return issues
    .map((item: any) => {
      if (typeof item === "string") return item
      if (item == null) return ""
      return item.key ?? ""
    })
    .filter(Boolean)
}

function adfText(node: unknown): string {
  if (node == null) return ""
  if (typeof node === "string") return node
  if (typeof node === "number" || typeof node === "boolean") return String(node)
  if (Array.isArray(node)) return node.map(adfText).join("")

  const value: any = node
  if (typeof value === "object") {
    if (value.text != null) return String(value.text)
    if (value.type === "hardBreak") return "\n"
    if (value.type === "paragraph" || value.type === "heading" || value.type === "blockquote" || value.type === "listItem") {
      return `${(value.content ?? []).map(adfText).join("")}\n\n`
    }
    if (value.type === "bulletList" || value.type === "orderedList") {
      return (value.content ?? []).map(adfText).join("")
    }
    if (value.content != null) return (value.content ?? []).map(adfText).join("")
  }

  return String(node)
}

function extractLinkChildren(input: unknown): string[] {
  const value: any = Array.isArray(input) ? input[0] : input
  const links = value?.fields?.issuelinks ?? value?.issuelinks ?? []

  return links
    .map((link: any) => {
      const outward = String(link?.type?.outward ?? "").toLowerCase()
      const inward = String(link?.type?.inward ?? "").toLowerCase()
      const isChildPhrase = /(^|[^a-z])(parent|contains|has child)([^a-z]|$)/.test(outward) || /(^|[^a-z])(parent|contains|has child)([^a-z]|$)/.test(inward) || /is parent of/.test(outward) || /is parent of/.test(inward)
      if (!isChildPhrase) return ""
      return link?.outwardIssue?.key ?? link?.inwardIssue?.key ?? ""
    })
    .filter(Boolean)
}

function buildIssueJson(raw: unknown, children: string[], baseUrl: string): IssueNode {
  const i: any = Array.isArray(raw) ? raw[0] : raw
  const description = adfText(i?.fields?.description ?? i?.description ?? "").replace(/\n{3,}/g, "\n\n").replace(/\n+$/g, "")

  return {
    key: i?.key ?? "",
    summary: i?.fields?.summary ?? i?.summary ?? i?.title ?? "",
    description,
    issueType: i?.fields?.issuetype?.name ?? i?.issuetype?.name ?? i?.issueType ?? "",
    status: i?.fields?.status?.name ?? i?.status?.name ?? "",
    assignee: i?.fields?.assignee?.displayName ?? i?.assignee?.displayName ?? null,
    reporter: i?.fields?.reporter?.displayName ?? i?.reporter?.displayName ?? null,
    created: i?.fields?.created ?? i?.created ?? "",
    updated: i?.fields?.updated ?? i?.updated ?? "",
    url: `${baseUrl}/browse/${i?.key ?? ""}`,
    children,
  }
}

function fetchIssueGraph(issue: string, baseUrl: string, options: FetchOptions): string {
  requireCommand("acli")
  requireCommand("mktemp")
  requireCommand("sort")

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "opencode-jira-"))
  const rawDir = path.join(tmpDir, "raw")
  const issuesDir = path.join(tmpDir, "issues")
  const childrenDir = path.join(tmpDir, "children")
  fs.mkdirSync(rawDir, { recursive: true })
  fs.mkdirSync(issuesDir, { recursive: true })
  fs.mkdirSync(childrenDir, { recursive: true })

  const errors: Array<{ key: string; error: string }> = []
  const seen = new Set<string>()
  const stack = [issue]

  const recordError = (key: string, error: string) => {
    errors.push({ key, error })
  }

  const fetchView = (key: string) => runAcli(["jira", "workitem", "view", key, "--fields", "*all", "--json"])
  const fetchSearch = (jql: string) => runAcli(["jira", "workitem", "search", "--jql", jql, "--paginate", "--json"])

  try {
    while (stack.length > 0) {
      const current = stack.pop()
      if (!current || seen.has(current)) continue
      seen.add(current)

      const rawPath = path.join(rawDir, `${current.replace(/[^A-Za-z0-9_.-]/g, "_")}.json`)
      const childPath = path.join(childrenDir, `${current.replace(/[^A-Za-z0-9_.-]/g, "_")}.json`)
      const issuePath = path.join(issuesDir, `${current.replace(/[^A-Za-z0-9_.-]/g, "_")}.json`)

      const view = fetchView(current)
      if (!view.ok) {
        recordError(current, `view failed: ${view.stderr || view.stdout}`)
        continue
      }

      const normalized = normalizeIssue(JSON.parse(view.stdout))
      fs.writeFileSync(rawPath, JSON.stringify(normalized, null, 2))

      const shouldDiscoverChildren = options.recursive || current === issue
      const childLines: string[] = []

      if (shouldDiscoverChildren) {
        const parentSearch = fetchSearch(`parent = ${current}`)
        if (parentSearch.ok) {
          childLines.push(...searchKeys(JSON.parse(parentSearch.stdout)))
        } else {
          recordError(current, `search failed for parent relationship: ${parentSearch.stderr || parentSearch.stdout}`)
        }

        const epicSearch = fetchSearch(`"Epic Link" = ${current}`)
        if (epicSearch.ok) {
          childLines.push(...searchKeys(JSON.parse(epicSearch.stdout)))
        } else {
          recordError(current, `search failed for Epic Link relationship: ${epicSearch.stderr || epicSearch.stdout}`)
        }

        childLines.push(...extractLinkChildren(normalized))
      }

      const children = [...new Set(childLines.filter(Boolean))].sort()
      fs.writeFileSync(childPath, `${JSON.stringify(children, null, 2)}\n`)

      const issueNode = buildIssueJson(normalized, children, baseUrl)
      fs.writeFileSync(issuePath, `${JSON.stringify(issueNode, null, 2)}\n`)

      if (options.recursive || current === issue) {
        for (const child of children) {
          if (!seen.has(child)) stack.push(child)
        }
      }
    }

    const issues = Object.fromEntries(
      fs
        .readdirSync(issuesDir)
        .filter((file) => file.endsWith(".json"))
        .map((file) => JSON.parse(fs.readFileSync(path.join(issuesDir, file), "utf8")) as IssueNode)
        .filter((issue) => issue.key)
        .map((issue) => [issue.key, issue]),
    )

    const result: TreeResult = {
      root: issue,
      issues,
      errors,
    }

    return JSON.stringify(result, null, 2)
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
}

export const fetchTicket = tool({
  description: "Export a Jira issue and its direct children to stable JSON using Atlassian CLI (acli).",
  args: {
    issue: tool.schema.string().describe("Jira issue key, e.g. STR-1610"),
    jira_base_url: tool.schema.string().optional().describe("Optional Jira base URL to override JIRA_BASE_URL env var"),
  },
  async execute(args): Promise<string> {
    const baseUrl = args.jira_base_url ?? process.env.JIRA_BASE_URL ?? "https://smartthings.atlassian.net"
    return fetchIssueGraph(args.issue, baseUrl, { recursive: false })
  },
})

export const fetchTicketTree = tool({
  description: "Export a Jira issue tree to stable JSON using Atlassian CLI (acli).",
  args: {
    issue: tool.schema.string().describe("Jira issue key, e.g. STR-1610"),
    jira_base_url: tool.schema.string().optional().describe("Optional Jira base URL to override JIRA_BASE_URL env var"),
  },
  async execute(args): Promise<string> {
    const baseUrl = args.jira_base_url ?? process.env.JIRA_BASE_URL ?? "https://smartthings.atlassian.net"
    return fetchIssueGraph(args.issue, baseUrl, { recursive: true })
  },
})
