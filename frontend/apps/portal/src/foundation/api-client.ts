export interface ApiClientOptions {
  baseUrl?: string;
  credentials?: RequestCredentials;
}

export interface JsonRequestOptions extends RequestInit {
  baseUrl?: string;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly credentials: RequestCredentials;

  public constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? '';
    this.credentials = options.credentials ?? 'include';
  }

  public async requestJson<T>(path: string, init: JsonRequestOptions = {}): Promise<T> {
    const response = await fetch(`${init.baseUrl ?? this.baseUrl}${path}`, {
      ...init,
      credentials: init.credentials ?? this.credentials,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    return (await response.json()) as T;
  }
}

export const portalApiClient = new ApiClient();
