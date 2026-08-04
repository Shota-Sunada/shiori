#!/usr/bin/env node
/**
 * Collect build artifacts into ./output/{server,client}
 * - server: copy all files under server/dist
 * - client: copy all files under ./dist
 * Cleans output folder first.
 */

const fs = require('fs');
const path = require('path');
const fsp = fs.promises;

const root = path.join(__dirname, '..');
const outputDir = path.join(root, 'output');
const serverRoot = path.join(root, 'server');
const serverDist = path.join(serverRoot, 'dist');
const clientDist = path.join(root, 'dist');

async function exists(p) {
  try {
    await fsp.access(p);
    return true;
  } catch {
    return false;
  }
}

async function rimraf(p) {
  if (!(await exists(p))) return;
  await fsp.rm(p, { recursive: true, force: true });
}

async function copyDir(src, dest) {
  if (!(await exists(src))) return; // silent if missing
  await fsp.mkdir(dest, { recursive: true });
  const entries = await fsp.readdir(src, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) {
      await copyDir(s, d);
    } else if (e.isSymbolicLink()) {
      const real = await fsp.realpath(s);
      await fsp.copyFile(real, d);
    } else {
      await fsp.copyFile(s, d);
    }
  }
}

async function main() {
  // Clean output root
  await rimraf(outputDir);
  await fsp.mkdir(outputDir, { recursive: true });

  const serverOut = path.join(outputDir, 'server');
  const clientOut = path.join(outputDir, 'client');

  await fsp.mkdir(serverOut, { recursive: true });
  await fsp.mkdir(clientOut, { recursive: true });

  // copy server/dist as a directory (keep structure)
  if (await exists(serverDist)) {
    await copyDir(serverDist, path.join(serverOut, 'dist'));
  }
  // copy server/schema as a directory (keep structure)
  const serverSchema = path.join(serverRoot, 'schema');
  if (await exists(serverSchema)) {
    await copyDir(serverSchema, path.join(serverOut, 'schema'));
  }
  // copy server meta files (.env, package.json, serviceAccountKey.json)
  const metaFiles = ['.env', 'package.json', 'serviceAccountKey.json'];
  for (const f of metaFiles) {
    const src = path.join(serverRoot, f);
    if (await exists(src)) {
      await fsp.copyFile(src, path.join(serverOut, f));
    }
  }
  await copyDir(clientDist, clientOut);

  // Small manifest summary
  const summary = {};
  if (await exists(serverOut)) {
    const top = await fsp.readdir(serverOut);
    summary.serverTopLevelEntries = top.length;
    const distPath = path.join(serverOut, 'dist');
    if (await exists(distPath)) {
      summary.serverDistEntries = (await fsp.readdir(distPath)).length;
    }
  }
  if (await exists(clientOut)) {
    summary.clientFiles = (await fsp.readdir(clientOut)).length;
  }
  await fsp.writeFile(path.join(outputDir, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log('[collect-artifacts] Done:', summary);
}

main().catch((err) => {
  console.error('[collect-artifacts] Failed:', err);
  process.exit(1);
});
