import { useBottomSheet as useGorhomBottomSheet } from '@gorhom/bottom-sheet';
import { useBottomSheet as useHeroBottomSheet } from 'heroui-native';
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
 * Must NOT snap while HeroUI isOpen is false — otherwise closed sheets peek open
 * on screen mount (project entry, chat/comments navigation).
 *
 * Retries: immediate, double rAF, after interactions, 150ms, 300ms, and onLayout
 * (via AppBottomSheetContent snapOnLayout).
 */
export function BottomSheetSnapOnMount({ index = 0 }: BottomSheetSnapOnMountProps) {
  const { isOpen } = useHeroBottomSheet();
  const { snapToIndex, expand } = useGorhomBottomSheet();

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    const snap = () => {
      if (cancelled || !isOpen) return;
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
  }, [index, isOpen, snapToIndex, expand]);

  return null;
}
