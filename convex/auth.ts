export function requireServerSecret(provided: string): void {
  const expected = process.env.MIZAN_CONVEX_SERVER_SECRET;
  if (!expected || provided !== expected) throw new Error("Unauthorized Convex server access.");
}