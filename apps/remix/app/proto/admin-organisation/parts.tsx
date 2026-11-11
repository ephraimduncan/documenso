import { useCopyToClipboard } from '@documenso/lib/client-only/hooks/use-copy-to-clipboard';
import type { DocumentInsights } from '@documenso/lib/server-only/admin/get-organisation-detailed-insights';
import type { DateRange } from '@documenso/lib/types/search-params';
import { currentMonthlyPeriod } from '@documenso/lib/universal/monthly-period';
import { trpc } from '@documenso/trpc/react';
import { cn } from '@documenso/ui/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@documenso/ui/primitives/alert';
import type { BadgeProps } from '@documenso/ui/primitives/badge';
import { Badge } from '@documenso/ui/primitives/badge';
import { Button } from '@documenso/ui/primitives/button';
import { DataTable, type DataTableColumnDef } from '@documenso/ui/primitives/data-table';
import { DataTablePagination } from '@documenso/ui/primitives/data-table-pagination';
import { Input } from '@documenso/ui/primitives/input';
import { Popover, PopoverContent, PopoverTrigger } from '@documenso/ui/primitives/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@documenso/ui/primitives/select';
import { Skeleton } from '@documenso/ui/primitives/skeleton';
import { TableCell } from '@documenso/ui/primitives/table';
import { useToast } from '@documenso/ui/primitives/use-toast';
import { useLingui } from '@lingui/react/macro';
import { SubscriptionStatus } from '@prisma/client';
import type { Table } from '@tanstack/react-table';
import { CheckIcon, CopyIcon, ExternalLinkIcon, MoreHorizontalIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import { AdminOrganisationDeleteDialog } from '~/components/dialogs/admin-organisation-delete-dialog';
import { AdminOrganisationMemberDeleteDialog } from '~/components/dialogs/admin-organisation-member-delete-dialog';
import { AdminOrganisationMemberUpdateDialog } from '~/components/dialogs/admin-organisation-member-update-dialog';
import { AdminOrganisationSyncSubscriptionDialog } from '~/components/dialogs/admin-organisation-sync-subscription-dialog';
import { AdminGlobalSettingsSection } from '~/components/general/admin-global-settings-section';
import { DocumentStatus } from '~/components/general/document/document-status';
import { OrganisationUsageResetButton } from '~/components/general/organisation-usage-reset-button';

import type { Member, MemberRole, Meter, MeterState, TeamRow, VariantProps } from './data';
import {
  getMemberName,
  getMemberRole,
  getMeters,
  getSubscriptionLabel,
  METER_STATE_LABEL,
  ROLE_LABEL,
  sortMembers,
  useForms,
  useInsights,
  useTeams,
} from './data';

export const OrganisationHeader = ({ organisation, children }: VariantProps & { children?: ReactNode }) => {
  const { i18n } = useLingui();

  const owner = organisation.members.find((member) => member.userId === organisation.ownerUserId);

  return (
    <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h2 className="text-balance font-semibold text-2xl tracking-tight">{organisation.name}</h2>
          <SubscriptionBadge organisation={organisation} />
        </div>

        <dl className="flex flex-wrap items-center gap-x-5 gap-y-1 text-muted-foreground text-sm">
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">ID</dt>
            <dd className="flex items-center gap-1 font-mono text-xs">
              {organisation.id}
              <CopyButton value={organisation.id} label="Copy organization ID" />
            </dd>
          </div>

          <div className="flex min-w-0 gap-1.5">
            <dt>Owner</dt>
            <dd className="min-w-0">
              {owner ? (
                <Link
                  className="block max-w-64 truncate font-medium text-foreground hover:underline"
                  to={`/admin/users/${owner.userId}`}
                  title={owner.user.email}
                >
                  {getMemberName(owner)}
                </Link>
              ) : (
                'None'
              )}
            </dd>
          </div>

          <div className="flex gap-1.5">
            <dt>Created</dt>
            <dd className="text-foreground">{i18n.date(organisation.createdAt, { dateStyle: 'medium' })}</dd>
          </div>
        </dl>
      </div>

      {children}
    </header>
  );
};

const SubscriptionBadge = ({ organisation }: VariantProps) => {
  const status = organisation.subscription?.status;

  const variant: BadgeProps['variant'] =
    status === SubscriptionStatus.ACTIVE
      ? 'default'
      : status === SubscriptionStatus.PAST_DUE
        ? 'destructive'
        : 'neutral';

  return (
    <Badge variant={variant} size="small">
      {getSubscriptionLabel(organisation)}
    </Badge>
  );
};

const CopyButton = ({ value, label }: { value: string; label: string }) => {
  const [, copy] = useCopyToClipboard();
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!isCopied) {
      return;
    }

    const timeout = setTimeout(() => setIsCopied(false), 1500);

    return () => clearTimeout(timeout);
  }, [isCopied]);

  return (
    <button
      type="button"
      aria-label={label}
      className="relative rounded-sm p-1 text-muted-foreground before:absolute before:-inset-2.5 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-foreground/40"
      onClick={async () => setIsCopied(await copy(value))}
    >
      {isCopied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
    </button>
  );
};

