export interface ObfuscationParams {
  Jc: number;
  Jmin: number;
  Jmax: number;
  S1: number;
  S2: number;
  S3: number;
  S4: number;
  H1: string;
  H2: string;
  H3: string;
  H4: string;
}

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return fallback;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    throw new Error(`${name} must be an integer, got: ${raw}`);
  }
  return parsed;
}

function str(name: string, fallback: string): string {
  const raw = process.env[name];
  return raw === undefined || raw === '' ? fallback : raw;
}

export const obfuscation: ObfuscationParams = {
  Jc: num('WIREGUARD_JC', 5),
  Jmin: num('WIREGUARD_JMIN', 81),
  Jmax: num('WIREGUARD_JMAX', 227),
  S1: num('WIREGUARD_S1', 116),
  S2: num('WIREGUARD_S2', 141),
  S3: num('WIREGUARD_S3', 33),
  S4: num('WIREGUARD_S4', 11),
  H1: str('WIREGUARD_H1', '415399516-823122858'),
  H2: str('WIREGUARD_H2', '909000956-974751682'),
  H3: str('WIREGUARD_H3', '1286335123-1399362796'),
  H4: str('WIREGUARD_H4', '1973782089-2084512663'),
};

export function renderObfuscationLines(): string[] {
  return [
    `Jc = ${obfuscation.Jc}`,
    `Jmin = ${obfuscation.Jmin}`,
    `Jmax = ${obfuscation.Jmax}`,
    `S1 = ${obfuscation.S1}`,
    `S2 = ${obfuscation.S2}`,
    `S3 = ${obfuscation.S3}`,
    `S4 = ${obfuscation.S4}`,
    `H1 = ${obfuscation.H1}`,
    `H2 = ${obfuscation.H2}`,
    `H3 = ${obfuscation.H3}`,
    `H4 = ${obfuscation.H4}`,
  ];
}