---
name: qa-monitor
description: Autonomous QA monitor for Omari Finance (Nomad Pinwheel). Runs E2E tests, detects bugs, attempts fixes, cleans up test data, and reports activity.
metadata:
  openclaw:
    emoji: 🛡️
---

# QA Monitor Skill

This skill enables Echo to act as an autonomous QA monitor for the Nomad Pinwheel application.

## Workflow

### 1. Run Tests (Silent Testing)

Execute the E2E test suite in the background:

```bash
bash pty:true workdir:/workspace background:true command:"npm test 2>&1 | tee /tmp/qa-monitor-test-output.log"
```

For specific test files (e.g., rejection flow):

```bash
bash pty:true workdir:/workspace background:true command:"npx playwright test tests/e2e/rejection-flow.spec.ts 2>&1 | tee /tmp/qa-monitor-rejection-flow.log"
```

### 2. Analyze Results (Bug Detection)

After tests complete, analyze the log file for failures:

```bash
bash command:"grep -E 'FAIL|Error|×' /tmp/qa-monitor-test-output.log || echo 'No failures detected.'"
```

Check the Playwright report for detailed failure information:

```bash
bash command:"cat nomad-pinwheel/playwright-report/data/*.md 2>/dev/null | head -100 || echo 'No report data found.'"
```

### 3. Attempt Fixes (Optional)

If failures are detected, use the `coding-agent` skill to attempt a fix:

```bash
# Only if a clear, fixable issue is identified
bash pty:true workdir:/workspace background:true command:"codex exec 'Fix the following test failure: [describe failure]. Do not modify unrelated files.'"
```

**⚠️ CRITICAL**: Do not attempt fixes for ambiguous or complex issues. Report them instead.

### 4. Cleanup Test Data

Run the cleanup script to remove stale test users:

```bash
bash workdir:/workspace command:"npx tsx scripts/cleanup-test-data.ts"
```

### 5. Report Activity

After each run, summarize:
- Tests run
- Failures detected (if any)
- Fixes attempted (if any)
- Cleanup status

Send the report via the configured messaging channel (e.g., Telegram).

## Constraints

- **Do NOT approve or reject loan applications.** This is a business decision outside the scope of QA.
- **Do NOT modify code without a clear, identified bug.** Report ambiguous issues to the operator.
- **Always clean up test data after runs.**

## Scheduling (Cron)

To schedule periodic QA runs, use OpenClaw cron:

```bash
openclaw cron add --name "qa-monitor:nightly" --schedule "0 2 * * *" --agentId nomad-qa --message "Run the QA monitor for Nomad Pinwheel."
```

This schedules a nightly run at 2 AM.
