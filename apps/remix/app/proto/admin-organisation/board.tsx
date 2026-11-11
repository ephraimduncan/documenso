import { cn } from '@documenso/ui/lib/utils';
import { Button } from '@documenso/ui/primitives/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@documenso/ui/primitives/dropdown-menu';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@documenso/ui/primitives/sheet';
import { Skeleton } from '@documenso/ui/primitives/skeleton';
import { useLingui } from '@lingui/react/macro';
import { ChevronDownIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useRef, useState } from 'react';
import { Link } from 'react-router';

import { DocumentStatus } from '~/components/general/document/document-status';

import type { Meter, VariantProps } from './data';
import { getMemberName, getMemberRole, getMeters, METER_STATE_LABEL, sortMembers, useInsights, useTeams } from './data';
import {
  Count,
  DocumentsTable,
  EmptyState,
  formatAge,
  METER_TONE,
  MembersTable,
  MeterBar,
  OrganisationHeader,
  PlanSection,
  RoleLabel,
  SettingsSection,
  TeamsTable,
  UsageSection,
} from './parts';

const DOCUMENT_ROWS = 6;
const DOCUMENT_ROW_HEIGHT = 52;
const LIST_HEIGHT = DOCUMENT_ROWS * DOCUMENT_ROW_HEIGHT;
const TEAM_ROWS = 5;
const MEMBER_ROWS = 4;

type SheetId = 'documents' | 'teams' | 'members' | 'usage' | 'plan' | 'settings';

const SHEET_TITLE: Record<SheetId, string> = {
  documents: 'Documents',
  teams: 'Teams',
  members: 'Members',
  usage: 'Usage history',
  plan: 'Plan and limits',
  settings: 'Settings',
};

/**
 * Board: every facet on one screen with nothing to click.
 * Each panel shows its headline figures and newest rows; the full list opens beside the board.
 */
export const BoardVariant = ({ organisation }: VariantProps) => {
  // The sheet keeps its last content while it closes, so the id and the open flag are separate.
  const [sheet, setSheet] = useState<SheetId>('documents');
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const sheetRef = useRef<HTMLDivElement>(null);
  const manageRef = useRef<HTMLButtonElement>(null);

  // Radix returns focus to a DialogTrigger on close. This sheet has several openers and no trigger,
  // so the opener is kept here and focused by hand.
  const openerRef = useRef<HTMLElement | null>(null);

  const openSheet = (id: SheetId, opener: HTMLElement | null) => {
    openerRef.current = opener;

    setSheet(id);
    setIsSheetOpen(true);
  };

  const meters = getMeters(organisation);
  const [members, teams] = meters;

  return (
    <div className="@container space-y-4">
      <OrganisationHeader organisation={organisation}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button ref={manageRef} variant="outline" size="sm" className="pr-2.5">
              Manage
              <ChevronDownIcon className="ml-1.5 h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => openSheet('usage', manageRef.current)}>
              Usage history and resets
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openSheet('plan', manageRef.current)}>Plan and limits</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openSheet('settings', manageRef.current)}>Settings</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </OrganisationHeader>

      <section
        aria-label="Usage against limits"
        className="grid @[640px]:grid-cols-5 grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border"
      >
        {meters.map((meter) => (
          <MeterCell key={meter.key} meter={meter} />
        ))}
      </section>

      <div className="grid @[760px]:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] items-start gap-4">
        <DocumentsPanel organisationId={organisation.id} onViewAll={(opener) => openSheet('documents', opener)} />

        <div className="grid gap-4">
          <TeamsPanel organisation={organisation} meter={teams} onViewAll={(opener) => openSheet('teams', opener)} />
          <MembersPanel
            organisation={organisation}
            meter={members}
            onViewAll={(opener) => openSheet('members', opener)}
          />
        </div>
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent
          ref={sheetRef}
          size="content"
          className="w-full overflow-y-auto pb-20 sm:max-w-[976px]"
          // Focus lands on the sheet, not on its first control, so opening a list does not ring a filter.
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            sheetRef.current?.focus();
          }}
          onCloseAutoFocus={() => openerRef.current?.focus()}
        >
          <SheetHeader>
            <SheetTitle>{SHEET_TITLE[sheet]}</SheetTitle>
            <SheetDescription>{organisation.name}</SheetDescription>
          </SheetHeader>

          <div className="mt-6">
            {sheet === 'documents' && <DocumentsTable organisationId={organisation.id} />}
            {sheet === 'teams' && <TeamsTable organisation={organisation} />}
            {sheet === 'members' && <MembersTable organisation={organisation} />}
            {sheet === 'usage' && <UsageSection organisation={organisation} />}
            {sheet === 'plan' && <PlanSection organisation={organisation} />}
            {sheet === 'settings' && <SettingsSection organisation={organisation} />}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

