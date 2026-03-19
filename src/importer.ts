import axios, { AxiosInstance } from 'axios';
import { promises as fs } from 'fs';
import { join } from 'path';
import { z } from 'zod';

// Validation schemas
const topicSchema = z.object({
  id: z.string(),
  name: z.string(),
  displayName: z.string().optional(),
  description: z.string().optional(),
  triggerChannel: z.string().optional(),
  isSystemTopic: z.boolean().optional(),
  nodes: z.array(z.unknown()).optional(),
  createdAt: z.string().optional(),
  modifiedAt: z.string().optional(),
});

const entitySchema = z.object({
  id: z.string(),
  name: z.string(),
  displayName: z.string().optional(),
  entityType: z.string().optional(),
  options: z.array(z.unknown()).optional(),
});

const variableSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string().optional(),
  scope: z.string().optional(),
  defaultValue: z.unknown().optional(),
});

const agentManifestSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  locale: z.string().optional(),
  published: z.boolean().optional(),
  topics: z.array(z.object({
    id: z.string(),
    name: z.string(),
    file: z.string(),
  })),
  entities: z.array(z.object({
    id: z.string(),
    name: z.string(),
    file: z.string(),
  })),
  variables: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })).optional(),
  exportedAt: z.string().optional(),
});

interface Agent {
  id: string;
  name: string;
  description?: string;
  locale?: string;
  published?: boolean;
  topics: z.infer<typeof topicSchema>[];
  entities: z.infer<typeof entitySchema>[];
  variables?: z.infer<typeof variableSchema>[];
}

interface ImportResult {
  agentName: string;
  success: boolean;
  error?: string;
  created?: boolean;
  updated?: boolean;
}

export class Importer {
  private client: AxiosInstance;
  private token: string;
  private baseUrl: string = 'https://org.api.crm.dynamics.com/api/data/v9.2';