export const METER_TONE: Record<MeterState, { bar: string; text: string; badge: BadgeProps['variant'] }> = {
  within: { bar: 'bg-primary', text: 'text-muted-foreground', badge: 'default' },
  near: {
    bar: 'bg-yellow-500 dark:bg-yellow-400',
    text: 'text-yellow-700 dark:text-yellow-400',
    badge: 'warning',
  },
  reached: {
    bar: 'bg-orange-500 dark:bg-orange-400',
    text: 'text-orange-700 dark:text-orange-400',
    badge: 'orange',
  },
  exceeded: { bar: 'bg-destructive', text: 'text-red-700 dark:text-red-400', badge: 'destructive' },
  blocked: { bar: 'bg-destructive', text: 'text-red-700 dark:text-red-400', badge: 'destructive' },
  unlimited: { bar: 'bg-muted-foreground/40', text: 'text-muted-foreground', badge: 'neutral' },
};

export const MeterDot = ({ state, className }: { state: MeterState; className?: string }) => (
  <span aria-hidden="true" className={cn('h-2 w-2 shrink-0 rounded-full', METER_TONE[state].bar, className)} />
);

export const MeterBar = ({ meter, className }: { meter: Meter; className?: string }) => {
  if (meter.limit === null) {
    return <div className={cn('h-1.5', className)} />;
  }

  return (
    <div
      role="progressbar"
      aria-label={`${meter.label} used`}
      aria-valuemin={0}
      aria-valuemax={meter.limit}
      aria-valuenow={meter.used}
      className={cn('h-1.5 overflow-hidden rounded-full bg-secondary', className)}
    >
      <div
        className={cn('h-full rounded-full', METER_TONE[meter.state].bar)}
        style={{ width: `${meter.state === 'blocked' ? 100 : meter.percent}%` }}
      />
    </div>
  );
};

/** "47 / 50", or the bare count when there is no limit. */
export const MeterCount = ({ meter, className }: { meter: Meter; className?: string }) => (
  <span className={cn('tabular-nums', className)}>
    {meter.used.toLocaleString()}
    {meter.limit !== null && <span className="text-muted-foreground"> / {meter.limit.toLocaleString()}</span>}
  </span>
);

const MeterBadge = ({ meter }: { meter: Meter }) => (
  <Badge variant={METER_TONE[meter.state].badge} size="small">
    {METER_STATE_LABEL[meter.state]}
  </Badge>
);

export const RoleLabel = ({ role }: { role: MemberRole }) => {
  if (role === 'MEMBER') {
    return <span className="text-muted-foreground text-sm">{ROLE_LABEL[role]}</span>;
  }

  return (
    <Badge variant={role === 'OWNER' ? 'default' : 'neutral'} size="small">
      {ROLE_LABEL[role]}
    </Badge>
  );
};

/** Compact age for dense lists: 5m, 3h, 12d, 6w, 8mo. Pair it with a title that carries the full date. */
export const formatAge = (date: Date) => {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(date).getTime()) / 60_000));

  if (minutes < 60) {
    return `${minutes}m`;
  }

  if (minutes < 60 * 24) {
    return `${Math.round(minutes / 60)}h`;
  }

  const days = Math.round(minutes / (60 * 24));

  if (days < 14) {
    return `${days}d`;
  }

  return days < 60 ? `${Math.round(days / 7)}w` : `${Math.round(days / 30)}mo`;
};

