# Spec: DevOps Agent

spec-id: devops-agent
status: draft
date: 2026-02-24
council-type: feature-scope

## Context

Guild ships 9 agent templates. A gap exists for project infrastructure tasks:
CI/CD pipelines, Docker configuration, deployment setup, and environment
management. These tasks fall outside the scope of existing agents --- developer
handles application code, platform-expert handles Claude Code integration,
db-migration handles schemas. No agent owns the deployment and infrastructure
layer.

## Decision

Design a devops agent that handles project infrastructure configuration. The
agent assists with CI/CD, Docker, deployment, and environment setup. It does
NOT deploy to production (too dangerous for AI) and does NOT handle Claude Code
integration (platform-expert's domain).

## Constraints

- Must not overlap with platform-expert (Claude Code integration) or developer
  (application code)
- Must not perform destructive production operations (deploy, scale, terminate)
- Must follow existing agent format: YAML frontmatter with name, description,
  tools, permissionMode
- Agent count stays at 9 until this spec is approved and implemented

## Acceptance Criteria

- [ ] Agent has clear, non-overlapping responsibilities with all 9 existing
      agents
- [ ] Agent frontmatter defines appropriate tools and permissionMode
- [ ] Boundary with platform-expert is explicitly documented
- [ ] Agent does not perform production deployments

## Technical Approach

Agent definition would follow existing format:

- name: devops
- description: "Configures CI/CD pipelines, Docker, deployment, and
  environment management"
- tools: Read, Write, Edit, Bash, Glob, Grep
- permissionMode: default

Responsibilities: CI/CD pipeline configuration, Dockerfile authoring,
deployment config (Vercel, AWS, Fly.io), environment variable schemas,
infrastructure review.

Boundary with platform-expert: If the issue is in `.github/workflows/` or
`Dockerfile`, use devops. If the issue is in `.claude/` or involves Claude Code
permissions/hooks, use platform-expert.

## Trade-offs Considered

| Option | Pros | Cons | Decision |
| --- | --- | --- | --- |
| New standalone agent | Clear ownership, clean separation | 10th agent adds template bloat | Under evaluation |
| Extend platform-expert | Fewer agents, simpler | Conflates Claude Code integration with project infrastructure | Rejected --- different domains |
| Extend developer agent | Developer already handles implementation | Overloads developer role, dilutes expertise | Rejected --- separation of concerns |

## Unresolved Questions

1. Should the agent have `permissionMode: plan` (safer, read-only analysis) or
   `default` (can write CI configs)? Production safety argues for plan mode,
   but CI/CD configuration requires file writes.
2. What is the routing heuristic when a GitHub Action failure could be either a
   CI config issue (devops) or a Claude Code hook issue (platform-expert)?

## Test Strategy

- [ ] Agent template passes markdownlint
- [ ] Agent responsibilities do not overlap with any existing agent (manual
      review)
- [ ] Routing heuristic distinguishes devops from platform-expert for common
      scenarios

## Council Perspectives

### Advisor

The devops agent fills a genuine gap. CI/CD and Docker are universal concerns
that no current agent addresses. The key risk is scope creep ---
"infrastructure" is unbounded. The agent must have a tight definition focused
on project-level config, not cloud architecture.

### Product Owner

Users need help with GitHub Actions, Dockerfiles, and deployment config. These
are concrete, common tasks. The agent should be actionable from day one --- not
a theoretical "infrastructure advisor" but a hands-on config writer.

### Tech Lead

Implementation is one markdown file following the existing agent template
pattern. The `getAgentNames()` function dynamically reads the agents directory,
so no code changes needed when the template is added. The documentation cascade
(README, CLAUDE.md, tests) should happen in the implementation PR, not in this
spec.

## Points of Dissent

- Permission mode: Advisor prefers `plan` for safety. Product Owner and Tech
  Lead prefer `default` for practical utility. Unresolved --- captured as open
  question.
- Whether the agent is needed at all: Tech Lead notes that developer +
  platform-expert cover most cases. Advisor argues the gap is real and growing
  as more projects adopt CI/CD. Unresolved --- this spec captures the design
  for future decision.
