import type { SemanticTheme } from '@/hooks/use-semantic-theme';
import { useCallback, useMemo } from 'react';
import { RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Body height below safe-area inset for collapsible tab headers. */
export const COLLAPSIBLE_HEADER_BODY = 54;

export function useCollapsibleHeaderHeight(extra = 0) {
  const insets = useSafeAreaInsets();
  return insets.top + COLLAPSIBLE_HEADER_BODY + extra;
}

type RefreshControlOptions = {
  refreshing: boolean;
  onRefresh: () => void | Promise<void>;
  c: SemanticTheme;
  /** Additional offset below the sticky header (rare). */
  offsetExtra?: number;
};

export function useCollapsibleRefreshControl({
  refreshing,
  onRefresh,
  c,
  offsetExtra = 0,
}: RefreshControlOptions) {
  const progressViewOffset = useCollapsibleHeaderHeight(offsetExtra);

  const handleRefresh = useCallback(() => {
    void onRefresh();
  }, [onRefresh]);

  return useMemo(
    () => (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={handleRefresh}
        tintColor={c.foreground}
        colors={[c.accent]}
        progressBackgroundColor={c.surfaceSecondary}
        progressViewOffset={progressViewOffset}
      />
    ),
    [refreshing, handleRefresh, c.foreground, c.accent, c.surfaceSecondary, progressViewOffset],
  );
}
