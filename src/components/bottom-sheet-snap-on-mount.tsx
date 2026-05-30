import { useBottomSheet } from '@gorhom/bottom-sheet';
import { useEffect } from 'react';
import { InteractionManager } from 'react-native';

type BottomSheetSnapOnMountProps = {
  /** Snap index to open at; defaults to first snap point / dynamic content. */
  index?: number;
};

/**
 * HeroUI gorhom sheets always mount at index -1. BottomSheetContentContainer only
 * calls snapToIndex when isOpen transitions false → true. Sheets that mount via
 * `if (!open) return null` + `isOpen` already true skip that path — they stay at
 * minimum height until we snap here.
 *
 * Retries: immediate, double rAF, after interactions, 150ms, 300ms, and onLayout
 * (via AppBottomSheetContent snapOnLayout).
 */
export function BottomSheetSnapOnMount({ index = 0 }: BottomSheetSnapOnMountProps) {
  const { snapToIndex, expand } = useBottomSheet();

  useEffect(() => {
    let cancelled = false;
    const snap = () => {
      if (cancelled) return;
      try {
        snapToIndex(index);
      } catch {
        try {
          expand();
        } catch {
          /* sheet not ready */
        }
      }
    };

    snap();

    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(snap);
    });
    const afterInteractions = InteractionManager.runAfterInteractions(snap);
    const retry150 = setTimeout(snap, 150);
    const retry300 = setTimeout(snap, 300);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      afterInteractions.cancel();
      clearTimeout(retry150);
      clearTimeout(retry300);
    };
  }, [index, snapToIndex, expand]);

  return null;
}
