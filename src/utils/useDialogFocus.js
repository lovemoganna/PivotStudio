import { useLayoutEffect, useRef } from 'react';

const dialogStack = [];
export function hasOpenDialog() {
  return Boolean(document.querySelector('[role="dialog"][aria-modal="true"]'));
}

/** Keep keyboard navigation inside an active dialog and restore opener focus. */
export function useDialogFocus(isOpen, onClose) {
  const containerRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useLayoutEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement;
    const container = containerRef.current;
    if (!container) return;
    dialogStack.push(containerRef);

    const focusables = () => Array.from((containerRef.current || container).querySelectorAll(
      'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
    )).filter((el) => !el.matches(':disabled') && el.getClientRects().length > 0);

    (focusables()[0] || container).focus();
    const onKeyDown = (event) => {
      if (dialogStack.at(-1) !== containerRef) return;
      const currentContainer = containerRef.current || container;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current?.();
      } else if (event.key === 'Tab') {
        const nodes = focusables();
        if (!nodes.length) { event.preventDefault(); return; }
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (event.shiftKey && (document.activeElement === first || !currentContainer.contains(document.activeElement))) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !currentContainer.contains(document.activeElement))) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      const index = dialogStack.lastIndexOf(containerRef);
      if (index !== -1) dialogStack.splice(index, 1);
      if (previous?.isConnected && typeof previous.focus === 'function') previous.focus();
    };
  }, [isOpen]);

  return containerRef;
}
