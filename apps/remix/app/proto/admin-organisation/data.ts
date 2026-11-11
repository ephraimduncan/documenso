import type { TLicenseClaim } from '@documenso/lib/types/license';
import type { DateRange } from '@documenso/lib/types/search-params';
import { currentMonthlyPeriod } from '@documenso/lib/universal/monthly-period';
import {
  getQuotaUsagePercent,
  isQuotaExceeded,
  isQuotaNearing,
  normalizeCapacityLimit,
} from '@documenso/lib/universal/quota-usage';
import { getHighestOrganisationRoleInGroup } from '@documenso/lib/utils/organisations';
import type { TGetAdminOrganisationResponse } from '@documenso/trpc/server/admin-router/get-admin-organisation.types';
import type { OrganisationMemberRole } from '@prisma/client';
import { SubscriptionStatus } from '@prisma/client';
import type { ComponentType } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { useFetcher, useSearchParams } from 'react-router';

import type { loader as insightsLoader } from '~/routes/_authenticated+/admin+/organisation-insights.$id';

export type Organisation = TGetAdminOrganisationResponse;
export type Member = Organisation['members'][number];
export type MemberRole = 'OWNER' | OrganisationMemberRole;

export type VariantProps = {
  organisation: Organisation;
};

/** The edit forms of the real page, handed in by the mount block so every variant saves through shipping code. */
export type ProtoForms = {
  licenseFlags?: TLicenseClaim;
  DetailsForm: ComponentType<{ organisation: Organisation }>;
  EntitlementsForm: ComponentType<{ organisation: Organisation; licenseFlags?: TLicenseClaim }>;
};

export const FormsContext = createContext<ProtoForms | null>(null);

export const useForms = () => {
  const forms = useContext(FormsContext);

  if (!forms) {
    throw new Error('useForms must be used inside the prototype harness');
  }

  return forms;
};

type InsightsOptions = {
  organisationId: string;
  view: 'teams' | 'users' | 'documents';
  page?: number;
  perPage?: number;
  dateRange?: DateRange;
};

/**
 * Reads the loader of the existing Insights page, so the prototypes show the same
 * documents and counts as today without any new server code.
 */
export const useInsights = ({
  organisationId,
  view,
  page = 1,
  perPage = 10,
  dateRange = 'allTime',
}: InsightsOptions) => {
  const fetcher = useFetcher<typeof insightsLoader>();

  const search = new URLSearchParams({ view, page: String(page), perPage: String(perPage), dateRange });
  const href = `/admin/organisation-insights/${organisationId}?${search}`;

  useEffect(() => {
    void fetcher.load(href);
  }, [href]);

  return {
    insights: fetcher.data?.insights,
    isLoading: fetcher.state !== 'idle',
  };
};

export type TeamRow = Organisation['teams'][number] & {
  memberCount?: number;
  documentCount?: number;
};

/** Every team with its member and document counts, busiest first. Counts are undefined until Insights answers. */
export const useTeams = (organisation: Organisation): TeamRow[] => {
  const { insights } = useInsights({ organisationId: organisation.id, view: 'teams', perPage: 100 });

  const counts = new Map(insights?.teams.map((team) => [team.id, team]));

  return organisation.teams
    .map((team) => {
      const count = counts.get(team.id);

      return {
        ...team,
        memberCount: count && Number(count.memberCount),
        documentCount: count && Number(count.documentCount),
      };
    })
    .sort((a, b) => (b.documentCount ?? 0) - (a.documentCount ?? 0) || a.name.localeCompare(b.name));
};

/**
 * State kept in the URL without telling React Router, so a change never re-runs
 * loaders and the swap stays instant. Survives reload and variant flips.
 */
export const useUrlState = (key: string, fallback: string) => {
  const [searchParams] = useSearchParams();

  const [value, setValue] = useState(() => {
    const params = typeof window === 'undefined' ? searchParams : new URLSearchParams(window.location.search);

    return params.get(key) ?? fallback;
  });

  const set = (next: string) => {
    setValue(next);

    const url = new URL(window.location.href);

    if (next === fallback) {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, next);
    }

    window.history.replaceState(window.history.state, '', url);
  };

  return [value, set] as const;
};

export const getSubscriptionLabel = (organisation: Organisation) => {
  if (!organisation.subscription) {
    return 'No subscription';
  }

  return SUBSCRIPTION_LABEL[organisation.subscription.status];
};

