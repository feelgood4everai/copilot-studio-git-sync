import { promises as fs } from 'fs';
import { join } from 'path';
import inquirer from 'inquirer';
import { z } from 'zod';

const configSchema = z.object({
  environmentUrl: z.string().url(),
  tenantId: z.string().uuid(),
  clientId: z.string().optional(),
  outputDirectory: z.string().default('./copilot-studio-agents'),
});

export type Config = z.infer<typeof configSchema>;

const CONFIG_FILE = 'csgs.config.json';

export class ConfigManager {
  async initialize(options: { env?: string; tenant?: string }): Promise<void> {
    const questions = [];

    if (!options.env) {
      questions.push({
        type: 'input',
        name: 'environmentUrl',
        message: 'Power Platform Environment URL:',
        validate: (input: string) => {
          if (!input) return 'Environment URL is required';
          if (!input.includes('.crm.dynamics.com')) {
            return 'URL should contain .crm.dynamics.com';
          }
          return true;
        },
      });
    }

    if (!options.tenant) {
      questions.push({
        type: 'input',
        name: 'tenantId',
        message: 'Azure AD Tenant ID:',
        validate: (input: string) => {
          if (!input) return 'Tenant ID is required';
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(input)) return 'Invalid UUID format';
          return true;
        },
      });
    }

    questions.push({
      type: 'input',
      name: 'outputDirectory',
      message: 'Output directory for agents:',
      default: './copilot-studio-agents',
    });

    const answers = await inquirer.prompt(questions);

    const config: Config = {
      environmentUrl: options.env || answers.environmentUrl,
      tenantId: options.tenant || answers.tenantId,
      outputDirectory: answers.outputDirectory,
    };

    // Validate
    configSchema.parse(config);

    // Write config file
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));

    // Create output directory
    await fs.mkdir(config.outputDirectory, { recursive: true });

    // Create .gitignore
    const gitignorePath = join(config.outputDirectory, '.gitignore');
    try {
      await fs.access(gitignorePath);
    } catch {
      await fs.writeFile(
        gitignorePath,
        `# Copilot Studio Git Sync\n# Add files you don't want to version control\n\n# Local config\ncsgs.local.json\n\n# Logs\n*.log\n`
      );
    }

    // Create README template
    const readmePath = join(config.outputDirectory, 'README.md');
    try {
      await fs.access(readmePath);
    } catch {
      await fs.writeFile(
        readmePath,
        `# Copilot Studio Agents\n\nThis repository contains version-controlled Microsoft Copilot Studio agents.\n\n## Structure\n\n- \`agents/\` - Individual agent definitions\n- Each agent contains topics, entities, and variables\n\n## Sync Commands\n\n\`\`\`bash\n# Export from Copilot Studio\ncsgs export\n\n# Import to Copilot Studio\ncsgs import\n\n# Full sync\ncsgs sync\n\`\`\`\n`
      );
    }
  }

  async load(): Promise<Config> {
    try {
      const data = await fs.readFile(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      return configSchema.parse(parsed);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`Configuration not found. Run 'csgs init' first.`);
      }
      throw error;
    }
  }

  async save(config: Config): Promise<void> {
    configSchema.parse(config);
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
  }
}
