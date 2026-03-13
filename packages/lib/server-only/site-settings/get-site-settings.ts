import { prisma } from '@documenso/prisma';

import { type TSiteSettingsSchema, ZSiteSettingsSchema } from './schema';

const CACHE_KEY = 'site-settings';
const TTL_MS = 60_000; // 60 seconds

const cache = new Map<string, { data: TSiteSettingsSchema; expiresAt: number }>();

export const clearSiteSettingsCache = () => {
  cache.delete(CACHE_KEY);
};

export const getSiteSettings = async () => {
  const cached = cache.get(CACHE_KEY);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const settings = await prisma.siteSettings.findMany();
  const parsed = ZSiteSettingsSchema.parse(settings);

  cache.set(CACHE_KEY, { data: parsed, expiresAt: Date.now() + TTL_MS });

  return parsed;
};