  constructor(token: string) {
    this.token = token;
    this.client = axios.create({
      headers: {
        'Authorization': `Bearer ${token}`,
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
  }

  async loadFromDisk(inputPath: string, agentName?: string): Promise<Agent[]> {
    const agentsDir = join(inputPath, 'agents');
    
    try {
      await fs.access(agentsDir);
    } catch {
      throw new Error(`Agents directory not found: ${agentsDir}`);
    }

    const agentDirs = await fs.readdir(agentsDir);
    const agents: Agent[] = [];

    for (const dir of agentDirs) {
      const agentDir = join(agentsDir, dir);
      const stat = await fs.stat(agentDir);
      
      if (!stat.isDirectory()) continue;

      const agentFile = join(agentDir, 'agent.json');
      
      try {
        const data = await fs.readFile(agentFile, 'utf-8');
        const manifest = agentManifestSchema.parse(JSON.parse(data));

        // Filter by name if specified
        if (agentName && manifest.name !== agentName) {
          continue;
        }

        const agent: Agent = {
          id: manifest.id,
          name: manifest.name,
          description: manifest.description,
          locale: manifest.locale,
          published: manifest.published,
          topics: [],
          entities: [],
          variables: [],
        };

        // Load topics
        for (const topicRef of manifest.topics) {
          const topicFile = join(agentDir, topicRef.file);
          try {
            const topicData = await fs.readFile(topicFile, 'utf-8');
            const topic = topicSchema.parse(JSON.parse(topicData));
            agent.topics.push(topic);
          } catch (error) {
            console.warn(`Warning: Could not load topic ${topicRef.name}: ${error}`);
          }
        }

        // Load entities
        for (const entityRef of manifest.entities) {
          const entityFile = join(agentDir, entityRef.file);
          try {
            const entityData = await fs.readFile(entityFile, 'utf-8');
            const entity = entitySchema.parse(JSON.parse(entityData));
            agent.entities.push(entity);
          } catch (error) {
            console.warn(`Warning: Could not load entity ${entityRef.name}: ${error}`);
          }
        }

        // Load variables
        const variablesFile = join(agentDir, 'variables', 'variables.json');
        try {
          const variablesData = await fs.readFile(variablesFile, 'utf-8');
          const variables = z.array(variableSchema).parse(JSON.parse(variablesData));
          agent.variables = variables;
        } catch {
          // Variables file is optional
        }

        agents.push(agent);
      } catch (error) {
        console.warn(`Warning: Could not load agent from ${dir}: ${error}`);
      }
    }

    return agents;
  }

  async importAgents(agents: Agent[]): Promise<ImportResult[]> {
    const results: ImportResult[] = [];

    for (const agent of agents) {
      try {
        const result = await this.importAgent(agent);
        results.push(result);
      } catch (error) {
        results.push({
          agentName: agent.name,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  private async importAgent(agent: Agent): Promise<ImportResult> {
    // Check if agent exists
    let existingAgent = null;
    try {
      const response = await this.client.get(
        `${this.baseUrl}/botcomponents(${agent.id})`
      );
      existingAgent = response.data;
    } catch {
      // Agent doesn't exist
    }

    const agentData = {
      name: agent.name,
      description: agent.description,
      locale: agent.locale || 'en-US',
      statecode: agent.published ? 0 : 1,
    };

    if (existingAgent) {
      // Update existing agent
      await this.client.patch(
        `${this.baseUrl}/botcomponents(${agent.id})`,
        agentData
      );

      // Update topics
      for (const topic of agent.topics) {
        await this.importTopic(topic, agent.id);
      }

      // Update entities
      for (const entity of agent.entities) {
        await this.importEntity(entity, agent.id);
      }

      // Update variables
      if (agent.variables) {
        for (const variable of agent.variables) {
          await this.importVariable(variable, agent.id);
        }
      }

      return {
        agentName: agent.name,
        success: true,
        updated: true,
      };
    } else {
      // Create new agent
      const createData = {
        botcomponentid: agent.id,
        ...agentData,
        componenttype: 1, // Bot type
      };

      await this.client.post(
        `${this.baseUrl}/botcomponents`,
        createData
      );

      // Create topics
      for (const topic of agent.topics) {
        await this.importTopic(topic, agent.id);
      }

      // Create entities
      for (const entity of agent.entities) {
        await this.importEntity(entity, agent.id);
      }

      // Create variables
      if (agent.variables) {
        for (const variable of agent.variables) {
          await this.importVariable(variable, agent.id);
        }
      }

      return {
        agentName: agent.name,
        success: true,
        created: true,
      };
    }
  }

  private async importTopic(topic: z.infer<typeof topicSchema>, agentId: string): Promise<void> {
    const topicData = {
      topicid: topic.id,
      name: topic.name,
      displayname: topic.displayName,
      description: topic.description,
      triggerchannel: topic.triggerChannel,
      issystemtopic: topic.isSystemTopic,
      nodes: topic.nodes ? JSON.stringify(topic.nodes) : null,
      '@odata.bind': `botcomponents(${agentId})`,
    };

    try {
      // Try to update first
      await this.client.patch(
        `${this.baseUrl}/topics(${topic.id})`,
        topicData
      );
    } catch {
      // Create if doesn't exist
      await this.client.post(
        `${this.baseUrl}/topics`,
        topicData
      );
    }
  }

  private async importEntity(entity: z.infer<typeof entitySchema>, agentId: string): Promise<void> {
    const entityData = {
      entityid: entity.id,
      name: entity.name,
      displayname: entity.displayName,
      entitytype: entity.entityType,
      options: entity.options ? JSON.stringify(entity.options) : null,
      '@odata.bind': `botcomponents(${agentId})`,
    };

    try {
      // Try to update first
      await this.client.patch(
        `${this.baseUrl}/entities(${entity.id})`,
        entityData
      );
    } catch {
      // Create if doesn't exist
      await this.client.post(
        `${this.baseUrl}/entities`,
        entityData
      );
    }
  }

  private async importVariable(variable: z.infer<typeof variableSchema>, agentId: string): Promise<void> {
    const variableData = {
      botvariableid: variable.id,
      name: variable.name,
      type: variable.type,
      scope: variable.scope,
      defaultvalue: variable.defaultValue,
      '@odata.bind': `botcomponents(${agentId})`,
    };

    try {
      // Try to update first
      await this.client.patch(
        `${this.baseUrl}/botvariables(${variable.id})`,
        variableData
      );
    } catch {
      // Create if doesn't exist
      await this.client.post(
        `${this.baseUrl}/botvariables`,
        variableData
      );
    }
  }
}
