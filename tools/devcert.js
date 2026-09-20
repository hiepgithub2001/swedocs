#!/usr/bin/env node
/**
 * A certificate for the dev server.
 *
 * Service workers, and therefore installing the app, need a secure context.
 * localhost counts; a LAN or tailnet address does not, so the one arrangement
 * that matters — the app on a phone, served from this machine — is the one
 * arrangement where none of it can be exercised.
 *
 * This mints a local authority and a server certificate under it, for the
 * names this machine actually answers to. Installing the authority on a phone
 * makes those names real https:// origins to it, and nothing else: it signs
 * this one certificate and never leaves the machine.
 *
 *   node tools/devcert.js [extra-name …]
 *
 * The private keys live in .cache/tls, which is not tracked. Delete the
 * directory to start again; remove the authority from the phone to undo it.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, '.cache', 'tls');

const openssl = (...args) => execFileSync('openssl', args, { stdio: ['ignore', 'pipe', 'pipe'] });

/** Every address this machine answers to, so one certificate covers them all. */
function names(extra) {
  const dns = new Set(['localhost', os.hostname()]);
  const ip = new Set(['127.0.0.1', '::1']);

  for (const list of Object.values(os.networkInterfaces())) {
    for (const { address, internal } of list ?? []) {
      // Link-local addresses are per-interface and never what a phone dials.
      if (!internal && !address.startsWith('fe80:')) ip.add(address);
    }
  }
  try {
    const status = JSON.parse(execFileSync('tailscale', ['status', '--json'], { stdio: ['ignore', 'pipe', 'ignore'] }));
    const self = status.Self?.DNSName?.replace(/\.$/, '');
    if (self) dns.add(self);
    for (const address of status.Self?.TailscaleIPs ?? []) ip.add(address);
  } catch {
    /* not on a tailnet, or tailscale is not installed */
  }
  for (const name of extra) (/^[\d.]+$|:/.test(name) ? ip : dns).add(name);

  return [...[...dns].map((d) => `DNS:${d}`), ...[...ip].map((a) => `IP:${a}`)];
}

const san = names(process.argv.slice(2));
fs.mkdirSync(DIR, { recursive: true });
const at = (name) => path.join(DIR, name);

if (!fs.existsSync(at('ca.crt'))) {
  openssl('req', '-x509', '-newkey', 'rsa:2048', '-sha256', '-days', '3650', '-nodes',
    '-keyout', at('ca.key'), '-out', at('ca.crt'),
    '-subj', '/O=swedocs/CN=swedocs dev CA',
    '-addext', 'basicConstraints=critical,CA:TRUE,pathlen:0',
    '-addext', 'keyUsage=critical,keyCertSign,cRLSign');
  fs.chmodSync(at('ca.key'), 0o600);
}

// 397 days: browsers reject a server certificate valid for longer, however it
// was issued. The authority above is not a server certificate and may be old.
fs.writeFileSync(at('ext.cnf'),
  `basicConstraints=CA:FALSE\n` +
  `keyUsage=critical,digitalSignature,keyEncipherment\n` +
  `extendedKeyUsage=serverAuth\n` +
  `subjectAltName=${san.join(',')}\n`);

openssl('req', '-newkey', 'rsa:2048', '-nodes',
  '-keyout', at('server.key'), '-out', at('server.csr'),
  '-subj', '/O=swedocs/CN=swedocs dev server');
openssl('x509', '-req', '-in', at('server.csr'),
  '-CA', at('ca.crt'), '-CAkey', at('ca.key'), '-CAcreateserial',
  '-out', at('server.crt'), '-days', '397', '-sha256',
  '-extfile', at('ext.cnf'));
fs.chmodSync(at('server.key'), 0o600);
fs.rmSync(at('server.csr'));
fs.rmSync(at('ext.cnf'));

process.stdout.write(`\n  ${path.relative(ROOT, DIR)}/\n    ca.crt · server.crt · server.key\n\n  valid for\n`);
for (const name of san) process.stdout.write(`    ${name}\n`);
process.stdout.write('\n  Serve it with:  node tools/serve.js --tls\n\n');
