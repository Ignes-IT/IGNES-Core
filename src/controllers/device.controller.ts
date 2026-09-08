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
  const { stdout: publicKeyRaw } = await execAsync(`echo ${privateKey} | wg pubkey`);
  const publicKey = publicKeyRaw.trim();
  return { privateKey, publicKey };
};

export const createDevice = async (req: Request, res: Response) => {
  const { name } = req.body;
  const userId = (req as any).user.userId;

  try {
    const { privateKey, publicKey } = await generateKeys();
    const device = await prisma.device.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        name,
        publicKey,
        privateKey,
      },
    });

    res.status(201).json({ deviceId: device.id, publicKey: device.publicKey });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create device' });
  }
};

export const getConfig = async (req: Request, res: Response) => {
  const { uuid } = req.params;

  try {
    const device = await prisma.device.findUnique({ where: { id: uuid as string } });
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    const config = `
[Interface]
PrivateKey = ${device.privateKey}
Address = 10.0.0.${device.id}/32
DNS = ${env.wireguardDns}

[Peer]
PublicKey = ${env.serverPublicKey}
Endpoint = ${env.wireguardEndpoint}
AllowedIPs = 0.0.0.0/0`.trim();

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="wg-${device.id}.conf"`);
    res.send(config);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to generate config' });
  }
};
