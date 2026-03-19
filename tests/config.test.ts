import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConfigManager } from '../src/config';
import { promises as fs } from 'fs';
import { join } from 'path';

const TEST_CONFIG_FILE = 'csgs.config.json';

describe('ConfigManager', () => {
  let configManager: ConfigManager;

  beforeEach(async () => {
    configManager = new ConfigManager();
    
    // Clean up any existing config file
    try {
      await fs.unlink(TEST_CONFIG_FILE);
    } catch {
      // File doesn't exist
    }
  });

  afterEach(async () => {
    // Clean up config file
    try {
      await fs.unlink(TEST_CONFIG_FILE);
    } catch {
      // File doesn't exist
    }
    
    // Clean up test directories
    try {
      await fs.rmdir('./copilot-studio-agents', { recursive: true });
    } catch {
      // Directory doesn't exist
    }
  });

  describe('load', () => {
    it('should throw error when config file does not exist', async () => {
      await expect(configManager.load()).rejects.toThrow('Configuration not found');
    });

    it('should load valid config file', async () => {
      const config = {
        environmentUrl: 'https://test.crm.dynamics.com',
        tenantId: '12345678-1234-1234-1234-123456789012',
        outputDirectory: './test-agents',
      };

      await fs.writeFile(TEST_CONFIG_FILE, JSON.stringify(config));

      const loaded = await configManager.load();
      
      expect(loaded.environmentUrl).toBe(config.environmentUrl);
      expect(loaded.tenantId).toBe(config.tenantId);
      expect(loaded.outputDirectory).toBe(config.outputDirectory);
    });

    it('should throw error for invalid config', async () => {
      const invalidConfig = {
        environmentUrl: 'not-a-url',
        tenantId: 'not-a-uuid',
      };

      await fs.writeFile(TEST_CONFIG_FILE, JSON.stringify(invalidConfig));

      await expect(configManager.load()).rejects.toThrow();
    });
  });

  describe('save', () => {
    it('should save valid config to file', async () => {
      const config = {
        environmentUrl: 'https://test.crm.dynamics.com',
        tenantId: '12345678-1234-1234-1234-123456789012',
        outputDirectory: './test-agents',
      };

      await configManager.save(config);

      const data = await fs.readFile(TEST_CONFIG_FILE, 'utf-8');
      const saved = JSON.parse(data);
      
      expect(saved).toEqual(config);
    });

    it('should throw error for invalid config', async () => {
      const invalidConfig = {
        environmentUrl: 'not-a-url',
        tenantId: '12345678-1234-1234-1234-123456789012',
      };

      await expect(configManager.save(invalidConfig as any)).rejects.toThrow();
    });
  });

  describe('initialize', () => {
    it('should create config with provided options', async () => {
      const options = {
        env: 'https://test.crm.dynamics.com',
        tenant: '12345678-1234-1234-1234-123456789012',
      };

      // Mock inquirer
      vi.mock('inquirer', () => ({
        default: {
          prompt: vi.fn().mockResolvedValue({
            outputDirectory: './test-agents',
          }),
        },
      }));

      await configManager.initialize(options);

      const loaded = await configManager.load();
      expect(loaded.environmentUrl).toBe(options.env);
      expect(loaded.tenantId).toBe(options.tenant);
    });
  });
});
