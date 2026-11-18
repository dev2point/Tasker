export const NARROW_DESKTOP_BREAKPOINT_PX = 1280;
export const SIDEBAR_HOVER_DELAY_MS = 200;

export interface SidebarVisualState {
  /** True when the sidebar UI renders compact (icons only, 80px). */
  isVisuallyCollapsed: boolean;
  /** True when collapsed in layout flow (80px) but temporarily expanded over content (256px). */
  isFloatingHoverDrawer: boolean;
}

/**
 * Resolves whether the sidebar should appear collapsed or float as an elevated
 * 256px drawer over the left edge without shifting page layout.
 */
export function computeSidebarVisualState(
  isCollapsed: boolean,
  isHoverExpanded: boolean
): SidebarVisualState {
  if (!isCollapsed) {
    return {
      isVisuallyCollapsed: false,
      isFloatingHoverDrawer: false,
    };
  }
  return {
    isVisuallyCollapsed: !isHoverExpanded,
    isFloatingHoverDrawer: isHoverExpanded,
  };
}

export interface SidebarLayoutState {
  /** User's explicit preference on wide viewports (>= 1280px) when no studio is open. */
  userPreferenceExpanded: boolean;
  /** True when desktop/tablet viewport width is below 1280px. */
  isNarrowViewport: boolean;
  /** True when a workspace studio (e.g. DossierReviewStudioModal) is open. */
  isStudioOpen: boolean;
  /** Temporary manual toggle inside the current narrow-viewport or studio context. */
  contextOverrideExpanded: boolean | null;
}

export type SidebarLayoutAction =
  | { type: 'SET_VIEWPORT_NARROW'; isNarrow: boolean }
  | { type: 'SET_STUDIO_OPEN'; isOpen: boolean }
  | { type: 'TOGGLE_MANUAL' };

export const INITIAL_SIDEBAR_LAYOUT_STATE: SidebarLayoutState = {
  userPreferenceExpanded: true,
  isNarrowViewport: false,
  isStudioOpen: false,
  contextOverrideExpanded: null,
};

/**
 * Computes whether the desktop sidebar should currently render in collapsed (w-20) mode.
 */
export function resolveSidebarCollapsed(state: SidebarLayoutState): boolean {
  if (state.isStudioOpen || state.isNarrowViewport) {
    if (state.contextOverrideExpanded !== null) {
      return !state.contextOverrideExpanded;
    }
    return true;
  }
  return !state.userPreferenceExpanded;
}

/**
 * Transitions sidebar layout state while respecting both auto-collapse triggers
 * (< 1280px or studio open) and explicit user toggles.
 */
export function reduceSidebarLayoutState(
  state: SidebarLayoutState,
  action: SidebarLayoutAction
): SidebarLayoutState {
  switch (action.type) {
    case 'SET_VIEWPORT_NARROW': {
      if (state.isNarrowViewport === action.isNarrow) return state;
      return {
        ...state,
        isNarrowViewport: action.isNarrow,
        contextOverrideExpanded: null,
      };
    }
    case 'SET_STUDIO_OPEN': {
      if (state.isStudioOpen === action.isOpen) return state;
      return {
        ...state,
        isStudioOpen: action.isOpen,
        contextOverrideExpanded: null,
      };
    }
    case 'TOGGLE_MANUAL': {
      const currentlyCollapsed = resolveSidebarCollapsed(state);
      const nextExpanded = currentlyCollapsed;
      if (state.isStudioOpen || state.isNarrowViewport) {
        return {
          ...state,
          contextOverrideExpanded: nextExpanded,
        };
      }
      return {
        ...state,
        userPreferenceExpanded: nextExpanded,
        contextOverrideExpanded: null,
      };
    }
    default:
      return state;
  }
}
