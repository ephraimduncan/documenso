import { SUBSCRIPTION_CLAIM_FEATURE_FLAGS } from '@documenso/lib/types/subscription';
import { cn } from '@documenso/ui/lib/utils';
import { Skeleton } from '@documenso/ui/primitives/skeleton';
import { ChevronDownIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useId } from 'react';

import type { MemberRole, Meter, VariantProps } from './data';
import {
  getFlaggedMeters,
  getMemberRole,
  getMeters,
  getSubscriptionLabel,
  ROLE_LABEL,
  useInsights,
  useTeams,
  useUrlState,
} from './data';
import {
  DocumentsTable,
  MembersTable,
  MeterCount,
  MeterDot,
  OrganisationHeader,
  PlanSection,
  SettingsSection,
  TeamsTable,
  UsageSection,
} from './parts';

/**
 * Outline: the organisation as six one-line summaries that unfold in place.
 * The folded page answers the common questions; one click shows the rows behind a line.
 */
export const OutlineVariant = ({ organisation }: VariantProps) => {
  const [openParam, setOpenParam] = useUrlState('open', '');
  const open = openParam.split(',').filter(Boolean);

  const toggle = (id: string) => {
    setOpenParam((open.includes(id) ? open.filter((openId) => openId !== id) : [...open, id]).join(','));
  };

  const teams = useTeams(organisation);
  const { insights } = useInsights({ organisationId: organisation.id, view: 'documents', perPage: 1 });

  const summary = insights?.summary;
  const meters = getMeters(organisation);
  const claim = organisation.organisationClaim;

  const busiestTeam = teams[0];
  const roleCounts = countRoles(organisation);
  const flagCount = Object.values(claim.flags).filter(Boolean).length;

  const sections = [
    {
      id: 'documents',
      title: 'Documents',
      summary: !summary ? (
        <Skeleton className="h-4 w-72" />
      ) : summary.totalDocuments === 0 ? (
        'No documents'
      ) : (
        <>
          <Figure value={summary.totalDocuments} /> {summary.totalDocuments === 1 ? 'document' : 'documents'}
          <Separator />
          <Figure value={summary.activeDocuments} /> in progress
          <Separator />
          <Figure value={summary.completedDocuments} /> completed
        </>
      ),
      content: <DocumentsTable organisationId={organisation.id} />,
    },
    {
      id: 'usage',
      title: 'Usage',
      summary: <UsageSummary flagged={getFlaggedMeters(organisation)} />,
      content: <UsageSection organisation={organisation} />,
    },
    {
      id: 'teams',
      title: 'Teams',
      summary: (
        <>
          <CapacityFigure meter={meters[1]} noun="team" />
          {busiestTeam?.documentCount ? (
            <>
              <Separator />
              busiest is <span className="text-foreground">{busiestTeam.name}</span> with{' '}
              <Figure value={busiestTeam.documentCount} /> documents
            </>
          ) : null}
        </>
      ),
      content: <TeamsTable organisation={organisation} />,
    },
    {
      id: 'members',
      title: 'Members',
      summary: (
        <>
          <CapacityFigure meter={meters[0]} noun="member" />
          {roleCounts && (
            <>
              <Separator />
              {roleCounts}
            </>
          )}
        </>
      ),
      content: <MembersTable organisation={organisation} />,
    },
    {
      id: 'plan',
      title: 'Plan and limits',
      summary: (
        <>
          {getSubscriptionLabel(organisation)}
          <Separator />
          {claim.originalSubscriptionClaimId ? `claim “${claim.originalSubscriptionClaimId}”` : 'no inherited claim'}
          <Separator />
          <Figure value={flagCount} /> of {Object.keys(SUBSCRIPTION_CLAIM_FEATURE_FLAGS).length} feature flags on
        </>
      ),
      content: <PlanSection organisation={organisation} />,
    },
    {
      id: 'settings',
      title: 'Settings',
      summary: (
        <>
          <span className="font-mono text-xs">/o/{organisation.url}</span>
          <Separator />
          name, URL, global defaults, deletion
        </>
      ),
      content: <SettingsSection organisation={organisation} />,
    },
  ];

  return (
    <div className="space-y-6">
      <OrganisationHeader organisation={organisation} />

      <div className="divide-y border-y">
        {sections.map((section) => (
          <OutlineRow
            key={section.id}
            title={section.title}
            summary={section.summary}
            isOpen={open.includes(section.id)}
            onToggle={() => toggle(section.id)}
          >
            {section.content}
          </OutlineRow>
        ))}
      </div>
    </div>
  );
};

type OutlineRowProps = {
  title: string;
  summary: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
};

const OutlineRow = ({ title, summary, isOpen, onToggle, children }: OutlineRowProps) => {
  const panelId = useId();

  return (
    <section>
      <h3>
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggle}
          className="-mx-3 flex w-[calc(100%+1.5rem)] items-center gap-4 rounded-md px-3 py-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-foreground/40 [@media(hover:hover)]:hover:bg-muted/50"
        >
          <span className="w-32 shrink-0 font-medium text-sm">{title}</span>

          <span className="flex min-w-0 flex-1 items-center gap-x-2 truncate text-muted-foreground text-sm">
            <span className="truncate">{summary}</span>
          </span>

          <ChevronDownIcon
            aria-hidden="true"
            className={cn('h-4 w-4 shrink-0 text-muted-foreground', isOpen && 'rotate-180')}
          />
        </button>
      </h3>

      {isOpen && (
        <div id={panelId} className="pt-2 pb-8">
          {children}
        </div>
      )}
    </section>
  );
};

const UsageSummary = ({ flagged }: { flagged: Meter[] }) => {
  if (flagged.length === 0) {
    return <>Every limit has room</>;
  }

  // Two worst limits in full, the rest as a count, so the line never wraps.
  const [first, second, ...rest] = flagged;

  return (
    <span className="inline-flex items-center gap-x-3">
      {[first, second].filter(Boolean).map((meter) => (
        <span key={meter.key} className="inline-flex items-center gap-1.5">
          <MeterDot state={meter.state} />
          <span className="text-foreground">
            {meter.label} {meter.state === 'blocked' ? 'blocked' : <MeterCount meter={meter} />}
          </span>
        </span>
      ))}

      {rest.length > 0 && <span>and {rest.length} more near or over a limit</span>}
    </span>
  );
};

const countRoles = (organisation: VariantProps['organisation']) => {
  const counts = new Map<MemberRole, number>();

  for (const member of organisation.members) {
    const role = getMemberRole(organisation, member);

    counts.set(role, (counts.get(role) ?? 0) + 1);
  }

  return (['ADMIN', 'MANAGER', 'MEMBER'] as const)
    .filter((role) => counts.get(role))
    .map((role) => `${counts.get(role)} ${ROLE_LABEL[role].toLowerCase()}${counts.get(role) === 1 ? '' : 's'}`)
    .join(', ');
};

/** "47 of 50 members", or "47 members" when the claim sets no limit. */
const CapacityFigure = ({ meter, noun }: { meter: Meter; noun: string }) => (
  <>
    <Figure value={meter.used} />
    {meter.limit !== null && <> of {meter.limit.toLocaleString()}</>} {noun}
    {(meter.limit ?? meter.used) === 1 ? '' : 's'}
  </>
);

const Figure = ({ value }: { value: number }) => (
  <span className="font-medium text-foreground tabular-nums">{value.toLocaleString()}</span>
);

const Separator = () => (
  <span aria-hidden="true" className="mx-2 text-muted-foreground/50">
    ·
  </span>
);
