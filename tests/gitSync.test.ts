import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GitSync } from '../src/gitSync';
import { promises as fs } from 'fs';
import { join } from 'path';

const TEST_REPO_PATH = './test-repo';

describe('GitSync', () => {
  let gitSync: GitSync;

  beforeEach(async () => {
    // Clean up test directory
    try {
      await fs.rmdir(TEST_REPO_PATH, { recursive: true });
    } catch {
      // Directory doesn't exist
    }

    // Create test directory
    await fs.mkdir(TEST_REPO_PATH, { recursive: true });
    
    gitSync = new GitSync(TEST_REPO_PATH);
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rmdir(TEST_REPO_PATH, { recursive: true });
    } catch {
      // Directory doesn't exist
    }
  });

  describe('init', () => {
    it('should initialize a git repository', async () => {
      await gitSync.init();

      const isRepo = await gitSync.isRepo();
      expect(isRepo).toBe(true);
    });

    it('should create .gitignore file', async () => {
      await gitSync.init();

      const gitignorePath = join(TEST_REPO_PATH, '.gitignore');
      const content = await fs.readFile(gitignorePath, 'utf-8');
      
      expect(content).toContain('node_modules/');
      expect(content).toContain('dist/');
      expect(content).toContain('.env');
    });
  });

  describe('isRepo', () => {
    it('should return false for non-git directory', async () => {
      const isRepo = await gitSync.isRepo();
      expect(isRepo).toBe(false);
    });

    it('should return true for initialized repo', async () => {
      await gitSync.init();
      const isRepo = await gitSync.isRepo();
      expect(isRepo).toBe(true);
    });
  });

  describe('commitChanges', () => {
    it('should initialize repo if not already initialized', async () => {
      // Create a test file
      await fs.writeFile(join(TEST_REPO_PATH, 'test.txt'), 'test content');

      await gitSync.commitChanges('Initial commit');

      const isRepo = await gitSync.isRepo();
      expect(isRepo).toBe(true);
    });

    it('should commit changes', async () => {
      await gitSync.init();
      
      // Configure git user for commits
      const simpleGit = (await import('simple-git')).default;
      const git = simpleGit(TEST_REPO_PATH);
      await git.addConfig('user.email', 'test@example.com');
      await git.addConfig('user.name', 'Test User');
      
      // Create and commit a file
      await fs.writeFile(join(TEST_REPO_PATH, 'test.txt'), 'test content');
      await gitSync.commitChanges('Test commit');

      const latest = await gitSync.getLatestCommit();
      expect(latest).not.toBeNull();
      expect(latest?.message).toBe('Test commit');
    });

    it('should not commit when there are no changes', async () => {
      await gitSync.init();
      
      // Configure git user
      const simpleGit = (await import('simple-git')).default;
      const git = simpleGit(TEST_REPO_PATH);
      await git.addConfig('user.email', 'test@example.com');
      await git.addConfig('user.name', 'Test User');
      
      // Initial commit
      await fs.writeFile(join(TEST_REPO_PATH, 'test.txt'), 'test content');
      await gitSync.commitChanges('Initial commit');

      // Try to commit with no changes
      await gitSync.commitChanges('No changes commit');

      const latest = await gitSync.getLatestCommit();
      expect(latest?.message).toBe('Initial commit');
    });
  });

  describe('hasUncommittedChanges', () => {
    it('should return false for clean repo', async () => {
      await gitSync.init();
      const hasChanges = await gitSync.hasUncommittedChanges();
      expect(hasChanges).toBe(false);
    });

    it('should return true when there are uncommitted changes', async () => {
      await gitSync.init();
      
      await fs.writeFile(join(TEST_REPO_PATH, 'new-file.txt'), 'content');
      
      const hasChanges = await gitSync.hasUncommittedChanges();
      expect(hasChanges).toBe(true);
    });
  });

  describe('getChanges', () => {
    it('should return list of changes', async () => {
      await gitSync.init();
      
      await fs.writeFile(join(TEST_REPO_PATH, 'new-file.txt'), 'content');
      
      const changes = await gitSync.getChanges();
      
      expect(changes.length).toBeGreaterThan(0);
      expect(changes[0].file).toBe('new-file.txt');
    });
  });

  describe('getBranches', () => {
    it('should return list of branches', async () => {
      await gitSync.init();
      
      const branches = await gitSync.getBranches();
      
      expect(branches).toContain('main');
    });
  });

  describe('createBranch', () => {
    it('should create a new branch', async () => {
      await gitSync.init();
      
      // Configure git user and make initial commit
      const simpleGit = (await import('simple-git')).default;
      const git = simpleGit(TEST_REPO_PATH);
      await git.addConfig('user.email', 'test@example.com');
      await git.addConfig('user.name', 'Test User');
      await fs.writeFile(join(TEST_REPO_PATH, 'test.txt'), 'test');
      await git.add('.');
      await git.commit('Initial');
      
      await gitSync.createBranch('feature-branch');
      
      const branches = await gitSync.getBranches();
      expect(branches).toContain('feature-branch');
    });
  });
});
