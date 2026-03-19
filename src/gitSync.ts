import simpleGit, { SimpleGit, StatusResult } from 'simple-git';
import { promises as fs } from 'fs';
import { join } from 'path';

interface ChangeInfo {
  file: string;
  status: string;
}

export class GitSync {
  private git: SimpleGit;
  private repoPath: string;

  constructor(repoPath: string = '.') {
    this.repoPath = repoPath;
    this.git = simpleGit(repoPath);
  }

  async init(): Promise<void> {
    try {
      await this.git.init();
      
      // Create .gitignore if it doesn't exist
      const gitignorePath = join(this.repoPath, '.gitignore');
      try {
        await fs.access(gitignorePath);
      } catch {
        await fs.writeFile(
          gitignorePath,
          `# Dependencies\nnode_modules/\n\n# Build outputs\ndist/\n\n# IDE\n.vscode/\n.idea/\n\n# OS\n.DS_Store\n\n# Logs\n*.log\nnpm-debug.log*\n\n# Environment\n.env\n.env.local\n.env.*.local\n\n# Copilot Studio Git Sync\n.csgs-cache/\n*.token\n`
        );
      }
      
      console.log('Git repository initialized');
    } catch (error) {
      throw new Error(`Failed to initialize Git: ${error instanceof Error ? error.message : error}`);
    }
  }

  async isRepo(): Promise<boolean> {
    try {
      return await this.git.checkIsRepo();
    } catch {
      return false;
    }
  }

  async hasUncommittedChanges(): Promise<boolean> {
    const status = await this.git.status();
    return !status.isClean();
  }

  async getChanges(): Promise<ChangeInfo[]> {
    const status = await this.git.status();
    const changes: ChangeInfo[] = [];

    for (const file of status.modified) {
      changes.push({ file, status: 'modified' });
    }

    for (const file of status.not_added) {
      changes.push({ file, status: 'untracked' });
    }

    for (const file of status.deleted) {
      changes.push({ file, status: 'deleted' });
    }

    return changes;
  }

  async commitChanges(message: string): Promise<void> {
    const isRepo = await this.isRepo();
    
    if (!isRepo) {
      await this.init();
    }

    const status = await this.git.status();
    
    if (status.isClean()) {
      console.log('No changes to commit');
      return;
    }

    // Add all changes
    await this.git.add('.');
    
    // Commit with message
    await this.git.commit(message);
    
    console.log(`Committed: ${message}`);
  }

  async getLatestCommit(): Promise<{ hash: string; message: string; date: string } | null> {
    try {
      const log = await this.git.log({ maxCount: 1 });
      if (!log.latest) return null;
      
      return {
        hash: log.latest.hash,
        message: log.latest.message,
        date: log.latest.date,
      };
    } catch {
      return null;
    }
  }

  async getBranches(): Promise<string[]> {
    try {
      const branches = await this.git.branchLocal();
      return branches.all;
    } catch {
      return [];
    }
  }

  async createBranch(branchName: string): Promise<void> {
    await this.git.checkoutLocalBranch(branchName);
  }

  async switchBranch(branchName: string): Promise<void> {
    await this.git.checkout(branchName);
  }

  async mergeBranch(branchName: string): Promise<void> {
    await this.git.merge([branchName]);
  }

  async getDiff(branch?: string): Promise<string> {
    if (branch) {
      return await this.git.diff([branch]);
    }
    return await this.git.diff();
  }

  async stash(): Promise<void> {
    await this.git.stash();
  }

  async stashPop(): Promise<void> {
    await this.git.stash(['pop']);
  }

  async addRemote(name: string, url: string): Promise<void> {
    await this.git.addRemote(name, url);
  }

  async push(remote: string = 'origin', branch: string = 'main'): Promise<void> {
    await this.git.push(remote, branch);
  }

  async pull(remote: string = 'origin', branch: string = 'main'): Promise<void> {
    await this.git.pull(remote, branch);
  }

  async fetch(remote: string = 'origin'): Promise<void> {
    await this.git.fetch(remote);
  }
}
