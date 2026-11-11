import { trpc } from '@documenso/trpc/react';
import { cn } from '@documenso/ui/lib/utils';
import { Button } from '@documenso/ui/primitives/button';
import { DataTable, type DataTableColumnDef } from '@documenso/ui/primitives/data-table';
import { Input } from '@documenso/ui/primitives/input';
import { Skeleton } from '@documenso/ui/primitives/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@documenso/ui/primitives/tabs';
import { useLingui } from '@lingui/react/macro';
import type { DocumentStatus as DocumentStatusValue } from '@prisma/client';
import { TeamMemberRole } from '@prisma/client';
import { ExternalLinkIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Link } from 'react-router';

import { DocumentStatus } from '~/components/general/document/document-status';

import type { TeamRow, VariantProps } from './data';
import { getFlaggedMeters, METER_STATE_LABEL, useInsights, useTeams, useUrlState } from './data';
import {
  Count,
  EmptyState,
  MembersTable,
  MeterDot,
  OrganisationHeader,
  PlanSection,
  RoleLabel,
  renderPagination,
  SettingsSection,
  SkeletonCells,
  UsageSection,
} from './parts';

const PER_PAGE = 10;

/** Past this many teams the rail gets a filter and scrolls on its own. */
const RAIL_FILTER_FROM = 8;

/**
 * Explorer: the organisation's own structure is the navigation.
 * Pick a team in the rail and the pane shows that team's documents and members.
 */
export const ExplorerVariant = ({ organisation }: VariantProps) => {
  const [scope, setScope] = useUrlState('scope', 'all');
  const [teamQuery, setTeamQuery] = useState('');

  const teams = useTeams(organisation);
  const { insights } = useInsights({ organisationId: organisation.id, view: 'documents', perPage: 1 });

  const selectedTeam = teams.find((team) => `team-${team.id}` === scope);
  const visibleTeams = teams.filter((team) => team.name.toLowerCase().includes(teamQuery.trim().toLowerCase()));

  const [worst] = getFlaggedMeters(organisation);

  return (
    <div className="@container space-y-6">
      <OrganisationHeader organisation={organisation} />

      <div className="grid @[720px]:grid-cols-[224px_minmax(0,1fr)] items-start gap-6">
        <nav aria-label="Organization sections" className="space-y-5">
          <RailGroup label="Teams">
            <RailItem isActive={scope === 'all'} onSelect={() => setScope('all')}>
              <span className="min-w-0 flex-1 truncate">All teams</span>
              <Count value={insights?.summary?.totalDocuments} className="text-muted-foreground text-xs" />
            </RailItem>

            {teams.length > RAIL_FILTER_FROM && (
              <li className="py-1">
                <Input
                  type="search"
                  value={teamQuery}
                  onChange={(event) => setTeamQuery(event.target.value)}
                  placeholder="Filter teams"
                  aria-label="Filter teams by name"
                  className="h-8"
                />
              </li>
            )}

            <li>
              <ul className={cn('space-y-px', teams.length > RAIL_FILTER_FROM && 'max-h-[518px] overflow-y-auto')}>
                {visibleTeams.map((team) => (
                  <RailItem
                    key={team.id}
                    isActive={scope === `team-${team.id}`}
                    onSelect={() => setScope(`team-${team.id}`)}
                    title={team.name}
                  >
                    <span className="min-w-0 flex-1 truncate">{team.name}</span>
                    <Count value={team.documentCount} className="text-muted-foreground text-xs" />
                  </RailItem>
                ))}

                {visibleTeams.length === 0 && (
                  <li className="px-2.5 py-2 text-muted-foreground text-sm">No team matches “{teamQuery}”</li>
                )}
              </ul>
            </li>
          </RailGroup>

          <RailGroup label="Organization">
            <RailItem isActive={scope === 'usage'} onSelect={() => setScope('usage')}>
              <span className="flex-1">Usage</span>
              {worst && (
                <>
                  <MeterDot state={worst.state} />
                  <span className="sr-only">
                    {worst.label} {METER_STATE_LABEL[worst.state].toLowerCase()}
                  </span>
                </>
              )}
            </RailItem>

            <RailItem isActive={scope === 'plan'} onSelect={() => setScope('plan')}>
              Plan and limits
            </RailItem>

            <RailItem isActive={scope === 'settings'} onSelect={() => setScope('settings')}>
              Settings
            </RailItem>
          </RailGroup>
        </nav>

        <div className="min-w-0">
          {scope === 'usage' && (
            <Pane title="Usage">
              <UsageSection organisation={organisation} />
            </Pane>
          )}

          {scope === 'plan' && (
            <Pane title="Plan and limits">
              <PlanSection organisation={organisation} />
            </Pane>
          )}

          {scope === 'settings' && (
            <Pane title="Settings">
              <SettingsSection organisation={organisation} />
            </Pane>
          )}

          {selectedTeam && <TeamPane key={selectedTeam.id} team={selectedTeam} />}

          {/* An unknown scope, such as a team that was since deleted, falls back to the whole organisation. */}
          {!selectedTeam && !['usage', 'plan', 'settings'].includes(scope) && (
            <AllTeamsPane organisation={organisation} documentCount={insights?.summary?.totalDocuments} />
          )}
        </div>
      </div>
    </div>
  );
};

