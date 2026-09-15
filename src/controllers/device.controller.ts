import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { config as env } from '../config/environment';
import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';

const execAsync = promisify(exec);

const generateKeys = async () => {
  const { stdout: privateKeyRaw } = await execAsync('wg genkey');
  const privateKey = privateKeyRaw.trim();
  const { stdout: publicKeyRaw } = await execAsync(`echo "${privateKey}" | wg pubkey`);
  const publicKey = publicKeyRaw.trim();
  return { privateKey, publicKey };
};

export const createDevice = async (req: Request, res: Response) => {
  const { name } = req.body;
  const userId = (req as any).user?.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const { privateKey, publicKey } = await generateKeys();
    const deviceCount = await prisma.device.count();
    const ipAddress = `10.0.0.${deviceCount + 2}`;

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

    res.status(201).json({ deviceId: device.id, publicKey: device.publicKey });
  } catch (error) {
    console.error('createDevice error:', error);
    res.status(500).json({ message: 'Failed to create device' });
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

    const wgConfig = `[Interface]
PrivateKey = ${device.privateKey}
Address = ${device.ipAddress}/32
DNS = ${env.wireguardDns}

[Peer]
PublicKey = ${env.serverPublicKey}
Endpoint = ${env.wireguardEndpoint}
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25`;

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="wg-${device.id}.conf"`
    );
    res.send(wgConfig);
  } catch (error) {
    console.error('getConfig error:', error);
    res.status(500).json({ message: 'Failed to generate config' });
  }
};

export const getDevices = async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId;

    if(!userId) {
        return res.status(401).json({ message: 'Unauthorized'});
    }

    try {
        const devices = await prisma.device.findMany({
            where: { userId }, select: {
                id: true,
                name: true,
                publicKey: true,
                ipAddress: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc'},
        });
        res.json({ devices });
    } catch (error) {
        console.error('getDevices error:', error);
        res.status(500).json({ message: 'Failed to get devices '})
    }
}