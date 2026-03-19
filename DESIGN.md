# Copilot Studio Git Sync - Design Document

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Git Repository │────▶│  Copilot Studio  │────▶│   Git Repository │
│   (Source of     │◄────│   Git Sync CLI   │◄────│   (Backup/       │
│    Truth)        │     │                  │     │    Versioning)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │  Power Platform  │
                        │   APIs / Dataverse│
                        └──────────────────┘
```

## Components

### 1. CLI Layer (`src/cli.ts`)
Entry point for all user interactions. Uses Commander.js for:
- Command parsing and validation
- Help documentation
- Global options (--env, --verbose, etc.)

Commands:
- `init` - Initialize configuration
- `export` - Export agents to Git
- `import` - Import agents from Git
- `sync` - Bidirectional sync
- `status` - Show changes between Git and Studio
- `auth` - Authentication management

### 2. Exporter (`src/exporter.ts`)
Handles all export operations from Copilot Studio:
- Fetch agent definitions via Power Platform API
- Normalize data structure
- Write to filesystem in organized structure

### 3. Importer (`src/importer.ts`)
Handles all import operations to Copilot Studio:
- Read agent definitions from filesystem
- Validate structure and dependencies
- Create/update via Power Platform API

### 4. Git Sync (`src/gitSync.ts`)
Manages Git operations:
- Repository initialization
- Change detection
- Commit operations
- Branch management

### 5. Auth Manager (`src/auth.ts`)
Handles Power Platform authentication:
- MSAL integration
- Token caching
- Multi-environment support

## Data Flow

### Export Flow
```
1. CLI receives export command
2. Auth manager validates/gets token
3. Exporter fetches agent list from Copilot Studio
4. For each agent:
   a. Fetch agent metadata
   b. Fetch topics
   c. Fetch entities
   d. Fetch variables
5. Normalize to standard JSON structure
6. Write to filesystem:
   agents/{agent-name}/
   ├── agent.json
   ├── topics/
   │   ├── topic-1.json
   │   └── topic-2.json
   └── entities/
       └── entity-1.json
7. GitSync detects changes
8. Commit with message "Export: {agent-name} v{version}"
```

### Import Flow
```
1. CLI receives import command
2. Read agent definitions from filesystem
3. Validate JSON structure
4. Auth manager validates/gets token
5. For each agent:
   a. Check if exists in Copilot Studio
   b. If exists: update via PATCH
   c. If new: create via POST
6. Report results
```

## Authentication Strategy

### Method: MSAL (Microsoft Authentication Library)

Power Platform uses Azure AD/Entra ID for authentication.

**Auth Flow:**
1. Device Code Flow (for CLI scenarios)
   - User runs `csgs auth login`
   - CLI requests device code from Azure AD
   - User visits microsoft.com/devicelogin and enters code
   - CLI polls for token
   - Token cached locally

2. Client Credentials (for CI/CD)
   - Service Principal authentication
   - Client ID + Client Secret
   - Non-interactive

**Token Storage:**
- OS-specific secure storage (keychain/keyring)
- Encrypted cache file as fallback
- Environment variable override support

**Configuration:**
```json
{
  "auth": {
    "method": "deviceCode",
    "tenantId": "your-tenant-id",
    "clientId": "your-app-registration-id",
    "environmentUrl": "https://your-env.crm.dynamics.com"
  }
}
```

## File Structure for Git Storage

```
.copilot-studio-git-sync/
├── config.json              # CLI configuration
└── cache/
    └── token-cache.json     # Cached auth tokens (encrypted)

copilot-studio-agents/
├── .gitignore
├── README.md
├── csgs.config.json         # Project-specific config
└── agents/
    ├── agent-one/
    │   ├── agent.json       # Agent metadata
    │   ├── topics/
    │   │   ├── greeting.json
    │   │   ├── fallback.json
    │   │   └── main-menu.json
    │   ├── entities/
    │   │   ├── color.json
    │   │   └── size.json
    │   └── variables/
    │       └── session-vars.json
    └── agent-two/
        └── ...
```

### agent.json Schema
```json
{
  "id": "uuid",
  "name": "Agent One",
  "description": "Customer service bot",
  "locale": "en-US",
  "published": false,
  "schemaVersion": "1.0",
  "exportedAt": "2026-03-19T08:51:00Z",
  "topics": [
    {"id": "uuid", "name": "Greeting", "file": "topics/greeting.json"}
  ],
  "entities": [
    {"id": "uuid", "name": "Color", "file": "entities/color.json"}
  ]
}
```

### topic.json Schema
```json
{
  "id": "uuid",
  "name": "Greeting",
  "displayName": "Greeting",
  "description": "Welcomes the user",
  "triggerChannel": "msbot",
  "isSystemTopic": false,
  "nodes": [...],
  "createdAt": "2026-01-15T10:00:00Z",
  "modifiedAt": "2026-03-18T14:30:00Z"
}
```

## API Integration

### Power Platform API Endpoints

Base URL: `https://{environment}.api.crm.dynamics.com/api/data/v9.2/`

**Key Entities:**
- `botcomponents` - Agents/bots
- `topics` - Conversation topics
- `entities` - Custom entities
- `variables` - Bot variables

**Sample API Call:**
```typescript
const response = await axios.get(
  `${baseUrl}/botcomponents`,
  {
    headers: {
      'Authorization': `Bearer ${token}`,
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0'
    }
  }
);
```

## Error Handling

### Retry Strategy
- Exponential backoff for rate limits (429)
- Max 3 retries for transient errors
- Immediate failure for auth errors (401/403)

### Error Categories
1. **Auth Errors** → Prompt re-authentication
2. **Network Errors** → Retry with backoff
3. **Validation Errors** → Detailed message with fix hints
4. **Not Found** → Clear missing resource identification
5. **Conflict** → Suggest merge/resolution steps

## Security Considerations

1. **Token Storage**: Use OS keychain where available
2. **Config Files**: Mark sensitive fields in .gitignore templates
3. **Logging**: Never log tokens or secrets
4. **Permissions**: Minimal required scopes only

## Performance Targets

- Export single agent: < 5 seconds
- Export 10 agents: < 30 seconds
- Import single agent: < 3 seconds
- Git operations: < 1 second
- Full sync (export + commit): < 60 seconds

## Extensibility Points

1. **Plugin Architecture**: Support custom transformers
2. **Hooks**: Pre/post export/import scripts
3. **Custom Exporters**: Alternative output formats
4. **Validation Rules**: Custom schema validation