const SUBSCRIPTION_LABEL: Record<SubscriptionStatus, string> = {
  [SubscriptionStatus.ACTIVE]: 'Active subscription',
  [SubscriptionStatus.PAST_DUE]: 'Subscription past due',
  [SubscriptionStatus.INACTIVE]: 'Inactive subscription',
};

const ROLE_RANK: Record<MemberRole, number> = { OWNER: 0, ADMIN: 1, MANAGER: 2, MEMBER: 3 };

export const ROLE_LABEL: Record<MemberRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  MEMBER: 'Member',
};

export const getMemberRole = (organisation: Organisation, member: Member): MemberRole => {
  if (member.userId === organisation.ownerUserId) {
    return 'OWNER';
  }

  return getHighestOrganisationRoleInGroup(member.organisationGroupMembers.map((groupMember) => groupMember.group));
};

export const getMemberName = (member: Pick<Member, 'user'>) => member.user.name || member.user.email;

/** Owner first, then admins, managers and members, each group by name. */
export const sortMembers = (organisation: Organisation) =>
  [...organisation.members].sort(
    (a, b) =>
      ROLE_RANK[getMemberRole(organisation, a)] - ROLE_RANK[getMemberRole(organisation, b)] ||
      getMemberName(a).localeCompare(getMemberName(b)),
  );

export type MeterState = 'unlimited' | 'blocked' | 'exceeded' | 'reached' | 'near' | 'within';

export type Meter = {
  key: 'members' | 'teams' | 'documents' | 'emails' | 'api';
  label: string;
  /** The monthly counter behind the meter. Capacity meters have none: they count what exists now. */
  counter?: 'document' | 'email' | 'api';
  used: number;
  limit: number | null;
  percent: number;
  state: MeterState;
};

export const METER_STATE_LABEL: Record<MeterState, string> = {
  unlimited: 'Unlimited',
  blocked: 'Blocked',
  exceeded: 'Exceeded',
  reached: 'Limit reached',
  near: 'Near limit',
  within: 'Within limit',
};

/** Usage against every limit of the claim. Monthly limits read the given `YYYY-MM` period, the current month by default. */
export const getMeters = (organisation: Organisation, period = currentMonthlyPeriod()): Meter[] => {
  const claim = organisation.organisationClaim;
  const stat = organisation.monthlyStats.find((monthlyStat) => monthlyStat.period === period);

  const meter = (meter: Pick<Meter, 'key' | 'label' | 'counter' | 'used' | 'limit'>): Meter => ({
    ...meter,
    percent: getQuotaUsagePercent(meter.used, meter.limit),
    state: getMeterState(meter.used, meter.limit),
  });

  return [
    meter({
      key: 'members',
      label: 'Members',
      used: organisation.members.length,
      limit: normalizeCapacityLimit(claim.memberCount),
    }),
    meter({
      key: 'teams',
      label: 'Teams',
      used: organisation.teams.length,
      limit: normalizeCapacityLimit(claim.teamCount),
    }),
    meter({
      key: 'documents',
      label: 'Documents',
      counter: 'document',
      used: stat?.documentCount ?? 0,
      limit: claim.documentQuota,
    }),
    meter({
      key: 'emails',
      label: 'Emails',
      counter: 'email',
      used: stat?.emailCount ?? 0,
      limit: claim.emailQuota,
    }),
    meter({
      key: 'api',
      label: 'API requests',
      counter: 'api',
      used: stat?.apiCount ?? 0,
      limit: claim.apiQuota,
    }),
  ];
};

/** The meters that are near, at or past their limit, worst first. */
export const getFlaggedMeters = (organisation: Organisation) =>
  getMeters(organisation)
    .filter((meter) => SEVERITY.includes(meter.state))
    .sort((a, b) => SEVERITY.indexOf(a.state) - SEVERITY.indexOf(b.state));

const SEVERITY: MeterState[] = ['blocked', 'exceeded', 'reached', 'near'];

// Mirrors the states of the shipping OrganisationUsagePanel so both read the same.
const getMeterState = (used: number, limit: number | null): MeterState => {
  if (limit === null) {
    return 'unlimited';
  }

  if (limit === 0) {
    return 'blocked';
  }

  if (used > limit) {
    return 'exceeded';
  }

  if (isQuotaExceeded(limit, used)) {
    return 'reached';
  }

  return isQuotaNearing(limit, used) ? 'near' : 'within';
};
