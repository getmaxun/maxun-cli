---
name: maxun
description: List and run Maxun cloud robots. Use when asked to list robots, run a robot, scrape a website, or get robot results using Maxun.
argument-hint: "list | run <robotId> | runs <robotId> | result <robotId> <runId> | get <robotId> | abort <robotId> <runId>"
allowed-tools: Bash
---

# Maxun Skill

Maxun is a web scraping platform. The user has robots that scrape websites automatically.

## INSTRUCTIONS FOR THE AI MODEL

You have ONE job here: call the `Bash` tool with the exact command strings below. Do not paraphrase. Do not guess. Copy the command string exactly.

The helper script is at: `${CLAUDE_SKILL_DIR}/scripts/maxun.sh`

Before running any command, check that `MAXUN_API_KEY` is set. If it isn't, tell the user to export it:
```bash
export MAXUN_API_KEY="your-api-key-here"
```

### Action: List all robots

When the user says anything like "list my robots", "show robots", "what robots do I have":

Call the `Bash` tool with this exact command:
```
bash "${CLAUDE_SKILL_DIR}/scripts/maxun.sh" list
```

Display the output directly — it IS the robot list. Do not interpret it further.

### Action: Run a robot

When the user wants to run or scrape with a specific robot:

Step 1 — List robots first:
```
bash "${CLAUDE_SKILL_DIR}/scripts/maxun.sh" list
```

Step 2 — Find the robot ID, then run it:
```
bash "${CLAUDE_SKILL_DIR}/scripts/maxun.sh" run <robotId>
```

### Action: List past runs

```
bash "${CLAUDE_SKILL_DIR}/scripts/maxun.sh" runs <robotId>
```

### Action: Get a run result

```
bash "${CLAUDE_SKILL_DIR}/scripts/maxun.sh" result <robotId> <runId>
```

### Action: Get robot details

```
bash "${CLAUDE_SKILL_DIR}/scripts/maxun.sh" get <robotId>
```

### Action: Abort a run

```
bash "${CLAUDE_SKILL_DIR}/scripts/maxun.sh" abort <robotId> <runId>
```

## Error Handling

- No robots found → tell user to create one at https://app.maxun.dev
- Robot still running → poll with `result <robotId> <runId>`

## Setup

This skill works with **Maxun cloud only** (`app.maxun.dev`). Set your API key:

```bash
export MAXUN_API_KEY="your-api-key-here"
```

Get your key at: https://app.maxun.dev/settings
