export async function apiGetJson<T>(path: string): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  const res = await fetch(path, { method: "GET" });
  const status = res.status;
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    // ignore
  }
  if (!res.ok) {
    return { ok: false, status, error: (json && (json.error as string)) || "Request failed" };
  }
  return { ok: true, data: json as T };
}

export async function apiPostJson<T>(path: string, body: unknown): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const status = res.status;
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    // ignore
  }
  if (!res.ok) {
    return { ok: false, status, error: (json && (json.error as string)) || "Request failed" };
  }
  return { ok: true, data: json as T };
}

