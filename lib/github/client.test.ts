import { afterEach, describe, expect, it, vi } from "vitest";
import { createGitHubClient } from "./client";

afterEach(() => vi.unstubAllGlobals());

describe("GitHub REST response validation", () => {
  it("accepts a valid 2xx issue response", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      number: 12,
      html_url: "https://github.com/acme/repo/issues/12",
    }), { status: 201, headers: { "Content-Type": "application/json" } })));

    await expect(createGitHubClient("server-token").createIssue({
      owner: "acme", repo: "repo", title: "title", body: "body",
    })).resolves.toEqual({ number: 12, htmlUrl: "https://github.com/acme/repo/issues/12" });
  });

  it.each([
    { number: "12", html_url: "https://github.com/acme/repo/issues/12" },
    { number: -1, html_url: "https://github.com/acme/repo/issues/12" },
    { number: 12, html_url: "not-a-url" },
    { number: 12, html_url: "https://github.com/evil/repo/issues/12" },
    { number: 12, html_url: "https://github.com/acme/repo/issues/99" },
  ])("rejects malformed fields in a 2xx response: %j", async (payload) => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(payload), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    })));

    await expect(createGitHubClient("server-token").createIssue({
      owner: "acme", repo: "repo", title: "title", body: "body",
    })).rejects.toThrow(/invalid github issue response/i);
  });
});
