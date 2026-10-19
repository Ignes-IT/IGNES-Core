import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z
    .string()
    .refine((v) => v.startsWith('postgresql://') || v.startsWith('postgres://'), {
      message: 'DATABASE_URL must start with postgresql:// or postgres://',
    }),
  JWT_SECRET: z.string().refine(
    (v) => process.env.NODE_ENV !== 'production' || v.length >= 32,
    { message: 'JWT_SECRET must be ≥32 chars in production' },
  ),
  JWT_EXPIRES_IN: z.string().default('7d'),

  SERVER_PUBLIC_KEY: z
    .string()
    .regex(/^[A-Za-z0-9+/]{43}=$/, 'SERVER_PUBLIC_KEY must be a 44-char base64 key'),
  WIREGUARD_ENDPOINT: z
    .string()
    .regex(/^[\w.-]+:\d{1,5}$/, 'WIREGUARD_ENDPOINT must be host:port'),
  WIREGUARD_DNS: z.string().default('1.1.1.1'),
  WIREGUARD_SUBNET_PREFIX: z
    .string()
    .regex(/^(\d{1,3}\.){2}\d{1,3}$/, 'WIREGUARD_SUBNET_PREFIX must be like "10.9.9"'),
  WIREGUARD_SERVER_IP: z
    .string()
    .regex(/^(\d{1,3}\.){3}\d{1,3}$/, 'WIREGUARD_SERVER_IP must be an IPv4'),

  VPN_SSH_HOST: z.string().min(1),
  VPN_SSH_USER: z.string().default('root'),
  VPN_SSH_KEY_PATH: z.string().min(1),
  VPN_MANAGE_SCRIPT: z.string().default('/root/awg/manage_amneziawg.sh'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = {
  nodeEnv: parsed.data.NODE_ENV,
  port: parsed.data.PORT,
  databaseUrl: parsed.data.DATABASE_URL,
  jwtSecret: parsed.data.JWT_SECRET,
  jwtExpiresIn: parsed.data.JWT_EXPIRES_IN,

  serverPublicKey: parsed.data.SERVER_PUBLIC_KEY,
  wireguardEndpoint: parsed.data.WIREGUARD_ENDPOINT,
  wireguardDns: parsed.data.WIREGUARD_DNS,
  wireguardSubnetPrefix: parsed.data.WIREGUARD_SUBNET_PREFIX,
  wireguardServerIp: parsed.data.WIREGUARD_SERVER_IP,

  vpnSsh: {
    host: parsed.data.VPN_SSH_HOST,
    user: parsed.data.VPN_SSH_USER,
    keyPath: parsed.data.VPN_SSH_KEY_PATH,
    manageScript: parsed.data.VPN_MANAGE_SCRIPT,
  },
};