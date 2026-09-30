export type PlatformRate = {
  platform: string;
  cpmRate: number;
  minPayout: number;
  maxPayout: number;
};

export function findPlatformRate(rates: PlatformRate[], platform: string): PlatformRate | null {
  return rates.find((rate) => rate.platform === platform) ?? null;
}
