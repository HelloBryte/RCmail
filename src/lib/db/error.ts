type ErrorWithCode = {
  code?: unknown;
  message?: unknown;
  cause?: unknown;
};

function getErrorChain(error: unknown) {
  const chain: ErrorWithCode[] = [];
  const seen = new Set<unknown>();
  let current: unknown = error;

  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    chain.push(current as ErrorWithCode);
    current = (current as ErrorWithCode).cause;
  }

  return chain;
}

export function isMissingDbObjectError(error: unknown, identifiers: string[] = []) {
  const normalizedIdentifiers = identifiers.map((identifier) => identifier.toLowerCase());

  return getErrorChain(error).some((entry) => {
    const code = typeof entry.code === "string" ? entry.code : "";
    const message = typeof entry.message === "string" ? entry.message.toLowerCase() : "";

    if (code === "42P01" || code === "42703") {
      return true;
    }

    if (!message.includes("does not exist")) {
      return false;
    }

    if (normalizedIdentifiers.length === 0) {
      return true;
    }

    return normalizedIdentifiers.some((identifier) => message.includes(identifier));
  });
}
