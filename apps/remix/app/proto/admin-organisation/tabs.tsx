import { Skeleton } from '@documenso/ui/primitives/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@documenso/ui/primitives/tabs';

import type { VariantProps } from './data';
import { getFlaggedMeters, METER_STATE_LABEL, useInsights, useUrlState } from './data';
import {
  DocumentsTable,
  MembersTable,
  MeterDot,
  OrganisationHeader,
  PlanSection,
  SettingsSection,
  TeamsTable,
  UsageSection,
} from './parts';

/**
 * Tabs: one facet at a time under a header that never moves.
 * Each facet gets the full width and its own address.
 */
export const TabsVariant = ({ organisation }: VariantProps) => {
  const [tab, setTab] = useUrlState('tab', 'documents');

  const { insights } = useInsights({ organisationId: organisation.id, view: 'documents', perPage: 1 });

  const [worst] = getFlaggedMeters(organisation);

  return (
    <div className="space-y-6">
      <OrganisationHeader organisation={organisation} />

      <Tabs value={tab} onValueChange={setTab}>
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList>
            <TabsTrigger value="documents">
              Documents
              <TabCount value={insights?.summary?.totalDocuments} />
            </TabsTrigger>

            <TabsTrigger value="usage">
              Usage
              {worst && (
                <>
                  <MeterDot state={worst.state} className="ml-2" />
                  <span className="sr-only">
                    , {worst.label} {METER_STATE_LABEL[worst.state].toLowerCase()}
                  </span>
                </>
              )}
            </TabsTrigger>

            <TabsTrigger value="teams">
              Teams
              <TabCount value={organisation.teams.length} />
            </TabsTrigger>

            <TabsTrigger value="members">
              Members
              <TabCount value={organisation.members.length} />
            </TabsTrigger>

            <TabsTrigger value="plan">Plan and limits</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="documents" className="mt-5">
          <DocumentsTable organisationId={organisation.id} />
        </TabsContent>

        <TabsContent value="usage" className="mt-5">
          <UsageSection organisation={organisation} />
        </TabsContent>

        <TabsContent value="teams" className="mt-5">
          <TeamsTable organisation={organisation} />
        </TabsContent>

        <TabsContent value="members" className="mt-5">
          <MembersTable organisation={organisation} />
        </TabsContent>

        <TabsContent value="plan" className="mt-5">
          <PlanSection organisation={organisation} />
        </TabsContent>

        <TabsContent value="settings" className="mt-5">
          <SettingsSection organisation={organisation} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const TabCount = ({ value }: { value: number | undefined }) => (
  <span className="ml-2 inline-flex min-w-[2ch] justify-end text-muted-foreground text-xs tabular-nums">
    {value === undefined ? <Skeleton className="h-3 w-5" /> : value.toLocaleString()}
  </span>
);
