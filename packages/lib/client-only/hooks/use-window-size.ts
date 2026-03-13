import { useCallback, useEffect, useState } from 'react';

import { useSharedResize } from './use-shared-resize';

const DEFAULT_SIZE = { width: 0, height: 0 };

export function useWindowSize() {
  const [size, setSize] = useState(DEFAULT_SIZE);

  const onResize = useCallback(() => {
    setSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  }, []);

  useEffect(() => {
    onResize();
  }, [onResize]);

  useSharedResize(onResize);

  return size;
}