const MeterCell = ({ meter }: { meter: Meter }) => (
  <div className="bg-background px-4 py-3 @[640px]:last:col-span-1 last:col-span-2">
    <p className="text-muted-foreground text-sm">{meter.label}</p>

    <p className="mt-0.5 tabular-nums">
      <span className="font-semibold text-xl tracking-tight">{meter.used.toLocaleString()}</span>
      {meter.limit !== null && <span className="text-muted-foreground text-sm"> / {meter.limit.toLocaleString()}</span>}
    </p>

    <MeterBar meter={meter} className="mt-2" />

    <p className={cn('mt-2 text-xs', METER_TONE[meter.state].text)}>
      {meter.state === 'unlimited' ? 'No limit' : METER_STATE_LABEL[meter.state]}
      {meter.counter && meter.state !== 'unlimited' && meter.state !== 'blocked' && ' this month'}
    </p>
  </div>
);

const DocumentsPanel = ({ organisationId, onViewAll }: { organisationId: string; onViewAll: OnViewAll }) => {
  const { i18n } = useLingui();

  const { insights } = useInsights({ organisationId, view: 'documents', perPage: DOCUMENT_ROWS });

  const summary = insights?.summary;

  const segments = summary
    ? [
        { label: 'completed', value: summary.completedDocuments, className: 'bg-green-500' },
        { label: 'in progress', value: summary.activeDocuments, className: 'bg-blue-500' },
        {
          label: 'rejected or cancelled',
          value: summary.totalDocuments - summary.completedDocuments - summary.activeDocuments,
          className: 'bg-muted-foreground/40',
        },
      ].filter((segment) => segment.value > 0)
    : [];

  if (summary?.totalDocuments === 0) {
    return (
      <Panel title="Documents" count="0" onViewAll={onViewAll}>
        <div className="flex items-center justify-center border-t" style={{ minHeight: LIST_HEIGHT + 52 }}>
          <EmptyState title="No documents yet">The newest documents of every team appear here.</EmptyState>
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="Documents" count={summary?.totalDocuments.toLocaleString()} onViewAll={onViewAll}>
      <div className="h-[52px] px-4">
        {summary ? (
          <>
            <div
              role="img"
              aria-label={segments.map((segment) => `${segment.value} ${segment.label}`).join(', ')}
              className="flex h-2 gap-0.5 overflow-hidden rounded-full"
            >
              {segments.map((segment) => (
                <div
                  key={segment.label}
                  className={cn('min-w-1', segment.className)}
                  style={{ flexGrow: segment.value }}
                />
              ))}
            </div>

            <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-xs">
              {segments.map((segment) => (
                <li key={segment.label} className="flex items-center gap-1.5">
                  <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', segment.className)} />
                  <span className="font-medium text-foreground tabular-nums">{segment.value.toLocaleString()}</span>
                  {segment.label}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <Skeleton className="h-2 w-full rounded-full" />
        )}
      </div>

      <ul className="divide-y border-t" style={{ minHeight: LIST_HEIGHT }}>
        {!insights &&
          Array.from({ length: DOCUMENT_ROWS }, (_, index) => (
            <li key={index} className="flex items-center px-4" style={{ height: DOCUMENT_ROW_HEIGHT }}>
              <Skeleton className="h-4 w-3/5" />
            </li>
          ))}

        {insights?.documents.map((document) => (
          <li key={document.id} className="flex items-center gap-3 px-4" style={{ height: DOCUMENT_ROW_HEIGHT }}>
            <div className="min-w-0 flex-1">
              <Link
                className="block truncate font-medium text-sm hover:underline"
                to={`/admin/documents/${document.id}`}
                title={document.title}
              >
                {document.title}
              </Link>
              <p className="truncate text-muted-foreground text-xs">{document.teamName}</p>
            </div>

            <DocumentStatus status={document.status} className="shrink-0 text-muted-foreground text-xs" />

            <time
              dateTime={new Date(document.createdAt).toISOString()}
              title={i18n.date(document.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}
              className="w-8 shrink-0 text-right text-muted-foreground text-xs tabular-nums"
            >
              {formatAge(document.createdAt)}
            </time>
          </li>
        ))}
      </ul>
    </Panel>
  );
};

type CapacityPanelProps = VariantProps & {
  meter: Meter;
  onViewAll: OnViewAll;
};

const TeamsPanel = ({ organisation, meter, onViewAll }: CapacityPanelProps) => {
  const teams = useTeams(organisation);

  const most = Math.max(1, ...teams.map((team) => team.documentCount ?? 0));

  return (
    <Panel title="Teams" count={formatCapacity(meter)} onViewAll={onViewAll}>
      <div className="flex justify-between px-4 pb-1.5 text-muted-foreground text-xs">
        <span>Busiest</span>
        <span>Documents</span>
      </div>

      <ul>
        {teams.slice(0, TEAM_ROWS).map((team) => (
          <li key={team.id} className="relative flex h-7 items-center gap-3 px-4">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0.5 left-2 rounded bg-muted"
              style={{ width: `calc((100% - 1rem) * ${(team.documentCount ?? 0) / most})` }}
            />

            <Link
              className="relative min-w-0 flex-1 truncate text-sm hover:underline"
              to={`/admin/teams/${team.id}`}
              title={team.name}
            >
              {team.name}
            </Link>

            <Count value={team.documentCount} className="relative text-sm" />
          </li>
        ))}
      </ul>

      <div className="h-2" />
    </Panel>
  );
};

const MembersPanel = ({ organisation, meter, onViewAll }: CapacityPanelProps) => (
  <Panel title="Members" count={formatCapacity(meter)} onViewAll={onViewAll}>
    <ul className="pb-2">
      {sortMembers(organisation)
        .slice(0, MEMBER_ROWS)
        .map((member) => (
          <li key={member.id} className="flex h-8 items-center gap-3 px-4">
            <Link
              className="min-w-0 flex-1 truncate text-sm hover:underline"
              to={`/admin/users/${member.userId}`}
              title={member.user.email}
            >
              {getMemberName(member)}
            </Link>

            <RoleLabel role={getMemberRole(organisation, member)} />
          </li>
        ))}
    </ul>
  </Panel>
);

const formatCapacity = (meter: Meter) =>
  meter.limit === null
    ? meter.used.toLocaleString()
    : `${meter.used.toLocaleString()} / ${meter.limit.toLocaleString()}`;

type OnViewAll = (opener: HTMLElement) => void;

type PanelProps = {
  title: string;
  count: string | undefined;
  onViewAll: OnViewAll;
  children: ReactNode;
};

const Panel = ({ title, count, onViewAll, children }: PanelProps) => (
  <section className="overflow-hidden rounded-lg border bg-background">
    <div className="flex h-12 items-center justify-between gap-3 pr-2 pl-4">
      <h3 className="flex items-baseline gap-2 font-medium text-sm">
        {title}
        <span className="font-normal text-muted-foreground tabular-nums">{count}</span>
      </h3>

      <Button
        variant="ghost"
        size="sm"
        className="relative h-8 text-muted-foreground before:absolute before:inset-x-0 before:-inset-y-1"
        onClick={(event) => onViewAll(event.currentTarget)}
      >
        View all
        <span className="sr-only"> {title.toLowerCase()}</span>
      </Button>
    </div>

    {children}
  </section>
);
