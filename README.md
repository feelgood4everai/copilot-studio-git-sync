# Copilot Studio Git Sync

<p align="center">
  <strong>Version control for Microsoft Copilot Studio agents</strong>
</p>

<p align="center">
  <a href="https://github.com/feelgood4everai/copilot-studio-git-sync/releases">
    <img src="https://img.shields.io/github/v/release/feelgood4everai/copilot-studio-git-sync" alt="Latest Release">
  </a>
  <a href="https://www.npmjs.com/package/copilot-studio-git-sync">
    <img src="https://img.shields.io/npm/v/copilot-studio-git-sync" alt="NPM Version">
  </a>
  <a href="https://github.com/feelgood4everai/copilot-studio-git-sync/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/feelgood4everai/copilot-studio-git-sync" alt="License">
  </a>
</p>

---

## Problem

Microsoft Copilot Studio has **no native Git version control support**. Developers must:
- Use complex Power Platform Solutions for version management
- Rely on manual exports/imports
- Lack proper change tracking and code review workflows
- Struggle with team collaboration

## Solution

**Copilot Studio Git Sync** bridges Copilot Studio and Git, enabling:

- ✅ Export agents/topics/entities to version-controlled JSON
- ✅ Track changes with proper Git history
- ✅ Import changes back to Copilot Studio
- ✅ Integrate with CI/CD pipelines
- ✅ Collaborate using standard Git workflows

## Installation

```bash
npm install -g copilot-studio-git-sync

# Or use npx
npx copilot-studio-git-sync --help
```

## Quick Start

### 1. Initialize the project

```bash
# Create a new directory for your agents
mkdir my-copilot-agents
cd my-copilot-agents

# Initialize configuration
csgs init
```

This will:
- Ask for your Power Platform environment URL
- Ask for your Azure AD Tenant ID
- Create a `csgs.config.json` file
- Set up the directory structure

### 2. Authenticate

```bash
# Login with device code (recommended for local development)
csgs auth login

# Check authentication status
csgs auth status
```

### 3. Export agents

```bash
# Export all agents
csgs export

# Export specific agent
csgs export --agent "Customer Support Bot"
```

### 4. Make changes

Edit your agent files in the `agents/` directory:

```bash
# Edit an agent's topic
code agents/customer-support/topics/greeting.json
```

### 5. Commit changes

The export command automatically commits to Git. You can also run manually:

```bash
cd copilot-studio-agents
git commit -am "Updated greeting topic"
git push origin main
```

### 6. Import changes

```bash
# Import all changes
csgs import

# Import specific agent
csgs import --agent "Customer Support Bot"

# Dry run (validate without making changes)
csgs import --dry-run
```

### 7. Sync (bidirectional)

```bash
# Full bidirectional sync
csgs sync

# Export only
csgs sync --direction export

# Import only  
csgs sync --direction import
```

## Commands

| Command | Description |
|---------|-------------|
| `csgs init` | Initialize configuration |
| `csgs auth login` | Authenticate with Power Platform |
| `csgs auth logout` | Clear stored credentials |
| `csgs auth status` | Check authentication status |
| `csgs export` | Export agents to Git |
| `csgs import` | Import agents from Git |
| `csgs sync` | Bidirectional sync |
| `csgs status` | Show Git vs Studio status |

## Authentication

### Device Code (Recommended for development)

Interactive login using browser:

```bash
csgs auth login
```

You'll be prompted to visit microsoft.com/devicelogin and enter a code.

### Service Principal (Recommended for CI/CD)

Set environment variables:

```bash
export AZURE_CLIENT_ID="your-client-id"
export AZURE_CLIENT_SECRET="your-client-secret"
export AZURE_TENANT_ID="your-tenant-id"
```

## Directory Structure

```
copilot-studio-agents/
├── .gitignore
├── README.md
├── csgs.config.json
├── manifest.json
└── agents/
    ├── agent-one/
    │   ├── agent.json
    │   ├── topics/
    │   │   ├── topic-1.json
    │   │   └── topic-2.json
    │   ├── entities/
    │   │   └── entity-1.json
    │   └── variables/
    │       └── variables.json
    └── agent-two/
        └── ...
```

## Configuration

`csgs.config.json`:

```json
{
  "environmentUrl": "https://yourenv.crm.dynamics.com",
  "tenantId": "your-azure-ad-tenant-id",
  "outputDirectory": "./copilot-studio-agents"
}
```

## Git Workflow Example

```bash
# 1. Export current state
csgs export

# 2. Create feature branch
git checkout -b feature/new-topic

# 3. Make changes in Copilot Studio UI
# ... edit your agent ...

# 4. Export and commit
csgs export
git commit -am "Added new support topic"

# 5. Push and create PR
git push origin feature/new-topic
# Create PR via GitHub UI

# 6. After merge, switch to main and pull
git checkout main
git pull origin main

# 7. Import to verify
csgs import
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Sync Copilot Studio Agents

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm install -g copilot-studio-git-sync
        
      - name: Authenticate
        run: |
          export AZURE_CLIENT_ID="${{ secrets.AZURE_CLIENT_ID }}"
          export AZURE_CLIENT_SECRET="${{ secrets.AZURE_CLIENT_SECRET }}"
          export AZURE_TENANT_ID="${{ secrets.AZURE_TENANT_ID }}"
          csgs auth login --method clientCredentials
          
      - name: Import changes
        run: csgs import
        
      - name: Export and commit
        run: |
          csgs export
          git config --local user.email "github-actions[bot]@users.noreply.github.com"
          git config --local user.name "github-actions[bot]"
          git commit -am "Sync from Copilot Studio" || echo "No changes"
          git push
```

## Requirements

- Node.js 18+
- Git
- Power Platform / Dynamics 365 environment
- Azure AD/Entra ID account with appropriate permissions

## Permissions

Your Azure AD account needs these permissions:
- `Dynamics365.BotService.Consumer` (or equivalent)
- Read/write access to Dataverse tables:
  - `botcomponents`
  - `topics`
  - `entities`
  - `botvariables`

## Troubleshooting

### "Not authenticated" error

Run `csgs auth login` to authenticate.

### "Token expired" error

Your session expired. Run `csgs auth login` again.

### API rate limiting

If you hit rate limits:
- Wait before retrying
- Use `--dry-run` to validate without API calls
- Contact your admin about API limits

### Environment URL not found

Make sure your environment URL is correct:
- Format: `https://{name}.crm.dynamics.com`
- Must have Dataverse enabled

## Development

```bash
# Clone repository
git clone https://github.com/feelgood4everai/copilot-studio-git-sync.git
cd copilot-studio-git-sync

# Install dependencies
npm install

# Build
npm run build

# Run locally
npm run dev -- export

# Run tests
npm test
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) first.

---

**Disclaimer:** This tool is not affiliated with, endorsed by, or connected to Microsoft Copilot Studio or Microsoft Power Platform. Use at your own risk.
