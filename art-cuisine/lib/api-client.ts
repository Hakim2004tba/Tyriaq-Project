export class ApiError extends Error {}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(data?.error ?? "Une erreur est survenue. Veuillez réessayer.");
  }

  return data as T;
}

export function postJson<T>(url: string, body?: unknown): Promise<T> {
  return request<T>(url, { method: "POST", body: body ? JSON.stringify(body) : undefined });
}

export function patchJson<T>(url: string, body: unknown): Promise<T> {
  return request<T>(url, { method: "PATCH", body: JSON.stringify(body) });
}

export function getJson<T>(url: string): Promise<T> {
  return request<T>(url, { method: "GET" });
}

export function deleteJson<T>(url: string): Promise<T> {
  return request<T>(url, { method: "DELETE" });
}
