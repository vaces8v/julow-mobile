import { BottomSheetSnapOnMount } from '@/components/bottom-sheet-snap-on-mount';
import { BottomSheet as HeroBottomSheet, useBottomSheet as useHeroBottomSheet } from 'heroui-native';
import { useCallback, type ComponentProps, type ReactNode } from 'react';
import { Dimensions, View, type LayoutChangeEvent } from 'react-native';
import { useBottomSheet as useGorhomBottomSheet } from '@gorhom/bottom-sheet';

const WINDOW_HEIGHT = Dimensions.get('window').height;

/** Percentage snap point string for @gorhom/bottom-sheet (more reliable than raw px on mount). */
export function sheetSnapPercent(ratio: number): `${number}%` {
  return `${Math.round(ratio * 100)}%`;
}

export const SHEET_SNAP = {
  /** ~68% — task detail (partial sheet, not full screen) */
  taskDetail: sheetSnapPercent(0.68),
  /** ~88% — image preview */
  large: sheetSnapPercent(0.88),
  /** ~90% — video preview */
  video: sheetSnapPercent(0.9),
  /** ~92% — tall forms */
  tall: sheetSnapPercent(0.92),
  /** ~56% — compact dialogs */
  medium: sheetSnapPercent(0.56),
  /** ~42% — link confirm */
  compact: sheetSnapPercent(0.42),
} as const;

export function sheetSnapPx(ratio: number): number {
  return Math.round(WINDOW_HEIGHT * ratio);
}

type HeroContentProps = ComponentProps<typeof HeroBottomSheet.Content>;

export type AppBottomSheetContentProps = Omit<HeroContentProps, 'snapPoints' | 'enableDynamicSizing'> & {
  children: ReactNode;
  /**
   * Preset snap heights. Use `dynamic` for content-driven height (HeroUI + gorhom dynamic sizing).
   * Pass `snapPoints` explicitly to override.
   */
  size?: 'taskDetail' | 'large' | 'video' | 'tall' | 'medium' | 'compact' | 'dynamic';
  snapPoints?: HeroContentProps['snapPoints'];
  enableDynamicSizing?: boolean;
  /** Snap index after open; default 0 */
  snapIndex?: number;
  /** Extra snap retries after content onLayout (heavy media previews) */
  snapOnLayout?: boolean;
  /** `fast` skips 150/300ms snap retries — use for task/detail sheets */
  snapMode?: 'fast' | 'default';
};

/**
 * HeroUI BottomSheet.Content defaults + reliable open height.
 * Always mounts BottomSheetSnapOnMount; optional layout-triggered resnap for media sheets.
 */
export function AppBottomSheetContent({
  children,
  size = 'large',
  snapPoints: snapPointsProp,
  enableDynamicSizing: enableDynamicSizingProp,
  snapIndex = 0,
  snapOnLayout = false,
  snapMode = 'default',
  index = snapIndex,
  backgroundClassName = 'rounded-t-[28px]',
  enablePanDownToClose = true,
  ...rest
}: AppBottomSheetContentProps) {
  const isDynamic = size === 'dynamic';
  const enableDynamicSizing = enableDynamicSizingProp ?? isDynamic;

  const snapPoints =
    snapPointsProp ??
    (isDynamic
      ? undefined
      : size === 'taskDetail'
        ? [SHEET_SNAP.taskDetail, SHEET_SNAP.large]
        : size === 'large'
          ? [SHEET_SNAP.large]
          : size === 'video'
          ? [SHEET_SNAP.video]
          : size === 'tall'
            ? [SHEET_SNAP.tall]
            : size === 'medium'
              ? [SHEET_SNAP.medium]
              : [SHEET_SNAP.compact]);

  const maxDynamicContentSize =
    rest.maxDynamicContentSize ?? (isDynamic ? sheetSnapPx(0.92) : undefined);

  return (
    <HeroBottomSheet.Content
      index={index}
      snapPoints={snapPoints}
      enableDynamicSizing={enableDynamicSizing}
      maxDynamicContentSize={maxDynamicContentSize}
      backgroundClassName={backgroundClassName}
      enablePanDownToClose={enablePanDownToClose}
      {...rest}
    >
      <BottomSheetSnapOnMount index={snapIndex} mode={isDynamic ? 'fast' : snapMode} />
      {isDynamic || snapOnLayout ? (
        <BottomSheetSnapOnLayout index={snapIndex} dynamic={isDynamic}>
          {children}
        </BottomSheetSnapOnLayout>
      ) : (
        children
      )}
    </HeroBottomSheet.Content>
  );
}

type SnapOnLayoutProps = {
  index: number;
  dynamic?: boolean;
  children: ReactNode;
};

/** Resnap after content measures (release builds often need this for large media). */
function BottomSheetSnapOnLayout({ index, dynamic = false, children }: SnapOnLayoutProps) {
  const { isOpen } = useHeroBottomSheet();
  const { snapToIndex } = useGorhomBottomSheet();

  const onLayout = useCallback(
    (_e: LayoutChangeEvent) => {
      if (!isOpen || dynamic) return;
      snapToIndex(index);
    },
    [dynamic, index, isOpen, snapToIndex],
  );

  return (
    <View style={dynamic ? undefined : { flex: 1 }} onLayout={onLayout}>
      {children}
    </View>
  );
}

export { HeroBottomSheet as BottomSheet };
