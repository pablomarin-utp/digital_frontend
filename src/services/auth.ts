const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1';

export const authApi = {
  register: async (username: string, password: string, full_name?: string) => {
    const form = new FormData();
    form.append('username', username);
    form.append('password', password);
    if (full_name) form.append('full_name', full_name);
    const res = await fetch(`${API_BASE_URL}/auth/register`, { method: 'POST', body: form });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || `Error HTTP ${res.status}`);
    }
    return res.json();
  },

  login: async (username: string, password: string) => {
    const form = new FormData();
    form.append('username', username);
    form.append('password', password);
    const res = await fetch(`${API_BASE_URL}/auth/login`, { method: 'POST', body: form });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || `Error HTTP ${res.status}`);
    }
    return res.json();
  },

  saveEmbedding: async (userId: string, embedding: number[]) => {
    const res = await fetch(`${API_BASE_URL}/auth/users/${userId}/embedding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(embedding),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || `Error HTTP ${res.status}`);
    }
    return res.json();
  },
};

export default authApi;
