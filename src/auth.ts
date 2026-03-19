import { PublicClientApplication, DeviceCodeRequest, Configuration } from '@azure/msal-node';
import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CONFIG_DIR = join(homedir(), '.copilot-studio-git-sync');
const TOKEN_CACHE_FILE = join(CONFIG_DIR, 'token-cache.json');

interface TokenCache {
  accessToken: string;
  refreshToken?: string;
  expiresOn: string;
  username?: string;
}

interface AuthStatus {
  authenticated: boolean;
  username?: string;
  expiresOn?: string;
}

export class AuthManager {
  private msalApp: PublicClientApplication;
  private clientId: string = '04b07795-8ddb-461a-bbee-02f9e1bf7b46'; // Microsoft CLI client ID
  private tenantId: string = 'common';
  private authority: string;

  constructor() {
    this.authority = `https://login.microsoftonline.com/${this.tenantId}`;
    const config: Configuration = {
      auth: {
        clientId: this.clientId,
        authority: this.authority,
      },
      cache: {
        cachePlugin: {
          beforeCacheAccess: async (cacheContext) => {
            try {
              const data = await fs.readFile(TOKEN_CACHE_FILE, 'utf-8');
              cacheContext.tokenCache.deserialize(data);
            } catch {
              // Cache doesn't exist yet
            }
          },
          afterCacheAccess: async (cacheContext) => {
            if (cacheContext.cacheHasChanged) {
              await fs.mkdir(CONFIG_DIR, { recursive: true });
              await fs.writeFile(TOKEN_CACHE_FILE, cacheContext.tokenCache.serialize());
            }
          },
        },
      },
    };
    this.msalApp = new PublicClientApplication(config);
  }

  async login(method: string = 'deviceCode'): Promise<void> {
    await fs.mkdir(CONFIG_DIR, { recursive: true });

    if (method === 'deviceCode') {
      await this.loginWithDeviceCode();
    } else {
      throw new Error(`Authentication method '${method}' not yet implemented`);
    }
  }

  private async loginWithDeviceCode(): Promise<void> {
    const scopes = ['https://org.crm.dynamics.com/.default'];
    
    const deviceCodeRequest: DeviceCodeRequest = {
      scopes,
      deviceCodeCallback: (response) => {
        console.log('\n----------------------------------------');
        console.log('To sign in, use a web browser to open:');
        console.log(response.verificationUri);
        console.log('\nAnd enter the code:');
        console.log(response.userCode);
        console.log('----------------------------------------\n');
      },
    };

    try {
      const response = await this.msalApp.acquireTokenByDeviceCode(deviceCodeRequest);
      
      const cache: TokenCache = {
        accessToken: response.accessToken,
        expiresOn: response.expiresOn?.toISOString() || new Date(Date.now() + 3600 * 1000).toISOString(),
        username: response.account?.username,
      };

      await fs.writeFile(TOKEN_CACHE_FILE, JSON.stringify(cache, null, 2));
      console.log(`\nLogged in as: ${response.account?.username || 'Unknown'}`);
    } catch (error) {
      throw new Error(`Device code login failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  async getToken(): Promise<string> {
    try {
      const data = await fs.readFile(TOKEN_CACHE_FILE, 'utf-8');
      const cache: TokenCache = JSON.parse(data);

      // Check if token is expired
      const expiresOn = new Date(cache.expiresOn);
      if (expiresOn <= new Date()) {
        throw new Error('Token expired. Please run: csgs auth login');
      }

      return cache.accessToken;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error('Not authenticated. Please run: csgs auth login');
      }
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await fs.unlink(TOKEN_CACHE_FILE);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async getStatus(): Promise<AuthStatus> {
    try {
      const data = await fs.readFile(TOKEN_CACHE_FILE, 'utf-8');
      const cache: TokenCache = JSON.parse(data);
      const expiresOn = new Date(cache.expiresOn);
      
      return {
        authenticated: expiresOn > new Date(),
        username: cache.username,
        expiresOn: cache.expiresOn,
      };
    } catch {
      return { authenticated: false };
    }
  }
}
