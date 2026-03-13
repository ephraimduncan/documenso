import { prisma } from '@documenso/prisma';

import { clearSiteSettingsCache } from './get-site-settings';
import { type TSiteSettingSchema } from './schema';

export type UpsertSiteSettingOptions = TSiteSettingSchema & {
  userId?: number | null;
};

export const upsertSiteSetting = async ({
  id,
  enabled,
  data,
  userId,
}: UpsertSiteSettingOptions) => {
  const result = await prisma.siteSettings.upsert({
    where: {
      id,
    },
    create: {
      id,
      enabled,
      data,
      lastModifiedByUserId: userId,
      lastModifiedAt: new Date(),
    },
    update: {
      enabled,
      data,
      lastModifiedByUserId: userId,
      lastModifiedAt: new Date(),
    },
  });

  clearSiteSettingsCache();

  return result;
};
