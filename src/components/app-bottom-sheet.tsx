import { BottomSheetSnapOnMount } from '@/components/bottom-sheet-snap-on-mount';
import { BottomSheet as HeroBottomSheet } from 'heroui-native';
import { useCallback, type ComponentProps, type ReactNode } from 'react';
import { Dimensions, View, type LayoutChangeEvent } from 'react-native';
import { useBottomSheet } from '@gorhom/bottom-sheet';

const WINDOW_HEIGHT = Dimensions.get('window').height;

/** Percentage snap point string for @gorhom/bottom-sheet (more reliable than raw px on mount). */
export function sheetSnapPercent(ratio: number): `${number}%` {
  return `${Math.round(ratio * 100)}%`;
}

export const SHEET_SNAP = {
  /** ~88% — image preview, task detail, task create */
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
  size?: 'large' | 'video' | 'tall' | 'medium' | 'compact' | 'dynamic';
  snapPoints?: HeroContentProps['snapPoints'];
  enableDynamicSizing?: boolean;
  /** Snap index after open; default 0 */
  snapIndex?: number;
  /** Extra snap retries after content onLayout (heavy media previews) */
  snapOnLayout?: boolean;
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
      <BottomSheetSnapOnMount index={snapIndex} />
      {snapOnLayout ? (
        <BottomSheetSnapOnLayout index={snapIndex}>{children}</BottomSheetSnapOnLayout>
      ) : (
        children
      )}
    </HeroBottomSheet.Content>
  );
}

type SnapOnLayoutProps = {
  index: number;
  children: ReactNode;
};

/** Resnap after content measures (release builds often need this for large media). */
function BottomSheetSnapOnLayout({ index, children }: SnapOnLayoutProps) {
  const { snapToIndex } = useBottomSheet();

  const onLayout = useCallback(
    (_e: LayoutChangeEvent) => {
      snapToIndex(index);
    },
    [index, snapToIndex],
  );

  return (
    <View style={{ flex: 1 }} onLayout={onLayout}>
      {children}
    </View>
  );
}

export { HeroBottomSheet as BottomSheet };
