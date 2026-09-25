import { Sandbox } from "@vercel/sandbox";

const DEPS = [
  "nss","nspr","libxkbcommon","atk","at-spi2-atk","at-spi2-core",
  "libXcomposite","libXdamage","libXrandr","libXfixes","libXcursor",
  "libXi","libXtst","libXScrnSaver","libXext","mesa-libgbm","libdrm",
  "mesa-libGL","mesa-libEGL","cups-libs","alsa-lib","pango","cairo","gtk3","dbus-libs"
];

export default async function handler(req, res) {
  let sandbox;
  try {
    sandbox = await Sandbox.create({ runtime: "node24", timeout: 120_000 });
    await sandbox.runCommand("sh", ["-c", `sudo dnf install -y --skip-broken ${DEPS.join(" ")} >/dev/null 2>&1 || true`]);
    await sandbox.runCommand("npm", ["install", "-g", "agent-browser"]);
    await sandbox.runCommand("npx", ["agent-browser", "install"]);
    await sandbox.runCommand("agent-browser", ["open", "https://example.com"]);
    const titleResult = await sandbox.runCommand("agent-browser", ["get", "title", "--json"]);
    const title = (await titleResult.stdout()).trim();
    await sandbox.runCommand("agent-browser", ["close"]);
    return res.status(200).json({ ok: true, title });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : String(error) });
  } finally {
    if (sandbox) await sandbox.stop().catch(() => {});
  }
}
