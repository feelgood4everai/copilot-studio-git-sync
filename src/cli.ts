#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { Exporter } from './exporter';
import { Importer } from './importer';
import { GitSync } from './gitSync';
import { AuthManager } from './auth';
import { ConfigManager } from './config';
import { readFileSync } from 'fs';
import { join } from 'path';

const packageJson = JSON.parse(
  readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')
);

const program = new Command();

program
  .name('csgs')
  .description('Copilot Studio Git Sync - Version control for Microsoft Copilot Studio agents')
  .version(packageJson.version);

// Init command
program
  .command('init')
  .description('Initialize configuration for this project')
  .option('-e, --env <environment>', 'Power Platform environment URL')
  .option('-t, --tenant <tenantId>', 'Azure AD Tenant ID')
  .action(async (options) => {
    try {
      const config = new ConfigManager();
      await config.initialize(options);
      console.log(chalk.green('✓ Configuration initialized successfully'));
    } catch (error) {
      console.error(chalk.red('Error initializing:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Auth command
const auth = program.command('auth').description('Authentication management');

auth
  .command('login')
  .description('Authenticate with Power Platform')
  .option('-m, --method <method>', 'Authentication method (deviceCode|clientCredentials)', 'deviceCode')
  .action(async (options) => {
    try {
      const authManager = new AuthManager();
      await authManager.login(options.method);
      console.log(chalk.green('✓ Authentication successful'));
    } catch (error) {
      console.error(chalk.red('Authentication failed:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

auth
  .command('logout')
  .description('Clear stored credentials')
  .action(async () => {
    try {
      const authManager = new AuthManager();
      await authManager.logout();
      console.log(chalk.green('✓ Logged out successfully'));
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

auth
  .command('status')
  .description('Check authentication status')
  .action(async () => {
    try {
      const authManager = new AuthManager();
      const status = await authManager.getStatus();
      if (status.authenticated) {
        console.log(chalk.green('✓ Authenticated'));
        console.log(chalk.gray(`  User: ${status.username || 'Unknown'}`));
        console.log(chalk.gray(`  Expires: ${status.expiresOn || 'Unknown'}`));
      } else {
        console.log(chalk.yellow('✗ Not authenticated'));
        console.log(chalk.gray('  Run: csgs auth login'));
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Export command
program
  .command('export')
  .description('Export agents from Copilot Studio to Git')
  .option('-a, --agent <name>', 'Export specific agent by name')
  .option('-o, --output <path>', 'Output directory', './copilot-studio-agents')
  .option('--no-git', 'Skip Git operations')
  .option('-m, --message <message>', 'Commit message')
  .action(async (options) => {
    try {
      const authManager = new AuthManager();
      const token = await authManager.getToken();
      
      const exporter = new Exporter(token);
      const gitSync = new GitSync(options.output);
      
      console.log(chalk.blue('Exporting agents from Copilot Studio...'));
      const exportedAgents = await exporter.exportAgents(options.agent);
      
      console.log(chalk.blue(`Writing to ${options.output}...`));
      await exporter.saveToDisk(exportedAgents, options.output);
      
      if (options.git !== false) {
        console.log(chalk.blue('Committing to Git...'));
        await gitSync.commitChanges(options.message || `Export: ${exportedAgents.length} agent(s)`);
      }
      
      console.log(chalk.green(`✓ Exported ${exportedAgents.length} agent(s) successfully`));
    } catch (error) {
      console.error(chalk.red('Export failed:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Import command
program
  .command('import')
  .description('Import agents from Git to Copilot Studio')
  .option('-a, --agent <name>', 'Import specific agent by name')
  .option('-i, --input <path>', 'Input directory', './copilot-studio-agents')
  .option('--dry-run', 'Validate without making changes')
  .action(async (options) => {
    try {
      const authManager = new AuthManager();
      const token = await authManager.getToken();
      
      const importer = new Importer(token);
      
      console.log(chalk.blue('Reading agents from disk...'));
      const agents = await importer.loadFromDisk(options.input, options.agent);
      
      console.log(chalk.blue(`Found ${agents.length} agent(s) to import`));
      
      if (options.dryRun) {
        console.log(chalk.yellow('Dry run mode - no changes will be made'));
        for (const agent of agents) {
          console.log(chalk.gray(`  Would import: ${agent.name}`));
        }
        return;
      }
      
      console.log(chalk.blue('Importing to Copilot Studio...'));
      const results = await importer.importAgents(agents);
      
      const successCount = results.filter(r => r.success).length;
      console.log(chalk.green(`✓ Imported ${successCount}/${results.length} agent(s) successfully`));
      
      const failures = results.filter(r => !r.success);
      if (failures.length > 0) {
        console.log(chalk.red('\nFailures:'));
        for (const failure of failures) {
          console.log(chalk.red(`  - ${failure.agentName}: ${failure.error}`));
        }
      }
    } catch (error) {
      console.error(chalk.red('Import failed:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Sync command
program
  .command('sync')
  .description('Bidirectional sync between Copilot Studio and Git')
  .option('-d, --direction <direction>', 'Sync direction (export|import|both)', 'both')
  .option('--path <path>', 'Working directory', './copilot-studio-agents')
  .action(async (options) => {
    try {
      const authManager = new AuthManager();
      const token = await authManager.getToken();
      
      const exporter = new Exporter(token);
      const importer = new Importer(token);
      const gitSync = new GitSync(options.path);
      
      if (options.direction === 'export' || options.direction === 'both') {
        console.log(chalk.blue('Exporting from Copilot Studio...'));
        const agents = await exporter.exportAgents();
        await exporter.saveToDisk(agents, options.path);
        await gitSync.commitChanges(`Sync export: ${agents.length} agent(s)`);
      }
      
      if (options.direction === 'import' || options.direction === 'both') {
        console.log(chalk.blue('Checking for local changes to import...'));
        const hasChanges = await gitSync.hasUncommittedChanges();
        if (hasChanges) {
          const agents = await importer.loadFromDisk(options.path);
          await importer.importAgents(agents);
        } else {
          console.log(chalk.gray('No changes to import'));
        }
      }
      
      console.log(chalk.green('✓ Sync completed'));
    } catch (error) {
      console.error(chalk.red('Sync failed:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Status command
program
  .command('status')
  .description('Show status of Git vs Copilot Studio')
  .option('--path <path>', 'Working directory', './copilot-studio-agents')
  .action(async (options) => {
    try {
      const gitSync = new GitSync(options.path);
      const hasChanges = await gitSync.hasUncommittedChanges();
      
      console.log(chalk.blue('Git Status:'));
      if (hasChanges) {
        console.log(chalk.yellow('  Uncommitted changes detected'));
        const changes = await gitSync.getChanges();
        for (const change of changes) {
          console.log(chalk.gray(`    ${change.status}: ${change.file}`));
        }
      } else {
        console.log(chalk.green('  Working directory clean'));
      }
      
      // TODO: Compare with Copilot Studio state
      console.log(chalk.blue('\nCopilot Studio Status:'));
      console.log(chalk.gray('  (Comparison not yet implemented)'));
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Parse arguments
program.parse();

// Show help if no command
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
