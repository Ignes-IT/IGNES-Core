import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { config as env } from '../config/environment';
import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';
import { getUserActivePlan } from '../services/subscription.service';
import { DEVICE_LIMITS } from '../config/plans';
import * as vpnService from '../services/vpn.service'; // ← NEW

const execAsync = promisify(exec);

const createDeviceSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(32, 'Name must be at most 32 characters')
    .regex(
      /^[a-zA-Z0-9 _-]+$/,
      'Name may contain only letters, digits, spaces, underscores, and hyphens',
    ),
});

const generateKeys = async () => {
  const { stdout: privateKeyRaw } = await execAsync('wg genkey');
  const privateKey = privateKeyRaw.trim();
  const { stdout: publicKeyRaw } = await execAsync(`echo "${privateKey}" | wg pubkey`);
  const publicKey = publicKeyRaw.trim();
  return { privateKey, publicKey };
};

const allocateIp = async (
  extraReserved: Set<string> = new Set(),
): Promise<string> => {
  const prefix = env.wireguardSubnetPrefix;
  const existing = await prisma.device.findMany({
    where: { ipAddress: { not: null } },
    select: { ipAddress: true },
  });
  const used = new Set<string>();
  for (const d of existing) {
    if (d.ipAddress) {
      used.add(d.ipAddress);
    }
  }
  for (const ip of extraReserved) {
    used.add(ip);
  }
  for (let host = 2; host <= 254; host++) {
    const candidate = `${prefix}.${host}`;
    if (!used.has(candidate)) {
      return candidate;
    }
  }
  throw new Error('No available IP addresses left in subnet');
};

export const createDevice = async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const parsed = createDeviceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: 'Invalid request body',
      errors: parsed.error.flatten().fieldErrors,
    });
  }
  const { name } = parsed.data;

  try {
    const plan = await getUserActivePlan(userId);
    const deviceLimit = DEVICE_LIMITS[plan];

    const userDeviceCount = await prisma.device.count({
      where: { userId },
    });

    if (userDeviceCount >= deviceLimit) {
      return res.status(409).json({
        message: `Device limit reached for ${plan} plan (${deviceLimit})`,
      });
    }

    const { privateKey, publicKey } = await generateKeys();

    const serverIps = new Set<string>();
    if (vpnService.isEnabled()) {
      try {
        const peers = await vpnService.listPeers();
        for (const p of peers) {
          serverIps.add(p.allowed_ips.replace('/32', ''));
        }
      } catch (err) {
        console.error('listPeers failed:', err);
        return res.status(503).json({ message: 'VPN server unavailable' });
      }
    }

    const ipAddress = await allocateIp(serverIps);

    const device = await prisma.device.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        name,
        publicKey,
        privateKey,
        ipAddress,
      },
    });

    if (vpnService.isEnabled()) {
      try {
        await vpnService.addPeer(device.id, publicKey, ipAddress);
      } catch (err) {
        console.error('addPeer failed, rolling back device:', err);
        await prisma.device.delete({ where: { id: device.id } });
        return res.status(503).json({ message: 'VPN server unavailable' });
      }
    }

    return res.status(201).json({
      deviceId: device.id,
      publicKey: device.publicKey,
      ipAddress: device.ipAddress,
    });
  } catch (error) {
    console.error('createDevice error:', error);
    return res.status(500).json({ message: 'Failed to create device' });
  }
};

export const getConfig = async (req: Request, res: Response) => {
  const { uuid } = req.params;
  const userId = (req as any).user?.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const device = await prisma.device.findFirst({
      where: { id: uuid as string, userId },
    });

    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    if (!device.ipAddress) {
      return res.status(500).json({ message: 'Device has no IP address assigned' });
    }

    const wgConfig = `[Interface]
PrivateKey = ${device.privateKey}
Address = ${device.ipAddress}/32
DNS = ${env.wireguardDns}

[Peer]
PublicKey = ${env.serverPublicKey}
Endpoint = ${env.wireguardEndpoint}
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25`;

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="wg-${device.id}.conf"`,
    );
    res.send(wgConfig);
  } catch (error) {
    console.error('getConfig error:', error);
    res.status(500).json({ message: 'Failed to generate config' });
  }
};

export const getDevices = async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const devices = await prisma.device.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        publicKey: true,
        ipAddress: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ devices });
  } catch (error) {
    console.error('getDevices error:', error);
    return res.status(500).json({ message: 'Failed to get devices' });
  }
};

export const deleteDevice = async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const id = req.params.id as string;

  try {
    const device = await prisma.device.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    if (vpnService.isEnabled()) {
      try {
        await vpnService.removePeer(device.id);
      } catch (err) {
        console.error('removePeer failed (continuing):', err);
      }
    }

    const result = await prisma.device.deleteMany({
      where: { id, userId },
    });

    if (result.count === 0) {
      return res.status(404).json({ message: 'Device not found' });
    }

    return res.status(204).send();
  } catch (error) {
    console.error('deleteDevice error:', error);
    return res.status(500).json({ message: 'Failed to delete device' });
  }
};