import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  databaseUrl: process.env.DATABASE_URL || 'postgresql://ignes:ignes@localhost:5432/ignes?schema=public',
  jwtSecret: process.env.JWT_SECRET || 'default-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  serverPublicKey: process.env.SERVER_PUBLIC_KEY || '<SERVER_PUBLIC_KEY>',
  wireguardEndpoint: process.env.WIREGUARD_ENDPOINT || 'vpn.ignes.com:51820',
  wireguardDns: process.env.WIREGUARD_DNS || '1.1.1.1',
};
