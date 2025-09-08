#!/usr/bin/env node
// フロントエンド(package.json)のversionを server/package.json に同期させる簡易スクリプト
// 1) ルート package.json 読み取り
// 2) server/package.json を読み取り version を上書き
// 3) server/package.json を保存

const fs = require('fs');
const path = require('path');

const rootPkgPath = path.join(__dirname, '..', 'package.json');
const serverPkgPath = path.join(__dirname, '..', 'server', 'package.json');

function main() {
  if (!fs.existsSync(rootPkgPath)) {
    console.error('Root package.json not found');
    process.exit(1);
  }
  if (!fs.existsSync(serverPkgPath)) {
    console.error('Server package.json not found');
    process.exit(1);
  }
  const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
  const serverPkg = JSON.parse(fs.readFileSync(serverPkgPath, 'utf8'));
  const version = rootPkg.version;

  if (!version) {
    console.error('Root version not defined');
    process.exit(1);
  }

  if (serverPkg.version === version) {
    console.log('Version already in sync:', version);
    return;
  }

  serverPkg.version = version;
  fs.writeFileSync(serverPkgPath, JSON.stringify(serverPkg, null, 2) + '\n');
  console.log(`Synced server version to ${version}`);
}

main();
