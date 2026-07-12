import { describe, expect, it } from "vitest";
import { redactSecrets } from "./redact";

// Assemble credential-shaped fixtures at runtime so repository push protection
// never mistakes the test source for committed credentials.
const fakeAwsAccessKey = ["AK", "IA", "IOSFODNN7EXAMPLE"].join("");
const fakeAwsSecret = ["abcdefghijklmnopqrstuv", "wxyz1234567890ABCD"].join("");

const samples = [
  "github_token=" + ["gh", "p_", "abcdefghijklmnopqrstuvwxyz123456"].join(""),
  "openai: " + ["sk-", "abcdefghijklmnopqrstuvwxyz123456"].join(""),
  `aws_access_key_id=${fakeAwsAccessKey}`,
  `aws_secret_access_key = ${fakeAwsSecret}`,
  "Authorization: Bearer abcdefghijklmnopqrstuvwxyz.signature",
  "client_secret: super-sensitive-value-12345",
  "token='generic-secret-value-12345'",
  "[REDACTED PRIVATE KEY]",
];

describe("redactSecrets", () => {
  it.each(samples)("redacts credential-shaped text without retaining its value", (sample) => {
    const redacted = redactSecrets(`before ${sample} after`);
    expect(redacted).toContain("[REDACTED]");
    expect(redacted).toContain("before");
    expect(redacted).toContain("after");
    expect(redacted).not.toContain(sample.split(/[=:\s]/).at(-1));
  });
});
