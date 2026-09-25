import { Sandbox } from "@vercel/sandbox";

// Only run after the cheaper sandbox-smoke test and after creating a
// snapshot containing Chromium + agent-browser. Never bootstrap on each request.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "POST required" });
  }
  const expected = process.env.NETWORK_POC_TOKEN;
  if (!expected) {
    return res.status(503).json({ ok: false, error: "NETWORK_POC_TOKEN not configured" });
  }
  if (req.headers["x-network-poc-token"] !== expected) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
  const snapshotId = process.env.AGENT_BROWSER_SNAPSHOT_ID;
  if (!snapshotId) {
    return res.status(412).json({
      ok: false,
      error: "Browser snapshot not provisioned. Run the lightweight sandbox smoke test first."
    });
  }

  let sandbox;
  try {
    sandbox = await Sandbox.create({
      source: { type: "snapshot", snapshotId },
      timeout: 70_000
    });
    await sandbox.runCommand("agent-browser", ["open", "https://example.com"]);
    const titleResult = await sandbox.runCommand("agent-browser", ["get", "title", "--json"]);
    const title = (await titleResult.stdout()).trim();
    await sandbox.runCommand("agent-browser", ["close"]);
    return res.status(200).json({ ok: true, title });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : String(err) });
  } finally {
    if (sandbox) await sandbox.stop().catch(() => {});
  }
}
