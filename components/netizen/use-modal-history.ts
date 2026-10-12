"use client";

import { useEffect, useRef } from "react";

let nextModalId = 0;

/**
 * Lets the browser back button (and the Android back gesture) close a modal
 * instead of navigating away from the page.
 *
 * Opening the modal pushes a dedicated history entry. Pressing back pops that
 * entry and `onClose` runs — nothing else in the app navigates. Closing the
 * modal any other way (X, backdrop, successful submit) removes the entry we
 * added, one tick later, and only if it is still the current history entry —
 * so a real navigation that happened in the meantime is never undone.
 */
export function useModalHistory(onClose: () => void) {
  const idRef = useRef(0);
  const openRef = useRef(true);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const id = ++nextModalId;
    idRef.current = id;
    openRef.current = true;

    window.history.pushState(
      { ...window.history.state, __netizenModal: id },
      "",
    );

    function handlePopState() {
      if (!openRef.current) return;
      // Our entry was popped by the user — close without touching history.
      openRef.current = false;
      onCloseRef.current();
    }

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);

      if (!openRef.current) return; // already closed via the back button

      // Closed some other way: drop the extra entry, but only if it is still
      // ours. Deferred one tick so a re-mount (e.g. React StrictMode) that
      // immediately pushes a fresh entry is left alone.
      window.setTimeout(() => {
        if (openRef.current && window.history.state?.__netizenModal === id) {
          openRef.current = false;
          window.history.back();
        }
      }, 0);
    };
  }, []);
}