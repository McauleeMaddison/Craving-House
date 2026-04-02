type PublicUrlEnv = Partial<Pick<NodeJS.ProcessEnv, "NEXTAUTH_URL" | "VAPID_SUBJECT">>;

function getRuntimeEnv(env?: PublicUrlEnv) {
  return env ?? {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    VAPID_SUBJECT: process.env.VAPID_SUBJECT
  };
}

export function normalizePublicUrl(raw: string | null | undefined) {
  const value = raw?.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    url.pathname = "";
    url.search = "";
    url.hash = "";

    // Render sometimes leaks the internal port into copied config.
    if (url.port === "10000") url.port = "";
    if (url.protocol === "https:" && url.port === "443") url.port = "";
    if (url.protocol === "http:" && url.port === "80") url.port = "";

    return url;
  } catch {
    return null;
  }
}

export function getConfiguredPublicUrl(env?: PublicUrlEnv) {
  return normalizePublicUrl(getRuntimeEnv(env).NEXTAUTH_URL);
}

export function getConfiguredPublicOrigin(env?: PublicUrlEnv) {
  return getConfiguredPublicUrl(env)?.origin ?? null;
}

export function getConfiguredVapidSubject(env?: PublicUrlEnv) {
  const runtimeEnv = getRuntimeEnv(env);
  const subjectRaw = (runtimeEnv.VAPID_SUBJECT ?? "").trim();
  const subjectCandidate = subjectRaw.endsWith(")") ? subjectRaw.slice(0, -1).trim() : subjectRaw;
  const subjectFallback = getConfiguredPublicOrigin(runtimeEnv) ?? "mailto:admin@localhost";

  let subject = subjectCandidate || subjectFallback;
  try {
    new URL(subject);
  } catch {
    subject = "mailto:admin@localhost";
  }

  return subject;
}
