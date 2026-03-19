import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Exporter } from '../src/exporter';
import { promises as fs } from 'fs';
import { join } from 'path';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
    })),
  },
}));

const TEST_OUTPUT_PATH = './test-export-output';

describe('Exporter', () => {
  let exporter: Exporter;
  let mockClient: { get: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    // Clean up test directory
    try {
      await fs.rmdir(TEST_OUTPUT_PATH, { recursive: true });
    } catch {
      // Directory doesn't exist
    }

    exporter = new Exporter('test-token');
    
    // Get reference to mocked client
    const axios = await import('axios');
    mockClient = { get: vi.fn() };
    (axios.default.create as any).mockReturnValue(mockClient);
    
    // Re-create exporter to use mocked client
    exporter = new Exporter('test-token');
  });

  describe('exportAgents', () => {
    it('should export agents from Copilot Studio', async () => {
      const mockAgents = [
        {
          botcomponentid: 'agent-1',
          name: 'Test Agent',
          description: 'A test agent',
          locale: 'en-US',
          statecode: 0,
        },
      ];

      const mockTopics = [
        {
          topicid: 'topic-1',
          name: 'Greeting',
          displayname: 'Greeting',
          description: 'Welcome message',
          triggerchannel: 'msbot',
          issystemtopic: false,
          nodes: JSON.stringify([{ type: 'message' }]),
          createdon: '2026-01-01T00:00:00Z',
          modifiedon: '2026-01-02T00:00:00Z',
        },
      ];

      mockClient.get
        .mockResolvedValueOnce({ data: { value: mockAgents } })
        .mockResolvedValueOnce({ data: { value: mockTopics } })
        .mockResolvedValueOnce({ data: { value: [] } })  // entities
        .mockResolvedValueOnce({ data: { value: [] } }); // variables

      const agents = await exporter.exportAgents();

      expect(agents).toHaveLength(1);
      expect(agents[0].name).toBe('Test Agent');
      expect(agents[0].topics).toHaveLength(1);
      expect(agents[0].topics[0].name).toBe('Greeting');
    });

    it('should filter agents by name when specified', async () => {
      const mockAgents = [
        { botcomponentid: 'agent-1', name: 'Agent One' },
        { botcomponentid: 'agent-2', name: 'Agent Two' },
      ];

      mockClient.get.mockResolvedValue({ data: { value: mockAgents } });

      const agents = await exporter.exportAgents('Agent One');

      expect(agents).toHaveLength(1);
      expect(agents[0].name).toBe('Agent One');
    });
  });

  describe('saveToDisk', () => {
    it('should create directory structure for agents', async () => {
      const agents = [
        {
          id: 'agent-1',
          name: 'Test Agent',
          description: 'Test',
          locale: 'en-US',
          published: true,
          topics: [],
          entities: [],
          variables: [],
        },
      ];

      await exporter.saveToDisk(agents, TEST_OUTPUT_PATH);

      // Check directory was created
      const agentDir = join(TEST_OUTPUT_PATH, 'agents', 'test-agent');
      const stats = await fs.stat(agentDir);
      expect(stats.isDirectory()).toBe(true);
    });

    it('should save agent manifest', async () => {
      const agents = [
        {
          id: 'agent-1',
          name: 'Test Agent',
          description: 'Test',
          locale: 'en-US',
          published: true,
          topics: [],
          entities: [],
          variables: [],
        },
      ];

      await exporter.saveToDisk(agents, TEST_OUTPUT_PATH);

      const manifestPath = join(TEST_OUTPUT_PATH, 'agents', 'test-agent', 'agent.json');
      const content = await fs.readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(content);
      
      expect(manifest.id).toBe('agent-1');
      expect(manifest.name).toBe('Test Agent');
    });

    it('should save topics to separate files', async () => {
      const agents = [
        {
          id: 'agent-1',
          name: 'Test Agent',
          description: 'Test',
          locale: 'en-US',
          published: true,
          topics: [
            {
              id: 'topic-1',
              name: 'Greeting',
              displayName: 'Greeting',
              nodes: [{ type: 'message' }],
            },
          ],
          entities: [],
          variables: [],
        },
      ];

      await exporter.saveToDisk(agents, TEST_OUTPUT_PATH);

      const topicPath = join(TEST_OUTPUT_PATH, 'agents', 'test-agent', 'topics', 'greeting.json');
      const content = await fs.readFile(topicPath, 'utf-8');
      const topic = JSON.parse(content);
      
      expect(topic.id).toBe('topic-1');
      expect(topic.name).toBe('Greeting');
    });

    it('should create main manifest file', async () => {
      const agents = [
        {
          id: 'agent-1',
          name: 'Test Agent',
          description: 'Test',
          locale: 'en-US',
          published: true,
          topics: [],
          entities: [],
          variables: [],
        },
      ];

      await exporter.saveToDisk(agents, TEST_OUTPUT_PATH);

      const manifestPath = join(TEST_OUTPUT_PATH, 'manifest.json');
      const content = await fs.readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(content);
      
      expect(manifest.version).toBe('1.0.0');
      expect(manifest.agents).toHaveLength(1);
      expect(manifest.agents[0].name).toBe('Test Agent');
    });
  });
});
