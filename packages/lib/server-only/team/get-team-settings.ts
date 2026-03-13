import { prisma } from '@documenso/prisma';

import { AppError, AppErrorCode } from '../../errors/app-error';
import { buildTeamWhereQuery, extractDerivedTeamSettings } from '../../utils/teams';

export type GetTeamSettingsOptions = {
  userId?: number;
  teamId: number;
};

type TeamSettingsResult = ReturnType<typeof extractDerivedTeamSettings>;

const TTL_MS = 30_000; // 30 seconds

const cache = new Map<string, { data: TeamSettingsResult; expiresAt: number }>();

/**
 * Clear cached team settings for a specific team or all teams.
 */
export const clearTeamSettingsCache = (teamId?: number) => {
  if (teamId !== undefined) {
    // Clear all entries for this teamId (any userId variant).
    for (const key of cache.keys()) {
      if (key.startsWith(`${teamId}:`)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
};

/**
 * You must provide userId if you want to validate whether the user can access the team settings.
 */
export const getTeamSettings = async ({ userId, teamId }: GetTeamSettingsOptions) => {
  const cacheKey = `${teamId}:${userId ?? ''}`;
  const cached = cache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const team = await prisma.team.findFirst({
    where: userId !== undefined ? buildTeamWhereQuery({ teamId, userId }) : { id: teamId },
    include: {
      organisation: {
        include: {
          organisationGlobalSettings: true,
        },
      },
      teamGlobalSettings: true,
    },
  });

  if (!team) {
    throw new AppError(AppErrorCode.NOT_FOUND, {
      message: 'Team not found',
    });
  }

  const organisationSettings = team.organisation.organisationGlobalSettings;
  const teamSettings = team.teamGlobalSettings;

  // Override branding settings if inherit is enabled.
  if (teamSettings.brandingEnabled === null) {
    teamSettings.brandingEnabled = organisationSettings.brandingEnabled;
    teamSettings.brandingLogo = organisationSettings.brandingLogo;
    teamSettings.brandingUrl = organisationSettings.brandingUrl;
    teamSettings.brandingCompanyDetails = organisationSettings.brandingCompanyDetails;
  }

  const result = extractDerivedTeamSettings(organisationSettings, teamSettings);

  cache.set(cacheKey, { data: result, expiresAt: Date.now() + TTL_MS });

  return result;
};
