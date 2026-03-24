# @maxun/cli

Official CLI for [Maxun](https://maxun.dev) — the open-source web data extraction platform.

## Install

```bash
npm install -g @maxun/cli
```

## Quick Start

```bash
# Authenticate (Cloud)
maxun login --api-key your-api-key

# Authenticate (Self-hosted / OSS)
maxun login --api-url http://localhost:8080 --api-key your-api-key

# create an AI robot from a prompt
maxun robots extract -p "Extract trending repositories from Github" -n "Github Trends"

# Run it
maxun run <robot-id>

# Check your status and credits
maxun status
```

## Commands

### Auth

| Command | Description |
|---------|-------------|
| `maxun login --api-url <url> --api-key <key>` | Authenticate with your instance and API key |
| `maxun logout` | Clear stored credentials |
| `maxun status` | Show plan, credits, and auth status |
| `maxun credits` | Show remaining credits |

### Robots Management

| Command | Description |
|---------|-------------|
| `maxun robots list` | List all robots (Defaults to JSON, use `--table` for formatted view) |
| `maxun robots extract -p <prompt>` | Create an AI robot from a natural language prompt |
| `maxun robots scrape <url>` | Create a single-page extraction robot |
| `maxun robots crawl <url>` | Create a multi-page crawler robot |
| `maxun robots search <query>` | Create a search-based robot (modes: `discover`, `scrape`) |
| `maxun robots delete <id>` | Remove a robot |
| `maxun robots duplicate <id>` | Duplicate a robot with a new target URL |

### Robot Execution

| Command | Description |
|---------|-------------|
| `maxun run <id>` | Trigger a robot run and get results (Defaults to JSON) |
| `maxun run <id> --table` | Display results in a table (applicable for Discovery Search) |
| `maxun run <id> -f html,markdown` | Override robot output formats for this specific run |

### Runs & Data

| Command | Description |
|---------|-------------|
| `maxun runs list <robot-id>` | List recent runs for a robot |
| `maxun runs get <robot-id> <run-id>` | Fetch specific run data (Defaults to JSON) |
| `maxun runs get <robot-id> <run-id> -f table` | View historical data in a table format |
| `maxun runs get <robot-id> <run-id> -f csv -o data.csv` | Export results to CSV file |

## Usage Examples

### AI Extraction
```bash
maxun robots extract \
  -p "Extract all product names and prices" \
  -u "https://example.com/shop" \
  -n "Shop Extractor"
```

### Discovery Search
```bash
maxun robots search "Latest web scraping news" \
  --mode discover \
  --limit 10 \
  -n "News Discoverer"

# Run and view as table
maxun run <id> --table
```

### Scraping & Crawling
```bash
maxun robots scrape https://example.com -f markdown,text -n "Example Scraper"
maxun robots crawl https://docs.maxun.dev --limit 10 --include "/docs/*" -n "Docs Crawler"
```

## Configuration

Config is stored at `~/.maxun/config.json`.

```bash
# Set an API Key via command
maxun login --api-key <key>

# Or via environment variables
export MAXUN_API_KEY=your-api-key
export MAXUN_API_URL=http://localhost:8080
```

## Piping & Scripting

All data output goes to **stdout**, status messages to **stderr** — fully pipe-friendly:

```bash
maxun run <id> | jq '.[].name'
maxun runs list <robot-id> --table
maxun robots list | grep "Extractor"
```

## License

AGPL-3.0
