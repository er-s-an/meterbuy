import "server-only";

export async function getJson<T>(url: string, timeoutMs = 12_000): Promise<T> {
  const response = await request(url, { method: "GET" }, timeoutMs);
  if (!response.ok) {
    throw new Error(`GET ${new URL(url).pathname} failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export async function request(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
      headers: {
        accept: "application/json",
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } finally {
    clearTimeout(timer);
  }
}
