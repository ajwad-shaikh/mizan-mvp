const REDACTED = "[REDACTED]";

/** Redact common credential shapes while preserving surrounding prose. */
export function redactSecrets(text: string): string {
  return text
    .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, REDACTED)
    .replace(/\[REDACTED PRIVATE KEY\]/gi, REDACTED)
    .replace(/\b(?:sk-(?:proj-)?[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{16,}|github_pat_[A-Za-z0-9_]{16,}|AKIA[0-9A-Z]{16})\b/g, REDACTED)
    .replace(/\bBearer\s+[A-Za-z0-9._~+\/-]{12,}={0,2}/gi, `Bearer ${REDACTED}`)
    .replace(
      /\b(api[_-]?key|aws[_-]?(?:secret[_-]?access[_-]?key|access[_-]?key[_-]?id)|client[_-]?secret|access[_-]?token|auth[_-]?token|github[_-]?token|token|secret|password)\b(\s*[:=]\s*)["']?([^\s"'`,;]{8,})["']?/gi,
      (_match, name: string, separator: string) => `${name}${separator}${REDACTED}`,
    );
}
