# @maxun/cli

Official CLI for [Maxun](https://maxun.dev) — the open-source web data extraction platform.

## Install

```bash
npm install -g @maxun/cli
```

## Quick Start

```bash
# Authenticate
maxun login --api-key mx-your-key

# Scrape a URL (no subcommand needed)
maxun https://example.com

# Check your status and credits
maxun status
```

## Commands

### Auth

| Command | Description |
|---------|-------------|
| `maxun login --api-key <key>` | Authenticate with your API key |
| `maxun logout` | Clear stored credentials |
| `maxun status` | Show plan, credits, and auth status |
| `maxun credits` | Show remaining credits |

### Scraping

| Command | Description |
|---------|-------------|
| `maxun <url>` | Scrape a URL (shortcut — no subcommand needed) |
| `maxun scrape <url>` | Scrape a URL |
| `maxun crawl <url>` | Crawl a website across multiple pages |

#### Scrape options

```bash
maxun https://example.com                        # markdown to stdout
maxun https://example.com --format html          # html output
maxun https://example.com --format json          # json output
maxun https://example.com --screenshot           # include screenshot
maxun https://example.com -o output.md           # save to file
maxun https://example.com --wait-for 3000        # wait 3s before scraping
maxun https://example.com --json                 # raw JSON (pipe-friendly)
maxun https://example.com --pretty               # pretty print
```

#### Crawl options

```bash
maxun crawl https://example.com --depth 3 --limit 100
maxun crawl https://example.com -o results.json
```

### Robots

| Command | Description |
|---------|-------------|
| `maxun robots list` | List all robots |
| `maxun robots run <id>` | Trigger a robot run |
| `maxun robots run <id> --watch` | Run and stream live status |
| `maxun robots run <id> --wait` | Block until done (CI/CD mode, exit 1 on fail) |
| `maxun robots export <id>` | Export robot config as JSON |
| `maxun robots import <file>` | Import a robot from JSON |

### Runs

| Command | Description |
|---------|-------------|
| `maxun runs list` | List recent runs |
| `maxun runs list --robot <id>` | Filter by robot |
| `maxun runs get <run-id>` | Get run output |
| `maxun runs get <run-id> --format csv` | Get output as CSV |
| `maxun runs get <run-id> -o data.json` | Save output to file |

## Configuration

Config is stored at `~/.maxun/config.json`.

```bash
# Set an API Key via command
maxun login --api-key <key>

# Or via environment variables
export MAXUN_API_KEY=mx-your-key
```

## CI/CD usage

```bash
# Run a robot, fail the pipeline if the run fails or returns no data
maxun robots run my-robot-id --wait
```

## Piping & scripting

All data output goes to **stdout**, status messages to **stderr** — fully pipe-friendly:

```bash
maxun https://example.com | grep "price"
maxun runs get <id> --format csv | csvsort -c date
maxun robots list --json | jq '.[].name'
```

## License

AGPL-3.0