const DATE_RANGE_LABEL: Record<DateRange, string> = {
  last30days: 'Last 30 days',
  last90days: 'Last 90 days',
  lastYear: 'Last year',
  allTime: 'All time',
};

const DateRangeSelect = ({
  value,
  onChange,
  className,
}: {
  value: DateRange;
  onChange: (value: DateRange) => void;
  className?: string;
}) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger className={cn('h-9 w-40', className)} aria-label="Created in">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {Object.entries(DATE_RANGE_LABEL).map(([range, label]) => (
        <SelectItem key={range} value={range}>
          {label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export const DocumentsTable = ({ organisationId }: { organisationId: string }) => {
  const { i18n } = useLingui();

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [dateRange, setDateRange] = useState<DateRange>('allTime');

  const { insights, isLoading } = useInsights({ organisationId, view: 'documents', page, perPage, dateRange });

  const count = insights?.summary?.documentsThisPeriod;

  const columns = [
    {
      header: 'Title',
      accessorKey: 'title',
      cell: ({ row }) => (
        <Link
          className="block max-w-[300px] truncate font-medium hover:underline"
          to={`/admin/documents/${row.original.id}`}
          title={row.original.title}
        >
          {row.original.title}
        </Link>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ row }) => <DocumentStatus status={row.original.status} />,
    },
    {
      header: 'Team',
      accessorKey: 'teamName',
      cell: ({ row }) => (
        <span className="block max-w-[160px] truncate text-muted-foreground" title={row.original.teamName}>
          {row.original.teamName}
        </span>
      ),
    },
    {
      header: 'Created',
      accessorKey: 'createdAt',
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-muted-foreground tabular-nums">
          {i18n.date(row.original.createdAt, { dateStyle: 'medium' })}
        </span>
      ),
    },
    {
      header: 'Completed',
      accessorKey: 'completedAt',
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-muted-foreground tabular-nums">
          {row.original.completedAt ? i18n.date(row.original.completedAt, { dateStyle: 'medium' }) : '–'}
        </span>
      ),
    },
  ] satisfies DataTableColumnDef<DocumentInsights>[];

  return (
    <div className="space-y-3">
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm tabular-nums">
          {count === undefined && 'Loading documents…'}
          {count === 0 && 'No documents'}
          {count ? `${count.toLocaleString()} ${count === 1 ? 'document' : 'documents'} created, newest first` : null}
        </p>

        {(count !== 0 || dateRange !== 'allTime') && (
          <DateRangeSelect
            value={dateRange}
            onChange={(range) => {
              setDateRange(range);
              setPage(1);
            }}
          />
        )}
      </div>

      <div className={cn(isLoading && insights && 'opacity-60')}>
        <DataTable
          columns={columns}
          data={insights?.documents ?? []}
          perPage={perPage}
          currentPage={page}
          totalPages={insights?.totalPages ?? 1}
          onPaginationChange={(nextPage, nextPerPage) => {
            setPage(nextPage);
            setPerPage(nextPerPage);
          }}
          skeleton={{ enable: !insights, rows: perPage, component: <SkeletonCells widths={[260, 90, 120, 90, 90]} /> }}
          emptyState={
            dateRange === 'allTime' ? (
              <EmptyState title="No documents yet">
                Documents created by this organization’s teams appear here.
              </EmptyState>
            ) : (
              <EmptyState
                title={`No documents created in the ${DATE_RANGE_LABEL[dateRange].toLowerCase()}`}
                action={
                  <Button variant="outline" size="sm" onClick={() => setDateRange('allTime')}>
                    Show all time
                  </Button>
                }
              />
            )
          }
        >
          {renderPagination}
        </DataTable>
      </div>
    </div>
  );
};

export const MembersTable = ({ organisation }: VariantProps) => {
  const { i18n } = useLingui();

  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const members = filterMembers(sortMembers(organisation), query);
  const totalPages = Math.max(1, Math.ceil(members.length / perPage));
  const currentPage = Math.min(page, totalPages);

  const columns = [
    {
      header: 'Member',
      cell: ({ row }) => (
        <div className="max-w-[380px]">
          <Link
            className="block truncate font-medium hover:underline"
            to={`/admin/users/${row.original.userId}`}
            title={getMemberName(row.original)}
          >
            {getMemberName(row.original)}
          </Link>
          {row.original.user.name && (
            <div className="truncate text-muted-foreground text-xs" title={row.original.user.email}>
              {row.original.user.email}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Role',
      cell: ({ row }) => <RoleLabel role={getMemberRole(organisation, row.original)} />,
    },
    {
      header: 'Joined',
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-muted-foreground tabular-nums">
          {i18n.date(row.original.createdAt, { dateStyle: 'medium' })}
        </span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex justify-end">
          <MemberActions organisation={organisation} member={row.original} />
        </div>
      ),
    },
  ] satisfies DataTableColumnDef<Member>[];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm tabular-nums">
          {query
            ? `${members.length} of ${organisation.members.length} members`
            : `${organisation.members.length} ${organisation.members.length === 1 ? 'member' : 'members'}, by role`}
        </p>

        <Input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          placeholder="Filter by name or email"
          aria-label="Filter members by name or email"
          className="h-9 w-64"
        />
      </div>

      <DataTable
        columns={columns}
        data={members.slice((currentPage - 1) * perPage, currentPage * perPage)}
        perPage={perPage}
        currentPage={currentPage}
        totalPages={totalPages}
        onPaginationChange={(nextPage, nextPerPage) => {
          setPage(nextPage);
          setPerPage(nextPerPage);
        }}
        emptyState={
          <EmptyState
            title={`No member matches “${query}”`}
            action={
              <Button variant="outline" size="sm" onClick={() => setQuery('')}>
                Clear filter
              </Button>
            }
          />
        }
      >
        {renderPagination}
      </DataTable>
    </div>
  );
};

/** Paging controls only once there is a second page, or a page size to step back down from. */
export const renderPagination = <T,>(table: Table<T>) => {
  if (table.getPageCount() <= 1 && table.getState().pagination.pageSize <= 10) {
    return null;
  }

  return <DataTablePagination table={table} additionalInformation="None" />;
};

const filterMembers = (members: Member[], query: string) => {
  const needle = query.trim().toLowerCase();

  if (!needle) {
    return members;
  }

  return members.filter(
    (member) => member.user.email.toLowerCase().includes(needle) || member.user.name?.toLowerCase().includes(needle),
  );
};

/** Role change and removal behind one quiet trigger, so a list of members is not a column of red buttons. */
const MemberActions = ({ organisation, member }: VariantProps & { member: Member }) => {
  const isOwner = member.userId === organisation.ownerUserId;
  const name = getMemberName(member);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          aria-label={`Manage ${name}`}
          className="relative h-8 w-8 p-0 text-muted-foreground before:absolute before:-inset-1"
        >
          <MoreHorizontalIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>

      {/* z-[62] clears the product's Sheet (z-[61]), where this list also renders. */}
      <PopoverContent align="end" className="z-[62] flex w-48 flex-col gap-2 p-2">
        <AdminOrganisationMemberUpdateDialog
          trigger={<Button variant="outline">Update role</Button>}
          organisationId={organisation.id}
          organisationMember={member}
          isOwner={isOwner}
        />

        {isOwner ? (
          <p className="px-1 text-muted-foreground text-xs">Transfer ownership before removing the owner.</p>
        ) : (
          <AdminOrganisationMemberDeleteDialog
            organisationId={organisation.id}
            organisationName={organisation.name}
            organisationMemberId={member.id}
            organisationMemberName={name}
            organisationMemberEmail={member.user.email}
          />
        )}
      </PopoverContent>
    </Popover>
  );
};

export const TeamsTable = ({ organisation }: VariantProps) => {
  const { i18n } = useLingui();

  const teams = useTeams(organisation);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const totalPages = Math.max(1, Math.ceil(teams.length / perPage));
  const currentPage = Math.min(page, totalPages);

  const columns = [
    {
      header: 'Team',
      cell: ({ row }) => (
        <div className="max-w-[420px]">
          <Link
            className="block truncate font-medium hover:underline"
            to={`/admin/teams/${row.original.id}`}
            title={row.original.name}
          >
            {row.original.name}
          </Link>
          <div className="truncate font-mono text-muted-foreground text-xs">/t/{row.original.url}</div>
        </div>
      ),
    },
    {
      id: 'members',
      header: () => <div className="text-right">Members</div>,
      cell: ({ row }) => <Count value={row.original.memberCount} />,
    },
    {
      id: 'documents',
      header: () => <div className="text-right">Documents</div>,
      cell: ({ row }) => <Count value={row.original.documentCount} />,
    },
    {
      header: 'Created',
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-muted-foreground tabular-nums">
          {i18n.date(row.original.createdAt, { dateStyle: 'medium' })}
        </span>
      ),
    },
  ] satisfies DataTableColumnDef<TeamRow>[];

  return (
    <div className="space-y-3">
      <p className="flex min-h-9 items-center text-muted-foreground text-sm tabular-nums">
        {teams.length} {teams.length === 1 ? 'team' : 'teams'}, busiest first
      </p>

      <DataTable
        columns={columns}
        data={teams.slice((currentPage - 1) * perPage, currentPage * perPage)}
        perPage={perPage}
        currentPage={currentPage}
        totalPages={totalPages}
        onPaginationChange={(nextPage, nextPerPage) => {
          setPage(nextPage);
          setPerPage(nextPerPage);
        }}
      >
        {renderPagination}
      </DataTable>
    </div>
  );
};

