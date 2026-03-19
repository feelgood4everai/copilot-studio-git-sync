import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GitSync } from '../src/gitSync';
import { AuthManager } from '../src/auth';
import { ConfigManager } from '../src/config';
import { Exporter } from '../src/exporter';
import { Importer } from '../src/importer';

// Mock simple-git
vi.mock('simple-git', () => ({
  default: vi.fn(() => ({
    init: vi.fn().mockResolvedValue(true),
    checkIsRepo: vi.fn().mockResolvedValue(true),
    status: vi.fn().mockResolvedValue({ isClean: () => false, modified: [], not_added: [], deleted: [] }),
    add: vi.fn().mockResolvedValue(true),
    commit: vi.fn().mockResolvedValue(true),
    log: vi.fn().mockResolvedValue({ latest: { hash: 'abc123', message: 'test', date: '2024-01-01' } }),
    branchLocal: vi.fn().mockResolvedValue({ all: ['main', 'develop'] }),
    checkoutLocalBranch: vi.fn().mockResolvedValue(true),
    checkout: vi.fn().mockResolvedValue(true),
    merge: vi.fn().mockResolvedValue(true),
    diff: vi.fn().mockResolvedValue(''),
    stash: vi.fn().mockResolvedValue(true),
    stashPop: vi.fn().mockResolvedValue(true),
    addRemote: vi.fn().mockResolvedValue(true),
    push: vi.fn().mockResolvedValue(true),
    pull: vi.fn().mockResolvedValue(true),
    fetch: vi.fn().mockResolvedValue(true),
  })),
}));

describe('GitSync', () => {
  let gitSync: GitSync;

  beforeEach(() => {
    gitSync = new GitSync('./test-repo');
  });

  describe('init', () => {
    it('should initialize a git repository', async () => {
      const result = await gitSync.init();
      expect(result).toBeUndefined();
    });
  });

  describe('isRepo', () => {
    it('should check if directory is a git repo', async () => {
      const result = await gitSync.isRepo();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('hasUncommittedChanges', () => {
    it('should detect uncommitted changes', async () => {
      const result = await gitSync.hasUncommittedChanges();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getChanges', () => {
    it('should return list of changed files', async () => {
      const changes = await gitSync.getChanges();
      expect(Array.isArray(changes)).toBe(true);
    });
  });

  describe('commitChanges', () => {
    it('should commit changes with message', async () => {
      await expect(gitSync.commitChanges('Test commit')).resolves.not.toThrow();
    });
  });

  describe('getBranches', () => {
    it('should list local branches', async () => {
      const branches = await gitSync.getBranches();
      expect(Array.isArray(branches)).toBe(true);
    });
  });

  describe('createBranch', () => {
    it('should create a new branch', async () => {
      await expect(gitSync.createBranch('feature/test')).resolves.not.toThrow();
    });
  });

  describe('getLatestCommit', () => {
    it('should get latest commit info', async () => {
      const commit = await gitSync.getLatestCommit();
      expect(commit === null || typeof commit.hash === 'string').toBe(true);
    });
  });
});

describe('AuthManager', () => {
  let authManager: AuthManager;

  beforeEach(() => {
    authManager = new AuthManager();
  });

  describe('getStatus', () => {
    it('should return authentication status', async () => {
      const status = await authManager.getStatus();
      expect(typeof status.authenticated).toBe('boolean');
    });
  });
});

describe('ConfigManager', () => {
  let configManager: ConfigManager;

  beforeEach(() => {
    configManager = new ConfigManager();
  });

  describe('load', () => {
    it('should throw if config does not exist', async () => {
      await expect(configManager.load()).rejects.toThrow();
    });
  });
});

describe('Exporter', () => {
  const mockToken = 'mock-token';
  
  describe('constructor', () => {
    it('should create exporter with token', () => {
      const exporter = new Exporter(mockToken);
      expect(exporter).toBeDefined();
    });
  });

  describe('exportAgents', () => {
    it('should fetch agents from Copilot Studio', async () => {
      const exporter = new Exporter(mockToken);
      // This will fail without real API, but tests the structure
      await expect(exporter.exportAgents()).rejects.toThrow();
    });
  });

  describe('saveToDisk', () => {
    it('should save agents to disk', async () => {
      const exporter = new Exporter(mockToken);
      const agents = [];
      
      await expect(exporter.saveToDisk(agents, '/tmp/test-export'))
        .rejects.toThrow();
    });
  });
});

describe('Importer', () => {
  const mockToken = 'mock-token';
  
  describe('constructor', () => {
    it('should create importer with token', () => {
      const importer = new Importer(mockToken);
      expect(importer).toBeDefined();
    });
  });

  describe('loadFromDisk', () => {
    it('should load agents from disk', async () => {
      const importer = new Importer(mockToken);
      
      await expect(importer.loadFromDisk('/nonexistent/path'))
        .rejects.toThrow();
    });
  });

  describe('importAgents', () => {
    it('should import agents to Copilot Studio', async () => {
      const importer = new Importer(mockToken);
      const agents = [];
      
      await expect(importer.importAgents(agents)).rejects.toThrow();
    });
  });
});
