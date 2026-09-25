import { Sandbox } from "@vercel/sandbox";

// Lightweight, explicitly authorized smoke test. It does not install a browser
// or visit LinkedIn. Keep the endpoint private to prevent unwanted usage.
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

  let sandbox;
  try {
    sandbox = await Sandbox.create({ runtime: "node24", timeout: 45_000 });
    const result = await sandbox.runCommand("node", ["-e", "console.log('sandbox-ok')"]);
    const output = (await result.stdout()).trim();
    return res.status(200).json({ ok: output === "sandbox-ok", output });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : String(err)
    });
  } finally {
    if (sandbox) await sandbox.stop().catch(() => {});
  }
}