/** A right-aligned number that holds its width while the count loads. */
export const Count = ({ value, className }: { value: number | undefined; className?: string }) => (
  <div className={cn('flex justify-end tabular-nums', className)}>
    {value === undefined ? <Skeleton className="h-4 w-6" /> : value.toLocaleString()}
  </div>
);

/** Every limit as one aligned row: capacity first, then the monthly counters with their resets. */
export const UsageSection = ({ organisation }: VariantProps) => {
  const currentPeriod = currentMonthlyPeriod();

  const [period, setPeriod] = useState(currentPeriod);

  // The current month has no stat row until its first counted event, so it is always offered.
  const periods = [...new Set([currentPeriod, ...organisation.monthlyStats.map((stat) => stat.period)])];

  const meters = getMeters(organisation, period);
  const reports = organisation.monthlyStats.find((stat) => stat.period === period)?.emailReports ?? 0;

  return (
    <div className="space-y-8">
      <section>
        <SectionHeading title="Capacity" description="Counted now. These do not reset." />

        <ul className="mt-3 divide-y rounded-lg border">
          {meters
            .filter((meter) => !meter.counter)
            .map((meter) => (
              <MeterRow key={meter.key} meter={meter} />
            ))}
        </ul>
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <SectionHeading
            title="Monthly usage"
            description={
              period === currentPeriod
                ? 'Counters reset on the first of each month, UTC.'
                : 'A past month, read against the limits of today.'
            }
          />

          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-9 w-36 tabular-nums" aria-label="Month">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periods.map((option) => (
                <SelectItem key={option} value={option} className="tabular-nums">
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ul className="mt-3 divide-y rounded-lg border">
          {meters.map(
            (meter) =>
              meter.counter && (
                <MeterRow
                  key={meter.key}
                  meter={meter}
                  action={
                    period === currentPeriod && (
                      <OrganisationUsageResetButton organisationId={organisation.id} counter={meter.counter} />
                    )
                  }
                />
              ),
          )}

          <li className="flex h-14 items-center gap-4 px-4 text-sm">
            <span className="flex-1 font-medium">Reports sent</span>
            <span className="w-28 shrink-0 text-right tabular-nums">{reports.toLocaleString()}</span>
            {/* The width of a badge slot, a gap and an action slot, so the figure sits in the count column. */}
            <span className="w-[216px] shrink-0" />
          </li>
        </ul>
      </section>
    </div>
  );
};

