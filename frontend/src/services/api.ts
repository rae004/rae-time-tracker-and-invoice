const API_BASE = '/api';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(typeof error.error === 'string' ? error.error : JSON.stringify(error.error));
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const api = {
  // Generic methods
  get: <T>(endpoint: string): Promise<T> =>
    fetch(`${API_BASE}${endpoint}`).then(handleResponse<T>),

  post: <T>(endpoint: string, data: unknown): Promise<T> =>
    fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse<T>),

  put: <T>(endpoint: string, data: unknown): Promise<T> =>
    fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(handleResponse<T>),

  delete: <T>(endpoint: string): Promise<T> =>
    fetch(`${API_BASE}${endpoint}`, {
      method: 'DELETE',
    }).then(handleResponse<T>),
};