const AllTeamsPane = ({ organisation, documentCount }: VariantProps & { documentCount: number | undefined }) => {
  const [view, setView] = useState('documents');
  const [page, setPage] = useState(1);

  const { insights } = useInsights({ organisationId: organisation.id, view: 'documents', page, perPage: PER_PAGE });

  return (
    <Pane title="All teams" description={`Every document and member of ${organisation.name}`}>
      <ViewToggle
        view={view}
        onChange={setView}
        documentCount={documentCount}
        memberCount={organisation.members.length}
      />

      {view === 'documents' ? (
        <DocumentRows
          documents={insights?.documents.map((document) => ({ ...document, context: document.teamName }))}
          contextLabel="Team"
          page={page}
          totalPages={insights?.totalPages ?? 1}
          onPageChange={setPage}
          emptyMessage="Documents created by this organization’s teams appear here."
        />
      ) : (
        <MembersTable organisation={organisation} />
      )}
    </Pane>
  );
};

const TeamPane = ({ team }: { team: TeamRow }) => {
  const { i18n } = useLingui();

  const [view, setView] = useState('documents');
  const [page, setPage] = useState(1);

  const { data: documents } = trpc.admin.document.find.useQuery(
    { query: `team:${team.id}`, page, perPage: PER_PAGE },
    { placeholderData: (previous) => previous },
  );

  const { data: details } = trpc.admin.team.get.useQuery({ teamId: team.id });

  const memberColumns = [
    {
      header: 'Member',
      cell: ({ row }) => (
        <div className="max-w-[320px]">
          <Link
            className="block truncate font-medium hover:underline"
            to={`/admin/users/${row.original.userId}`}
            title={row.original.user.name || row.original.user.email}
          >
            {row.original.user.name || row.original.user.email}
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
      header: 'Team role',
      cell: ({ row }) => <RoleLabel role={row.original.teamRole} />,
    },
    {
      header: 'Joined',
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-muted-foreground tabular-nums">
          {i18n.date(row.original.createdAt, { dateStyle: 'medium' })}
        </span>
      ),
    },
  ] satisfies DataTableColumnDef<NonNullable<typeof details>['teamMembers'][number]>[];

  // Team admins first: they are the people to contact about the team.
  const members = [...(details?.teamMembers ?? [])].sort(
    (a, b) =>
      TEAM_ROLE_RANK[a.teamRole] - TEAM_ROLE_RANK[b.teamRole] ||
      (a.user.name || a.user.email).localeCompare(b.user.name || b.user.email),
  );

  return (
    <Pane
      title={team.name}
      description={<span className="font-mono text-xs">/t/{team.url}</span>}
      action={
        <Button variant="outline" size="sm" className="shrink-0 whitespace-nowrap pr-2.5" asChild>
          <Link to={`/admin/teams/${team.id}`}>
            Open team
            <ExternalLinkIcon className="ml-1.5 h-3.5 w-3.5 text-muted-foreground" />
          </Link>
        </Button>
      }
    >
      <ViewToggle
        view={view}
        onChange={setView}
        documentCount={documents?.count ?? team.documentCount}
        memberCount={details?.memberCount ?? team.memberCount}
      />

      {view === 'documents' ? (
        <DocumentRows
          documents={documents?.data.map((document) => ({
            id: document.envelopeId,
            title: document.title,
            status: document.status,
            createdAt: document.createdAt,
            context: document.user.name || document.user.email,
          }))}
          contextLabel="Sender"
          page={page}
          totalPages={documents?.totalPages ?? 1}
          onPageChange={setPage}
          emptyMessage="This team has not created a document."
        />
      ) : (
        <DataTable
          columns={memberColumns}
          data={members}
          skeleton={{ enable: !details, rows: 5, component: <SkeletonCells widths={[220, 70, 90]} /> }}
          emptyState={<EmptyState title="No members">Nobody is assigned to this team.</EmptyState>}
        />
      )}
    </Pane>
  );
};

