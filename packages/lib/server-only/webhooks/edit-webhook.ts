import type { Prisma } from '@prisma/client';

import { prisma } from '@documenso/prisma';

import { TEAM_MEMBER_ROLE_PERMISSIONS_MAP } from '../../constants/teams';
import { buildTeamWhereQuery } from '../../utils/teams';
import { clearWebhookCache } from './get-all-webhooks-by-event-trigger';

export type EditWebhookOptions = {
  id: string;
  data: Omit<Prisma.WebhookUpdateInput, 'id' | 'userId' | 'teamId'>;
  userId: number;
  teamId: number;
};

export const editWebhook = async ({ id, data, userId, teamId }: EditWebhookOptions) => {
  const webhook = await prisma.webhook.update({
    where: {
      id,
      team: buildTeamWhereQuery({
        teamId,
        userId,
        roles: TEAM_MEMBER_ROLE_PERMISSIONS_MAP['MANAGE_TEAM'],
      }),
    },
    data: {
      ...data,
    },
  });

  clearWebhookCache();

  return webhook;
};