/** The trailing slot is reserved even when empty, so bars and figures line up down the list. */
const MeterRow = ({ meter, action }: { meter: Meter; action?: ReactNode }) => (
  <li className="flex min-h-14 items-center gap-4 px-4 py-2 text-sm">
    <span className="w-28 shrink-0 font-medium">{meter.label}</span>

    <MeterBar meter={meter} className="min-w-12 flex-1" />

    <MeterCount meter={meter} className="w-28 shrink-0 text-right" />

    <span className="flex w-28 shrink-0">
      <MeterBadge meter={meter} />
    </span>

    <span className="flex w-[88px] shrink-0 justify-end">{action}</span>
  </li>
);

export const PlanSection = ({ organisation }: VariantProps) => {
  const { EntitlementsForm, licenseFlags } = useForms();

  return (
    <div className="space-y-6">
      <SubscriptionPanel organisation={organisation} />
      <EntitlementsForm organisation={organisation} licenseFlags={licenseFlags} />
    </div>
  );
};

// The subscription block of the shipping page, unchanged in behaviour.
const SubscriptionPanel = ({ organisation }: VariantProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const { subscription, customerId } = organisation;

  const { mutateAsync: createStripeCustomer, isPending } = trpc.admin.stripe.createCustomer.useMutation({
    onSuccess: async () => {
      await navigate(0);

      toast({ title: 'Stripe customer created' });
    },
    onError: () => {
      toast({
        title: 'Stripe customer not created',
        description: 'Stripe did not accept the request. Try again.',
        variant: 'destructive',
      });
    },
  });

  return (
    <Alert
      className={cn(
        'flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center',
        subscription?.status === SubscriptionStatus.ACTIVE &&
          'border border-green-600/20 bg-green-50 dark:border-green-500/20 dark:bg-green-500/10',
      )}
      variant={subscription?.status === SubscriptionStatus.PAST_DUE ? 'destructive' : 'neutral'}
    >
      <div>
        <AlertTitle>Subscription</AlertTitle>
        <AlertDescription>{getSubscriptionLabel(organisation)}</AlertDescription>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        {!customerId && (
          <Button
            variant="outline"
            className="bg-background"
            loading={isPending}
            onClick={async () => createStripeCustomer({ organisationId: organisation.id })}
          >
            Create Stripe customer
          </Button>
        )}

        {customerId && !subscription && (
          <Button variant="outline" className="bg-background" asChild>
            <Link
              target="_blank"
              to={`https://dashboard.stripe.com/customers/${customerId}?create=subscription&subscription_default_customer=${customerId}`}
            >
              Create subscription
              <ExternalLinkIcon className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        )}

        {subscription && (
          <>
            <AdminOrganisationSyncSubscriptionDialog
              organisationId={organisation.id}
              trigger={
                <Button variant="outline" className="bg-background">
                  Sync from Stripe
                </Button>
              }
            />

            <Button variant="outline" className="bg-background" asChild>
              <Link target="_blank" to={`https://dashboard.stripe.com/subscriptions/${subscription.planId}`}>
                Open in Stripe
                <ExternalLinkIcon className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </>
        )}
      </div>
    </Alert>
  );
};

