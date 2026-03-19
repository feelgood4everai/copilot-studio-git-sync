# Manual Test Guide

This document outlines manual testing procedures for Copilot Studio Git Sync.

## Prerequisites

- Node.js 18+
- A Microsoft Copilot Studio / Dynamics 365 environment
- Git installed
- Azure AD account with Power Platform access

## Test Environment Setup

### 1. Clone and Build

```bash
git clone https://github.com/feelgood4everai/copilot-studio-git-sync.git
cd copilot-studio-git-sync
npm install
npm run build
```

### 2. Create Test Directory

```bash
mkdir test-project
cd test-project
```

## Test Scenarios

### Test 1: Initialization

**Objective:** Verify `csgs init` works correctly

**Steps:**
1. Run `node ../dist/cli.js init`
2. Enter test environment URL: `https://testdev.crm.dynamics.com`
3. Enter valid Azure AD tenant ID
4. Verify `csgs.config.json` was created
5. Verify directory structure was created

**Expected Results:**
- Configuration file created with correct format
- Directory structure: agents/, topics/, entities/
- .gitignore file created

### Test 2: Authentication - Device Code

**Objective:** Verify device code authentication flow

**Steps:**
1. Run `node ../dist/cli.js auth login`
2. Note the device code displayed
3. Visit microsoft.com/devicelogin in browser
4. Enter the code
5. Complete Microsoft login
6. Return to CLI

**Expected Results:**
- Success message displayed
- Token cached in ~/.copilot-studio-git-sync/
- `auth status` shows authenticated

### Test 3: Authentication - Status Check

**Objective:** Verify auth status command

**Steps:**
1. Run `node ../dist/cli.js auth status`

**Expected Results:**
- Shows authenticated/unauthenticated status
- Shows username if authenticated
- Shows expiration time

### Test 4: Export - All Agents

**Objective:** Verify exporting all agents works

**Prerequisites:** Must be authenticated

**Steps:**
1. Run `node ../dist/cli.js export -o ./test-agents`

**Expected Results:**
- Creates test-agents/agents/ directory
- Each agent has agent.json
- Topics, entities, variables in subdirectories
- manifest.json created

### Test 5: Export - Specific Agent

**Objective:** Verify exporting single agent

**Steps:**
1. Run `node ../dist/cli.js export --agent "Test Bot" -o ./test-agents`

**Expected Results:**
- Only exports the specified agent
- Other agents not exported

### Test 6: Import - Dry Run

**Objective:** Verify dry run validation

**Steps:**
1. Run `node ../dist/cli.js import --dry-run -i ./test-agents`

**Expected Results:**
- Lists agents that would be imported
- No actual changes made to Copilot Studio

### Test 7: Git Integration

**Objective:** Verify Git operations

**Steps:**
1. Run `node ../dist/cli.js export -o ./test-agents --no-git`
2. cd test-agents
3. git init
4. git add .
5. git commit -m "Initial export"
6. Modify an agent topic file
7. Run `node ../../dist/cli.js export`
8. Check git status

**Expected Results:**
- Git repo initialized
- Changes detected after modification
- Commits created properly

### Test 8: Status Command

**Objective:** Verify status command

**Steps:**
1. Run `node ../dist/cli.js status -p ./test-agents`

**Expected Results:**
- Shows uncommitted changes
- Lists modified files
- Shows comparison with Copilot Studio (if implemented)

### Test 9: Sync - Export Direction

**Objective:** Verify sync export

**Steps:**
1. Run `node ../dist/cli.js sync --direction export -p ./test-agents`

**Expected Results:**
- Exports from Copilot Studio
- Commits to Git

### Test 10: Logout

**Objective:** Verify logout clears credentials

**Steps:**
1. Run `node ../dist/cli.js auth logout`
2. Run `node ../dist/cli.js export`

**Expected Results:**
- Logout succeeds
- Export fails with "Not authenticated" error

## Edge Case Testing

### Test 11: Invalid Environment URL

**Steps:**
1. Run init with invalid URL
2. Enter: `not-a-valid-url`

**Expected Results:**
- Validation error displayed
- Config not created

### Test 12: Empty Agent List

**Objective:** Handle no agents in environment

**Steps:**
1. Set up environment with no agents
2. Run export

**Expected Results:**
- Graceful handling
- Message: "No agents found"

### Test 13: Large Agent Export

**Objective:** Performance with many topics

**Steps:**
1. Create agent with 50+ topics
2. Run export with timing

**Expected Results:**
- Completes in reasonable time (< 30s)
- All topics exported correctly

### Test 14: Concurrent Operations

**Objective:** Handle multiple exports simultaneously

**Steps:**
1. Run export in two terminals
2. Observe behavior

**Expected Results:**
- No file corruption
- Proper error handling or success

## CI/CD Test

### Test 15: Service Principal Auth

**Objective:** Verify client credentials flow

**Steps:**
1. Set environment variables:
   ```
   export AZURE_CLIENT_ID="test-client-id"
   export AZURE_CLIENT_SECRET="test-secret"
   export AZURE_TENANT_ID="test-tenant"
   ```
2. Run `csgs auth login --method clientCredentials`

**Expected Results:**
- Authenticates without browser
- Token stored for API calls

## Cleanup

After all tests:

```bash
# Remove test directories
rm -rf test-project test-agents

# Remove cached credentials
rm -rf ~/.copilot-studio-git-sync

# Remove global installation (if tested)
npm uninstall -g copilot-studio-git-sync
```

## Reporting Issues

If any test fails:

1. Capture CLI output
2. Note environment details (Node version, OS)
3. Check for existing GitHub issues
4. Create new issue with:
   - Test case number
   - Steps to reproduce
   - Expected vs actual behavior
   - Error messages
