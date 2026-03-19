import axios, { AxiosInstance } from 'axios';
import { promises as fs } from 'fs';
import { join } from 'path';

interface Agent {
  id: string;
  name: string;
  description?: string;
  locale?: string;
  published?: boolean;
  topics: Topic[];
  entities: Entity[];
  variables?: Variable[];
}

interface Topic {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  triggerChannel?: string;
  isSystemTopic?: boolean;
  nodes?: unknown[];
  createdAt?: string;
  modifiedAt?: string;
}

interface Entity {
  id: string;
  name: string;
  displayName?: string;
  entityType?: string;
  options?: unknown[];
}

interface Variable {
  id: string;
  name: string;
  type?: string;
  scope?: string;
  defaultValue?: unknown;
}

interface ExportManifest {
  version: string;
  exportedAt: string;
  environment: string;
  agents: AgentSummary[];
}

interface AgentSummary {
  id: string;
  name: string;
  path: string;
}

export class Exporter {
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

  async exportAgents(agentName?: string): Promise<Agent[]> {
    // Fetch bot components (agents)
    const agentsResponse = await this.client.get(
      `${this.baseUrl}/botcomponents?$filter=componenttype eq 1`
    );

    const agents: Agent[] = [];
    const botComponents = agentsResponse.data.value || [];

    for (const component of botComponents) {
      const agent: Agent = {
        id: component.botcomponentid,
        name: component.name || 'Unnamed Agent',
        description: component.description,
        locale: component.locale,
        published: component.statecode === 0,
        topics: [],
        entities: [],
        variables: [],
      };

      // Filter by name if specified
      if (agentName && agent.name !== agentName) {
        continue;
      }

      // Fetch topics for this agent
      try {
        const topicsResponse = await this.client.get(
          `${this.baseUrl}/topics?$filter=_botcomponentid_value eq ${agent.id}`
        );
        
        agent.topics = (topicsResponse.data.value || []).map((t: any) => ({
          id: t.topicid,
          name: t.name,
          displayName: t.displayname,
          description: t.description,
          triggerChannel: t.triggerchannel,
          isSystemTopic: t.issystemtopic,
          nodes: t.nodes ? JSON.parse(t.nodes) : [],
          createdAt: t.createdon,
          modifiedAt: t.modifiedon,
        }));
      } catch (error) {
        console.warn(`Warning: Could not fetch topics for agent ${agent.name}`);
      }

      // Fetch entities
      try {
        const entitiesResponse = await this.client.get(
          `${this.baseUrl}/entities?$filter=_botcomponentid_value eq ${agent.id}`
        );
        
        agent.entities = (entitiesResponse.data.value || []).map((e: any) => ({
          id: e.entityid,
          name: e.name,
          displayName: e.displayname,
          entityType: e.entitytype,
          options: e.options ? JSON.parse(e.options) : [],
        }));
      } catch (error) {
        console.warn(`Warning: Could not fetch entities for agent ${agent.name}`);
      }

      // Fetch variables
      try {
        const variablesResponse = await this.client.get(
          `${this.baseUrl}/botvariables?$filter=_botcomponentid_value eq ${agent.id}`
        );
        
        agent.variables = (variablesResponse.data.value || []).map((v: any) => ({
          id: v.botvariableid,
          name: v.name,
          type: v.type,
          scope: v.scope,
          defaultValue: v.defaultvalue,
        }));
      } catch (error) {
        console.warn(`Warning: Could not fetch variables for agent ${agent.name}`);
      }

      agents.push(agent);
    }

    return agents;
  }

  async saveToDisk(agents: Agent[], outputPath: string): Promise<void> {
    const agentsDir = join(outputPath, 'agents');
    await fs.mkdir(agentsDir, { recursive: true });

    const manifest: ExportManifest = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      environment: this.baseUrl,
      agents: [],
    };

    for (const agent of agents) {
      const safeName = this.sanitizeFileName(agent.name);
      const agentDir = join(agentsDir, safeName);
      await fs.mkdir(agentDir, { recursive: true });

      // Create topics directory
      const topicsDir = join(agentDir, 'topics');
      await fs.mkdir(topicsDir, { recursive: true });

      // Save topics
      for (const topic of agent.topics) {
        const topicFile = join(topicsDir, `${this.sanitizeFileName(topic.name)}.json`);
        await fs.writeFile(topicFile, JSON.stringify(topic, null, 2));
      }

      // Create entities directory
      const entitiesDir = join(agentDir, 'entities');
      await fs.mkdir(entitiesDir, { recursive: true });

      // Save entities
      for (const entity of agent.entities) {
        const entityFile = join(entitiesDir, `${this.sanitizeFileName(entity.name)}.json`);
        await fs.writeFile(entityFile, JSON.stringify(entity, null, 2));
      }

      // Create variables directory
      const variablesDir = join(agentDir, 'variables');
      await fs.mkdir(variablesDir, { recursive: true });

      // Save variables
      if (agent.variables && agent.variables.length > 0) {
        const variablesFile = join(variablesDir, 'variables.json');
        await fs.writeFile(variablesFile, JSON.stringify(agent.variables, null, 2));
      }

      // Create agent manifest
      const agentManifest = {
        ...agent,
        topics: agent.topics.map(t => ({
          id: t.id,
          name: t.name,
          file: `topics/${this.sanitizeFileName(t.name)}.json`,
        })),
        entities: agent.entities.map(e => ({
          id: e.id,
          name: e.name,
          file: `entities/${this.sanitizeFileName(e.name)}.json`,
        })),
        variables: agent.variables?.map(v => ({
          id: v.id,
          name: v.name,
        })) || [],
        exportedAt: new Date().toISOString(),
      };

      const agentFile = join(agentDir, 'agent.json');
      await fs.writeFile(agentFile, JSON.stringify(agentManifest, null, 2));

      manifest.agents.push({
        id: agent.id,
        name: agent.name,
        path: `agents/${safeName}`,
      });
    }

    // Save main manifest
    const manifestFile = join(outputPath, 'manifest.json');
    await fs.writeFile(manifestFile, JSON.stringify(manifest, null, 2));
  }

  private sanitizeFileName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
