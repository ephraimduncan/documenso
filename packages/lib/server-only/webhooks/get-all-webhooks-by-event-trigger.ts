import type { Webhook, WebhookTriggerEvents } from '@prisma/client';

import { prisma } from '@documenso/prisma';

import { buildTeamWhereQuery } from '../../utils/teams';

export type GetAllWebhooksByEventTriggerOptions = {
  event: WebhookTriggerEvents;
  userId: number;
  teamId: number;
};

const TTL_MS = 30_000; // 30 seconds

const cache = new Map<string, { data: Webhook[]; expiresAt: number }>();

/**
 * Clear cached webhooks. If event, userId, and teamId are provided, only that
 * specific entry is removed. Otherwise the entire webhook cache is cleared.
 */
export const clearWebhookCache = (opts?: {
  event: WebhookTriggerEvents;
  userId: number;
  teamId: number;
}) => {
  if (opts) {
    cache.delete(`${opts.event}:${opts.userId}:${opts.teamId}`);
  } else {
    cache.clear();
  }
};

export const getAllWebhooksByEventTrigger = async ({
  event,
  userId,
  teamId,
}: GetAllWebhooksByEventTriggerOptions) => {
  const cacheKey = `${event}:${userId}:${teamId}`;
  const cached = cache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const webhooks = await prisma.webhook.findMany({
    where: {
      enabled: true,
      eventTriggers: {
        has: event,
      },
      team: buildTeamWhereQuery({
        teamId,
        userId,
      }),
    },
  });

  cache.set(cacheKey, { data: webhooks, expiresAt: Date.now() + TTL_MS });

  return webhooks;
};
