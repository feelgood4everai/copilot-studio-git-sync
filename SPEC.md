# Copilot Studio Git Sync - Specification

## Problem Statement

Microsoft Copilot Studio is a powerful low-code platform for building AI agents and conversational bots. However, it has a critical gap: **no native Git version control support**.

Currently, developers must:
- Use complex Power Platform Solutions for version management
- Rely on manual exports/imports for backup
- Lack proper change tracking and code review workflows
- Cannot use standard CI/CD pipelines
- Struggle with team collaboration on agent development

## Solution

A CLI tool that bridges Copilot Studio and Git, enabling:
- Export agents/topics to version-controlled JSON files
- Track changes with proper Git history
- Sync changes back to Copilot Studio
- Integrate with existing DevOps workflows

## Features

### Core Features (v1.0.0)

1. **Export Agents**
   - Export all agents from a Copilot Studio environment
   - Export specific agents by ID or name
   - Preserve agent structure (topics, entities, variables)
   - Human-readable JSON format

2. **Import Agents**
   - Import agents from Git-managed JSON files
   - Create new agents or update existing ones
   - Validation before import
   - Dry-run mode for safety

3. **Git Integration**
   - Initialize Git repository for agents
   - Automatic change detection
   - Commit with descriptive messages
   - Branch support for parallel development

4. **Sync Operations**
   - Bidirectional sync (Studio ↔ Git)
   - Conflict detection and resolution hints
   - Incremental sync (only changed agents)

5. **Configuration Management**
   - Environment-specific configs
   - Multiple Copilot Studio environments
   - Secure credential storage

### Future Features (v1.x)

- Diff visualization between versions
- Rollback to previous versions
- Team collaboration features
- CI/CD pipeline templates
- Automated testing integration
- Topic-level granular exports

## Success Criteria

1. Developers can version control Copilot Studio agents in Git repositories
2. Changes can be tracked, reviewed, and reverted like regular code
3. Teams can collaborate using standard Git workflows (branches, PRs)
4. CI/CD pipelines can deploy agents automatically
5. Export/import operations complete in under 30 seconds for typical agents

## Technology Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.x
- **CLI Framework**: Commander.js
- **HTTP Client**: Axios
- **Authentication**: MSAL (Microsoft Authentication Library)
- **Git Operations**: Simple-git
- **Validation**: Zod
- **Testing**: Vitest

## Target Users

- Power Platform developers
- DevOps engineers
- Teams managing multiple Copilot Studio environments
- Organizations requiring compliance/audit trails

## Constraints

- Requires Power Platform admin access
- Subject to Copilot Studio API rate limits
- Some proprietary metadata may not be exportable
- Authentication requires Azure AD/Entra ID

## References

- [Power Platform CLI](https://docs.microsoft.com/en-us/power-platform/developer/cli/introduction)
- [Copilot Studio Documentation](https://docs.microsoft.com/en-us/microsoft-copilot-studio/)
- [Power Platform API](https://docs.microsoft.com/en-us/power-apps/developer/data-platform/webapi/overview)
