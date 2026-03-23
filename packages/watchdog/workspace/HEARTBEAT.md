# Watchdog Checklist

## Every check (Layer 1 -- sensors):

- GitHub Actions: Is CI green on main branch?
- Pull Requests: Are there Renovate Bot PRs older than 48 hours?
- Pull Requests: Are there open PRs with failing checks?

## When something needs attention (Layer 2/3):

- Summarize the issue clearly
- Write an event file to events/ with: timestamp, source, severity, description
- Send Telegram notification to Aldo with: one-line summary + link to relevant PR/action

## What NOT to do:

- Do not merge PRs
- Do not push code
- Do not modify any repository settings
- Do not retry failed CI without human approval
