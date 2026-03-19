import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthManager } from '../src/auth';
import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CONFIG_DIR = join(homedir(), '.copilot-studio-git-sync-test');
const TOKEN_CACHE_FILE = join(CONFIG_DIR, 'token-cache.json');

describe('AuthManager', () => {
  let authManager: AuthManager;

  beforeEach(async () => {
    // Mock the config directory
    vi.mock('os', () => ({
      homedir: () => CONFIG_DIR,
    }));
    
    authManager = new AuthManager();
    
    // Clean up any existing test files
    try {
      await fs.unlink(TOKEN_CACHE_FILE);
    } catch {
      // File doesn't exist
    }
  });

  afterEach(async () => {
    // Clean up test files
    try {
      await fs.rmdir(CONFIG_DIR, { recursive: true });
    } catch {
      // Directory doesn't exist
    }
  });

  describe('getStatus', () => {
    it('should return not authenticated when no token exists', async () => {
      const status = await authManager.getStatus();
      
      expect(status.authenticated).toBe(false);
    });

    it('should return authenticated when valid token exists', async () => {
      // Create a mock token cache
      await fs.mkdir(CONFIG_DIR, { recursive: true });
      const futureDate = new Date(Date.now() + 3600 * 1000).toISOString();
      await fs.writeFile(
        TOKEN_CACHE_FILE,
        JSON.stringify({
          accessToken: 'test-token',
          expiresOn: futureDate,
          username: 'test@example.com',
        })
      );

      const status = await authManager.getStatus();
      
      expect(status.authenticated).toBe(true);
      expect(status.username).toBe('test@example.com');
      expect(status.expiresOn).toBe(futureDate);
    });

    it('should return not authenticated when token is expired', async () => {
      // Create an expired token cache
      await fs.mkdir(CONFIG_DIR, { recursive: true });
      const pastDate = new Date(Date.now() - 3600 * 1000).toISOString();
      await fs.writeFile(
        TOKEN_CACHE_FILE,
        JSON.stringify({
          accessToken: 'test-token',
          expiresOn: pastDate,
          username: 'test@example.com',
        })
      );

      const status = await authManager.getStatus();
      
      expect(status.authenticated).toBe(false);
    });
  });

  describe('logout', () => {
    it('should remove token cache file', async () => {
      // Create a token cache file
      await fs.mkdir(CONFIG_DIR, { recursive: true });
      await fs.writeFile(
        TOKEN_CACHE_FILE,
        JSON.stringify({
          accessToken: 'test-token',
          expiresOn: new Date().toISOString(),
        })
      );

      await authManager.logout();

      // Verify file is deleted
      await expect(fs.access(TOKEN_CACHE_FILE)).rejects.toThrow();
    });

    it('should not throw if token cache does not exist', async () => {
      await expect(authManager.logout()).resolves.not.toThrow();
    });
  });

  describe('getToken', () => {
    it('should throw error when not authenticated', async () => {
      await expect(authManager.getToken()).rejects.toThrow('Not authenticated');
    });

    it('should throw error when token is expired', async () => {
      // Create an expired token cache
      await fs.mkdir(CONFIG_DIR, { recursive: true });
      const pastDate = new Date(Date.now() - 3600 * 1000).toISOString();
      await fs.writeFile(
        TOKEN_CACHE_FILE,
        JSON.stringify({
          accessToken: 'test-token',
          expiresOn: pastDate,
        })
      );

      await expect(authManager.getToken()).rejects.toThrow('Token expired');
    });
  });
});
