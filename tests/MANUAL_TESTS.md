# Copilot Studio Git Sync - Manual Testing Guide

## Prerequisites

1. Node.js 18+ installed
2. Power Platform environment with admin access
3. Azure AD tenant ID
4. Git installed

## Setup

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Or run in dev mode
npm run dev -- [command]
```

## Test Scenarios

### 1. Authentication Tests

#### Test 1.1: Device Code Login
```bash
# Run the login command
csgs auth login

# Expected: Device code prompt with URL
# Visit the URL, enter the code
# Expected: "Authentication successful" message
```

#### Test 1.2: Check Auth Status
```bash
csgs auth status

# Expected when logged in:
# ✓ Authenticated
#   User: your-email@example.com
#   Expires: 2026-03-19T12:00:00.000Z

# Expected when not logged in:
# ✗ Not authenticated
#   Run: csgs auth login
```

#### Test 1.3: Logout
```bash
csgs auth logout

# Expected: "Logged out successfully"
# Run auth status again to verify
```

### 2. Configuration Tests

#### Test 2.1: Initialize Configuration
```bash
# Interactive mode
csgs init

# Or with options
csgs init -e https://your-env.crm.dynamics.com -t your-tenant-id

# Expected: csgs.config.json created
# Expected: Output directory created
# Expected: .gitignore created
# Expected: README.md created
```

#### Test 2.2: Verify Configuration
```bash
cat csgs.config.json

# Expected valid JSON with:
# - environmentUrl
# - tenantId
# - outputDirectory
```

### 3. Export Tests

#### Test 3.1: Export All Agents
```bash
# Ensure you're authenticated first
csgs auth login

# Export all agents
csgs export

# Expected:
# - Exporting agents from Copilot Studio...
# - Writing to ./copilot-studio-agents...
# - Committing to Git...
# - ✓ Exported X agent(s) successfully
```

#### Test 3.2: Export Specific Agent
```bash
csgs export -a "Your Agent Name"

# Expected: Only specified agent exported
```

#### Test 3.3: Export Without Git
```bash
csgs export --no-git

# Expected: Files written but no Git commit
```

#### Test 3.4: Export with Custom Message
```bash
csgs export -m "Custom commit message"

# Expected: Commit with custom message
```

### 4. Import Tests

#### Test 4.1: Dry Run Import
```bash
csgs import --dry-run

# Expected:
# - Lists agents that would be imported
# - No actual changes made
```

#### Test 4.2: Import All Agents
```bash
csgs import

# Expected:
# - Reading agents from disk...
# - Found X agent(s) to import
# - Importing to Copilot Studio...
# - ✓ Imported X/X agent(s) successfully
```

#### Test 4.3: Import Specific Agent
```bash
csgs import -a "Your Agent Name"

# Expected: Only specified agent imported
```

### 5. Sync Tests

#### Test 5.1: Bidirectional Sync
```bash
csgs sync

# Expected:
# - Export from Copilot Studio
# - Import local changes
# - Commit changes
```

#### Test 5.2: Export Only
```bash
csgs sync -d export

# Expected: Only export operation
```

#### Test 5.3: Import Only
```bash
csgs sync -d import

# Expected: Only import operation
```

### 6. Status Tests

#### Test 6.1: Check Status
```bash
csgs status

# Expected:
# - Git status (clean or changes)
# - List of changed files if any
```

### 7. Git Operations Tests

#### Test 7.1: Verify Git Repository
```bash
cd copilot-studio-agents
git log --oneline

# Expected: Commit history from exports
```

#### Test 7.2: Verify File Structure
```bash
tree copilot-studio-agents

# Expected structure:
# copilot-studio-agents/
# ├── manifest.json
# ├── README.md
# └── agents/
#     └── agent-name/
#         ├── agent.json
#         ├── topics/
#         │   └── topic-name.json
#         ├── entities/
#         │   └── entity-name.json
#         └── variables/
#             └── variables.json
```

## Edge Cases

### Test 8.1: Empty Environment
```bash
# Try to export from environment with no agents
csgs export

# Expected: "Exported 0 agent(s) successfully"
```

### Test 8.2: Invalid Configuration
```bash
# Delete or corrupt csgs.config.json
csgs export

# Expected: Error about missing configuration
```

### Test 8.3: Expired Token
```bash
# Wait for token to expire (or modify cache file)
csgs export

# Expected: "Token expired. Please run: csgs auth login"
```

### Test 8.4: Network Failure
```bash
# Disconnect from internet
csgs export

# Expected: Network error with retry suggestion
```

## Performance Tests

### Test 9.1: Large Agent Export
```bash
time csgs export

# Should complete in under 30 seconds for typical agents
```

### Test 9.2: Multiple Agent Export
```bash
time csgs export

# 10 agents should export in under 30 seconds
```

## Regression Tests

Run these after any code changes:

```bash
# Run all unit tests
npm test

# Run with coverage
npm run test:coverage
```

## Troubleshooting

### Common Issues

1. **"Not authenticated" error**
   - Run: `csgs auth login`
   - Check: `csgs auth status`

2. **"Configuration not found" error**
   - Run: `csgs init`
   - Verify: `cat csgs.config.json`

3. **API errors**
   - Verify environment URL is correct
   - Check you have admin permissions
   - Verify token hasn't expired

4. **Git errors**
   - Ensure Git is installed
   - Check write permissions to directory

### Debug Mode

Set environment variable for verbose logging:
```bash
DEBUG=csgs* csgs export
```

## Test Checklist

- [ ] Authentication (login, status, logout)
- [ ] Configuration initialization
- [ ] Export all agents
- [ ] Export specific agent
- [ ] Import dry run
- [ ] Import agents
- [ ] Sync bidirectional
- [ ] Status check
- [ ] Git operations (init, commit)
- [ ] Error handling
- [ ] Unit tests pass
