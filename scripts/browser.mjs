// Lanza el Chromium de Playwright para shots.mjs y lighthouse.mjs.
// En el WSL de desarrollo no hay sudo para `playwright install-deps`: las
// librerías que faltan (nss, nspr, asound) se extrajeron de sus .deb en
// ~/.cache/pw-libs. Si esa carpeta existe se añade a LD_LIBRARY_PATH.
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { chromium } from 'playwright';

const libs = `${homedir()}/.cache/pw-libs/root/usr/lib/x86_64-linux-gnu`;

export function launch(options = {}) {
  const env = { ...process.env };
  if (existsSync(libs)) env.LD_LIBRARY_PATH = [libs, env.LD_LIBRARY_PATH].filter(Boolean).join(':');
  // channel "chromium": el Chromium completo (headless nuevo), más fiel que el headless shell.
  return chromium.launch({ channel: 'chromium', env, ...options });
}
