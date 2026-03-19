import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Importer } from '../src/importer';
import { promises as fs } from 'fs';
import { join } from 'path';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
    })),
  },
}));

const TEST_INPUT_PATH = './test-import-input';

describe('Importer', () => {
  let importer: Importer;
  let mockClient: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    importer = new Importer('test-token');
    
    // Get reference to mocked client
    const axios = await import('axios');
    mockClient = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
    };
    (axios.default.create as any).mockReturnValue(mockClient);
    
    // Re-create importer to use mocked client
    importer = new Importer('test-token');
  });

  describe('loadFromDisk', () => {
    it('should throw error when agents directory does not exist', async () => {
      await expect(importer.loadFromDisk('/nonexistent')).rejects.toThrow('Agents directory not found');
    });

    it('should load agents from disk', async () => {
      // Create test directory structure
      const agentDir = join(TEST_INPUT_PATH, 'agents', 'test-agent');
      await fs.mkdir(agentDir, { recursive: true });
      await fs.mkdir(join(agentDir, 'topics'), { recursive: true });
      await fs.mkdir(join(agentDir, 'entities'), { recursive: true });

      const agentManifest = {
        id: 'agent-1',
        name: 'Test Agent',
        description: 'Test',
        locale: 'en-US',
        published: true,
        topics: [{ id: 'topic-1', name: 'Greeting', file: 'topics/greeting.json' }],
        entities: [],
        variables: [],
      };

      const topic = {
        id: 'topic-1',
        name: 'Greeting',
        displayName: 'Greeting',
        nodes: [{ type: 'message' }],
      };

      await fs.writeFile(join(agentDir, 'agent.json'), JSON.stringify(agentManifest));
      await fs.writeFile(join(agentDir, 'topics', 'greeting.json'), JSON.stringify(topic));

      const agents = await importer.loadFromDisk(TEST_INPUT_PATH);

      expect(agents).toHaveLength(1);
      expect(agents[0].name).toBe('Test Agent');
      expect(agents[0].topics).toHaveLength(1);
      expect(agents[0].topics[0].name).toBe('Greeting');

      // Clean up
      await fs.rmdir(TEST_INPUT_PATH, { recursive: true });
    });

    it('should filter agents by name when specified', async () => {
      // Create test directory structure with two agents
      const agentsDir = join(TEST_INPUT_PATH, 'agents');
      
      for (const name of ['Agent One', 'Agent Two']) {
        const agentDir = join(agentsDir, name.toLowerCase().replace(' ', '-'));
        await fs.mkdir(agentDir, { recursive: true });
        
        const manifest = {
          id: `agent-${name}`,
          name,
          topics: [],
          entities: [],
        };
        
        await fs.writeFile(join(agentDir, 'agent.json'), JSON.stringify(manifest));
      }

      const agents = await importer.loadFromDisk(TEST_INPUT_PATH, 'Agent One');

      expect(agents).toHaveLength(1);
      expect(agents[0].name).toBe('Agent One');

      // Clean up
      await fs.rmdir(TEST_INPUT_PATH, { recursive: true });
    });
  });

  describe('importAgents', () => {
    it('should create new agent when it does not exist', async () => {
      // Mock agent not found
      mockClient.get.mockRejectedValue(new Error('Not found'));
      mockClient.post.mockResolvedValue({});
      mockClient.patch.mockResolvedValue({});

      const agents = [
        {
          id: 'agent-1',
          name: 'Test Agent',
          description: 'Test',
          locale: 'en-US',
          published: true,
          topics: [],
          entities: [],
        },
      ];

      const results = await importer.importAgents(agents);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].created).toBe(true);
    });

    it('should update existing agent when it exists', async () => {
      // Mock agent exists
      mockClient.get.mockResolvedValue({ data: { botcomponentid: 'agent-1' } });
      mockClient.patch.mockResolvedValue({});

      const agents = [
        {
          id: 'agent-1',
          name: 'Test Agent',
          description: 'Test',
          locale: 'en-US',
          published: true,
          topics: [],
          entities: [],
        },
      ];

      const results = await importer.importAgents(agents);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].updated).toBe(true);
    });

    it('should report failures for failed imports', async () => {
      // Mock agent check throws error
      mockClient.get.mockRejectedValue(new Error('Network error'));

      const agents = [
        {
          id: 'agent-1',
          name: 'Test Agent',
          description: 'Test',
          locale: 'en-US',
          published: true,
          topics: [],
          entities: [],
        },
      ];

      const results = await importer.importAgents(agents);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('Network error');
    });
  });
});
