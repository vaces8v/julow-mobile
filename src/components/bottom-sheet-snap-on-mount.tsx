import { useBottomSheet as useGorhomBottomSheet } from '@gorhom/bottom-sheet';
import { useBottomSheet as useHeroBottomSheet } from 'heroui-native';
import { useEffect } from 'react';
import { InteractionManager } from 'react-native';

type BottomSheetSnapOnMountProps = {
  /** Snap index to open at; defaults to first snap point / dynamic content. */
  index?: number;
  /**
   * `fast` — immediate snap only (task sheets, dialogs).
   * `default` — extra retries for heavy media sheets.
   */
  mode?: 'fast' | 'default';
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
export function BottomSheetSnapOnMount({ index = 0, mode = 'default' }: BottomSheetSnapOnMountProps) {
  const { isOpen } = useHeroBottomSheet();
  const { snapToIndex } = useGorhomBottomSheet();

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    const snap = () => {
      if (cancelled || !isOpen) return;
      try {
        snapToIndex(index);
      } catch {
        /* sheet not ready — retry on next tick; never expand() (opens full screen) */
      }
    };

    snap();

    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(snap);
    });

    if (mode === 'fast') {
      return () => {
        cancelled = true;
        cancelAnimationFrame(raf);
      };
    }

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
  }, [index, isOpen, mode, snapToIndex]);

  return null;
}
