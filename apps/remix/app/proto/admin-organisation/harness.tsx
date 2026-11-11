import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { trpc } from '@documenso/trpc/react';
import { Button } from '@documenso/ui/primitives/button';
import type { ComponentType, ReactNode } from 'react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router';

import { BoardVariant } from './board';
import type { ProtoForms, VariantProps } from './data';
import { FormsContext, useUrlState } from './data';
import { ExplorerVariant } from './explorer';
import { OutlineVariant } from './outline';
import { EmptyState, PageSkeleton } from './parts';
// The app's CSP rejects the style tags Vite injects for a plain CSS import, so the sheet loads as a link.
import pickerStylesheet from './picker.css?url';
import { TabsVariant } from './tabs';

type Variant = {
  name: string;
  /** Missing for the baseline, which renders the shipping page untouched. */
  Component?: ComponentType<VariantProps>;
};

const VARIANTS: Variant[] = [
  { name: 'Today' },
  { name: 'Outline', Component: OutlineVariant },
  { name: 'Tabs', Component: TabsVariant },
  { name: 'Board', Component: BoardVariant },
  { name: 'Explorer', Component: ExplorerVariant },
];

type AdminOrganisationProtoProps = ProtoForms & {
  organisationId: string;
  today: ReactNode;
};

export const AdminOrganisationProto = ({ organisationId, today, ...forms }: AdminOrganisationProtoProps) => {
  const [variantParam, setVariantParam] = useUrlState('v', '1');

  const parsed = Number.parseInt(variantParam, 10) - 1;
  const active = parsed >= 0 && parsed < VARIANTS.length ? parsed : 0;

  const setActive = (index: number) => setVariantParam(String(index + 1));

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;

      // defaultPrevented means a widget such as a tab list already used the key. Menus, listboxes
      // and dialogs own every key while they are open, typeahead digits included.
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        target?.closest('input, textarea, select, [contenteditable], [role="menu"], [role="listbox"], [role="dialog"]')
      ) {
        return;
      }

      const number = Number.parseInt(event.key, 10);

      if (number >= 1 && number <= VARIANTS.length) {
        setActive(number - 1);
      } else if (event.key === 'ArrowRight') {
        setActive((active + 1) % VARIANTS.length);
      } else if (event.key === 'ArrowLeft') {
        setActive((active - 1 + VARIANTS.length) % VARIANTS.length);
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [active]);

  const { Component } = VARIANTS[active];

  return (
    <FormsContext.Provider value={forms}>
      <link rel="stylesheet" href={pickerStylesheet} precedence="default" />

      {/* The bottom padding lets the last row scroll clear of the picker. */}
      <div key={`${organisationId}-${active}`} className="pb-16">
        {Component ? <Stage organisationId={organisationId} Component={Component} /> : today}
      </div>

      <Picker active={active} onSelect={setActive} />
    </FormsContext.Provider>
  );
};

const Stage = ({ organisationId, Component }: { organisationId: string; Component: ComponentType<VariantProps> }) => {
  const {
    data: organisation,
    error,
    isLoading,
    isFetching,
    refetch,
  } = trpc.admin.organisation.get.useQuery({ organisationId }, { retry: false });

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (organisation) {
    return <Component organisation={organisation} />;
  }

  if (error && AppError.parseError(error).code === AppErrorCode.NOT_FOUND) {
    return (
      <EmptyState
        title="Organization not found"
        action={
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/organisations">Back to organizations</Link>
          </Button>
        }
      >
        It may have been deleted, or the ID in the address is wrong.
      </EmptyState>
    );
  }

  return (
    <EmptyState
      title="Organization did not load"
      action={
        <Button variant="outline" size="sm" loading={isFetching} onClick={() => void refetch()}>
          Try again
        </Button>
      }
    >
      The server did not answer the request. The organization itself is not affected.
    </EmptyState>
  );
};

const Picker = ({ active, onSelect }: { active: number; onSelect: (index: number) => void }) => {
  const items = useRef<(HTMLButtonElement | null)[]>([]);

  const [highlight, setHighlight] = useState({ width: 0, left: 0 });
  const [isReady, setIsReady] = useState(false);

  useLayoutEffect(() => {
    const measure = () => {
      const item = items.current[active];

      if (item) {
        setHighlight({ width: item.offsetWidth, left: item.offsetLeft });
      }
    };

    measure();

    window.addEventListener('resize', measure);

    return () => window.removeEventListener('resize', measure);
  }, [active]);

  // The slide is enabled only after first paint, so the highlight does not animate into place on load.
  useEffect(() => {
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setIsReady(true)));

    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <nav className="proto-picker" aria-label="Prototype variants" data-ready={isReady ? '' : undefined}>
      <span
        className="proto-picker-highlight"
        aria-hidden="true"
        style={{ width: highlight.width, transform: `translateX(${highlight.left}px)` }}
      />

      {VARIANTS.map((variant, index) => (
        <button
          key={variant.name}
          ref={(element) => {
            items.current[index] = element;
          }}
          type="button"
          className="proto-picker-item"
          data-active={index === active ? '' : undefined}
          aria-current={index === active ? 'true' : undefined}
          onClick={() => onSelect(index)}
        >
          {variant.name}
        </button>
      ))}
    </nav>
  );
};
