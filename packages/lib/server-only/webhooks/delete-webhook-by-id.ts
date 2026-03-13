import { prisma } from '@documenso/prisma';

import { TEAM_MEMBER_ROLE_PERMISSIONS_MAP } from '../../constants/teams';
import { buildTeamWhereQuery } from '../../utils/teams';
import { clearWebhookCache } from './get-all-webhooks-by-event-trigger';

export type DeleteWebhookByIdOptions = {
  id: string;
  userId: number;
  teamId: number;
};

export const deleteWebhookById = async ({ id, userId, teamId }: DeleteWebhookByIdOptions) => {
  const webhook = await prisma.webhook.delete({
    where: {
      id,
      team: buildTeamWhereQuery({
        teamId,
        userId,
        roles: TEAM_MEMBER_ROLE_PERMISSIONS_MAP['MANAGE_TEAM'],
      }),
    },
  });

  clearWebhookCache();

  return webhook;
};
