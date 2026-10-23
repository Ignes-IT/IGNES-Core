
import { execFile } from 'child_process';
import { promisify } from 'util';
import { config } from '../config/environment';

const execFileAsync = promisify(execFile);

export interface PeerInfo {
  pubkey: string;
  endpoint: string;
  allowed_ips: string;
  handshake: number;
}

interface ScriptResponse {
  ok: boolean;
  error?: string;
  data?: unknown;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PUBKEY_RE = /^[A-Za-z0-9+/]{43}=$/;
const IPV4_RE = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

export function isEnabled(): boolean {
  return config.vpnSsh.keyPath !== '/dev/null';
}

async function runSshCommand(command: string): Promise<unknown> {
  if (!isEnabled()) {
    throw new Error('VPN SSH is disabled');
  }

  const { host, user, keyPath } = config.vpnSsh;
  const args = [
    '-i', keyPath,
    '-o', 'IdentitiesOnly=yes',
    '-o', 'BatchMode=yes',
    '-o', 'ConnectTimeout=10',
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'UserKnownHostsFile=/dev/null',
    '-o', 'ServerAliveInterval=15',
    '-o', 'ServerAliveCountMax=2',
    `${user}@${host}`,
    command,
  ];

  let stdout: string;
  try {
    const result = await execFileAsync('ssh', args, {
      timeout: 15000,
      maxBuffer: 4 * 1024 * 1024,
    });
    stdout = result.stdout;
  } catch (err: any) {
    if (err.code === 255) {
      throw new Error('VPN server unavailable');
    }
    stdout = err.stdout ?? '';
    if (!stdout) {
      throw new Error(err.message || 'VPN command failed');
    }
  }

  const lastLine = stdout.trim().split('\n').filter(Boolean).pop() ?? '';
  let parsed: ScriptResponse;
  try {
    parsed = JSON.parse(lastLine) as ScriptResponse;
  } catch {
    throw new Error(`Invalid VPN response: ${lastLine.slice(0, 200)}`);
  }

  if (!parsed.ok) {
    throw new Error(parsed.error || 'VPN command failed');
  }
  return parsed.data;
}

export async function addPeer(
  deviceId: string,
  publicKey: string,
  ipAddress: string,
): Promise<void> {
  if (!UUID_RE.test(deviceId)) {
    throw new Error('Invalid device id');
  }
  if (!PUBKEY_RE.test(publicKey)) {
    throw new Error('Invalid public key');
  }
  if (!IPV4_RE.test(ipAddress)) {
    throw new Error('Invalid ip address');
  }
  await runSshCommand(`peer-add ${deviceId} ${publicKey} ${ipAddress}`);
}

export async function removePeer(deviceId: string): Promise<void> {
  if (!UUID_RE.test(deviceId)) {
    throw new Error('Invalid device id');
  }
  await runSshCommand(`peer-remove ${deviceId}`);
}

export async function listPeers(): Promise<PeerInfo[]> {
  if (!isEnabled()) {
    return [];
  }
  const data = await runSshCommand('peer-list');
  if (!Array.isArray(data)) {
    throw new Error('Invalid peer list response');
  }
  return data as PeerInfo[];
}