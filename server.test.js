import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createInterface } from 'node:readline';

for (const host of ['', '127.0.0.1']) {
  test(`server serves the app with ${host || 'the public default'} binding`, { timeout: 15000 }, async t => {
    const child = spawn(process.execPath, ['server.js'], {
      cwd: new URL('.', import.meta.url),
      env: { ...process.env, PORT: '0', HOST: host },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const lines = createInterface({ input: child.stdout });
    let errors = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', chunk => { errors += chunk; });
    t.after(async () => {
      lines.close();
      if (child.exitCode === null && child.signalCode === null) {
        const exited = once(child, 'exit');
        child.kill();
        await exited;
      }
    });

    const startup = await Promise.race([
      once(lines, 'line', { signal: AbortSignal.timeout(10000) }).then(([line]) => line),
      once(child, 'error').then(([error]) => { throw error; }),
      once(child, 'exit').then(([code]) => { throw new Error(`Server exited (${code}): ${errors}`); }),
    ]);
    const match = /^Great Northwest Gutters: listening on http:\/\/([\d.]+):(\d+)$/.exec(startup);
    assert.ok(match, `Unexpected startup output: ${startup}`);
    assert.equal(match[1], host || '0.0.0.0');
    const base = `http://127.0.0.1:${match[2]}`;

    for (const path of ['/', '/app.js', '/styles.css', '/vendor/pdfjs/build/pdf.mjs']) {
      const response = await fetch(`${base}${path}`);
      assert.equal(response.status, 200, path);
      const content = await response.text();
      assert.ok(content.length > 0, path);
      if (path === '/') assert.match(content, /Great Northwest Gutters/);
    }
    const response = await fetch(`${base}/package.json`);
    assert.equal(response.status, 404);
    await response.text();
    assert.equal(errors, '');
  });
}
