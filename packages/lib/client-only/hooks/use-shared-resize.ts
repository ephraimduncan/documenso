import { useEffect } from 'react';

type ResizeCallback = () => void;

const subscribers = new Set<ResizeCallback>();

let isListening = false;

const handleResize = () => {
  for (const callback of subscribers) {
    callback();
  }
};

const addSubscriber = (callback: ResizeCallback) => {
  subscribers.add(callback);

  if (!isListening) {
    window.addEventListener('resize', handleResize, { passive: true });
    isListening = true;
  }
};

const removeSubscriber = (callback: ResizeCallback) => {
  subscribers.delete(callback);

  if (subscribers.size === 0 && isListening) {
    window.removeEventListener('resize', handleResize);
    isListening = false;
  }
};

/**
 * Subscribe to a shared global resize listener. Only one `window.addEventListener('resize')`
 * exists regardless of how many components use this hook.
 */
export const useSharedResize = (callback: ResizeCallback) => {
  useEffect(() => {
    addSubscriber(callback);

    return () => {
      removeSubscriber(callback);
    };
  }, [callback]);
};
