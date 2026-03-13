import { useCallback, useEffect, useState } from 'react';

import { getBoundingClientRect } from '@documenso/lib/client-only/get-bounding-client-rect';

import { useSharedResize } from './use-shared-resize';

export const useElementBounds = (elementOrSelector: HTMLElement | string, withScroll = false) => {
  const [bounds, setBounds] = useState({
    top: 0,
    left: 0,
    height: 0,
    width: 0,
  });

  const calculateBounds = useCallback(() => {
    const $el =
      typeof elementOrSelector === 'string'
        ? document.querySelector<HTMLElement>(elementOrSelector)
        : elementOrSelector;

    if (!$el) {
      return { top: 0, left: 0, width: 0, height: 0 };
    }

    if (withScroll) {
      return getBoundingClientRect($el);
    }

    const { top, left, width, height } = $el.getBoundingClientRect();

    return {
      top,
      left,
      width,
      height,
    };
  }, [elementOrSelector, withScroll]);

  useEffect(() => {
    setBounds(calculateBounds());
  }, [calculateBounds]);

  const onResizeBounds = useCallback(() => {
    setBounds(calculateBounds());
  }, [calculateBounds]);

  useSharedResize(onResizeBounds);

  useEffect(() => {
    const $el =
      typeof elementOrSelector === 'string'
        ? document.querySelector<HTMLElement>(elementOrSelector)
        : elementOrSelector;

    if (!$el) {
      return;
    }

    const observer = new ResizeObserver(() => {
      setBounds(calculateBounds());
    });

    observer.observe($el);

    return () => {
      observer.disconnect();
    };
  }, [elementOrSelector, calculateBounds]);

  return bounds;
};
