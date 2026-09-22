import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { config as env } from '../config/environment';
import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';
import { getUserActivePlan } from '../services/subscription.service';
import { DEVICE_LIMITS } from '../config/plans';

const execAsync = promisify(exec);

const generateKeys = async () => {
  const { stdout: privateKeyRaw } = await execAsync('wg genkey');
  const privateKey = privateKeyRaw.trim();
  const { stdout: publicKeyRaw } = await execAsync(`echo "${privateKey}" | wg pubkey`);
  const publicKey = publicKeyRaw.trim();
  return { privateKey, publicKey };
};

export const createDevice = async ( req: Request, res: Response) => {
  const { name } = req.body;
  const userId = (req as any).user?.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const plan = await getUserActivePlan(userId);
    const deviceLimit = DEVICE_LIMITS[plan];

    const userDeviceCount = await prisma.device.count({
      where: {userId},
    });

    if (userDeviceCount >= deviceLimit) {
      return res.status(409).json({
        message: `Device limit reached for ${plan} plan (${deviceLimit})`,
      });
    }

    const { privateKey, publicKey } = await generateKeys();
    const totalDeviceCount = await prisma.device.count();
    const ipAddress = `10.0.0.${totalDeviceCount + 2}`;

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

    return res.status(201).json({ deviceId: device.id, publicKey: device.publicKey});
  } catch (error) {
    console.error('createDevice error:', error);
    return res.status(500).json({ message: 'Failed to create device'})
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

export const deleteDevice = async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const id  = req.params.id as string;

  try {
    const result = await prisma.device.deleteMany({
      where: {
        id, userId,
      },
    });

    if (result.count === 0) {
      return res.status(404).json({ message: 'Device not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('deleteDevice error', error);
    res.status(500).json({ message: 'Failed to delete device' });
  }
};