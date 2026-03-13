import { useCallback, useEffect, useState } from 'react';

import { useSharedResize } from './use-shared-resize';

export function useWindowSize() {
  const [size, setSize] = useState({
    width: 0,
    height: 0,
  });

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