export const SettingsSection = ({ organisation }: VariantProps) => {
  const { DetailsForm } = useForms();

  return (
    <div className="space-y-10">
      <section>
        <SectionHeading title="Name and URL" />
        <div className="mt-4">
          <DetailsForm organisation={organisation} />
        </div>
      </section>

      <section>
        <SectionHeading
          title="Global settings"
          description="Defaults this organization applies to its teams. Read only."
        />
        <div className="mt-4">
          <AdminGlobalSettingsSection settings={organisation.organisationGlobalSettings} />
        </div>
      </section>

      <section>
        <SectionHeading title="Delete organization" />
        <Alert
          className="mt-4 flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-center"
          variant="destructive"
        >
          <AlertDescription className="max-w-prose">
            Deletion is permanent. Documents are orphaned, not deleted, and stay reachable through the deleted-account
            service account.
          </AlertDescription>

          <AdminOrganisationDeleteDialog organisationId={organisation.id} organisationName={organisation.name} />
        </Alert>
      </section>
    </div>
  );
};

const SectionHeading = ({ title, description }: { title: string; description?: string }) => (
  <div>
    <h3 className="font-semibold text-base">{title}</h3>
    {description && <p className="mt-1 text-muted-foreground text-sm">{description}</p>}
  </div>
);

export const EmptyState = ({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) => (
  <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
    <p className="font-medium text-foreground text-sm">{title}</p>
    {children && <p className="max-w-sm text-muted-foreground text-sm">{children}</p>}
    {action}
  </div>
);

export const SkeletonCells = ({ widths }: { widths: number[] }) => (
  <>
    {widths.map((width, index) => (
      <TableCell key={index}>
        <Skeleton className="h-5" style={{ width }} />
      </TableCell>
    ))}
  </>
);

export const PageSkeleton = () => (
  <div className="space-y-6" role="status" aria-label="Loading organization">
    <div className="space-y-2">
      <Skeleton className="h-8 w-96 max-w-full" />
      <Skeleton className="h-5 w-[32rem] max-w-full" />
    </div>
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-80 w-full" />
  </div>
);