const TEAM_ROLE_RANK: Record<TeamMemberRole, number> = {
  [TeamMemberRole.ADMIN]: 0,
  [TeamMemberRole.MANAGER]: 1,
  [TeamMemberRole.MEMBER]: 2,
};

type DocumentRow = {
  id: string;
  title: string;
  status: DocumentStatusValue;
  createdAt: Date;
  /** The team for organisation-wide lists, the sender inside a team. */
  context: string;
};

type DocumentRowsProps = {
  documents: DocumentRow[] | undefined;
  contextLabel: string;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  emptyMessage: string;
};

const DocumentRows = ({ documents, contextLabel, page, totalPages, onPageChange, emptyMessage }: DocumentRowsProps) => {
  const { i18n } = useLingui();

  const columns = [
    {
      header: `Title and ${contextLabel.toLowerCase()}`,
      cell: ({ row }) => (
        <div className="max-w-[340px]">
          <Link
            className="block truncate font-medium hover:underline"
            to={`/admin/documents/${row.original.id}`}
            title={row.original.title}
          >
            {row.original.title}
          </Link>
          <div className="truncate text-muted-foreground text-xs" title={row.original.context}>
            {row.original.context}
          </div>
        </div>
      ),
    },
    {
      header: 'Status',
      cell: ({ row }) => <DocumentStatus status={row.original.status} />,
    },
    {
      header: 'Created',
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-muted-foreground tabular-nums">
          {i18n.date(row.original.createdAt, { dateStyle: 'medium' })}
        </span>
      ),
    },
  ] satisfies DataTableColumnDef<DocumentRow>[];

  return (
    <DataTable
      columns={columns}
      data={documents ?? []}
      perPage={PER_PAGE}
      currentPage={page}
      totalPages={totalPages}
      onPaginationChange={(nextPage) => onPageChange(nextPage)}
      skeleton={{ enable: !documents, rows: PER_PAGE, component: <SkeletonCells widths={[260, 90, 90]} /> }}
      emptyState={<EmptyState title="No documents yet">{emptyMessage}</EmptyState>}
    >
      {renderPagination}
    </DataTable>
  );
};

type ViewToggleProps = {
  view: string;
  onChange: (view: string) => void;
  documentCount: number | undefined;
  memberCount: number | undefined;
};

const ViewToggle = ({ view, onChange, documentCount, memberCount }: ViewToggleProps) => (
  <Tabs value={view} onValueChange={onChange} className="mb-4">
    <TabsList>
      <TabsTrigger value="documents">
        Documents
        <ToggleCount value={documentCount} />
      </TabsTrigger>
      <TabsTrigger value="members">
        Members
        <ToggleCount value={memberCount} />
      </TabsTrigger>
    </TabsList>
  </Tabs>
);

const ToggleCount = ({ value }: { value: number | undefined }) => (
  <span className="ml-2 inline-flex min-w-[2ch] justify-end text-muted-foreground text-xs tabular-nums">
    {value === undefined ? <Skeleton className="h-3 w-5" /> : value.toLocaleString()}
  </span>
);

type PaneProps = {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
};

const Pane = ({ title, description, action, children }: PaneProps) => (
  <section>
    <div className="mb-4 flex min-h-11 items-start justify-between gap-4">
      <div className="min-w-0">
        <h3 className="text-balance font-semibold text-lg leading-snug">{title}</h3>
        {description && <p className="mt-0.5 truncate text-muted-foreground text-sm">{description}</p>}
      </div>

      {action}
    </div>

    {children}
  </section>
);

const RailGroup = ({ label, children }: { label: string; children: ReactNode }) => (
  <div>
    <p className="mb-1.5 px-2.5 font-medium text-muted-foreground text-xs">{label}</p>
    <ul className="space-y-px">{children}</ul>
  </div>
);

type RailItemProps = {
  isActive: boolean;
  onSelect: () => void;
  title?: string;
  children: ReactNode;
};

const RailItem = ({ isActive, onSelect, title, children }: RailItemProps) => (
  <li>
    <button
      type="button"
      title={title}
      aria-current={isActive ? 'true' : undefined}
      onClick={onSelect}
      className={cn(
        'flex h-9 w-full items-center gap-2 rounded-md px-2.5 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-foreground/40',
        isActive
          ? 'bg-secondary font-medium text-foreground'
          : 'font-medium text-muted-foreground [@media(hover:hover)]:hover:bg-muted/60 [@media(hover:hover)]:hover:text-foreground',
      )}
    >
      {children}
    </button>
  </li>
);
