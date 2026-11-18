import { describe, it, expect } from 'vitest';
import {
  INITIAL_SIDEBAR_LAYOUT_STATE,
  reduceSidebarLayoutState,
  resolveSidebarCollapsed,
  NARROW_DESKTOP_BREAKPOINT_PX,
  SIDEBAR_HOVER_DELAY_MS,
  computeSidebarVisualState,
} from '@/lib/sidebar-layout';

describe('Sidebar Auto-Collapse Layout State', () => {
  it('defaults to expanded on wide desktop (>= 1280px) with no studio open', () => {
    expect(NARROW_DESKTOP_BREAKPOINT_PX).toBe(1280);
    expect(resolveSidebarCollapsed(INITIAL_SIDEBAR_LAYOUT_STATE)).toBe(false);
  });

  it('auto-collapses when viewport width drops below 1280px and restores above 1280px', () => {
    const narrow = reduceSidebarLayoutState(INITIAL_SIDEBAR_LAYOUT_STATE, {
      type: 'SET_VIEWPORT_NARROW',
      isNarrow: true,
    });
    expect(resolveSidebarCollapsed(narrow)).toBe(true);

    const wideAgain = reduceSidebarLayoutState(narrow, {
      type: 'SET_VIEWPORT_NARROW',
      isNarrow: false,
    });
    expect(resolveSidebarCollapsed(wideAgain)).toBe(false);
  });

  it('auto-collapses when a studio opens and restores previous wide preference when studio closes', () => {
    const studioOpen = reduceSidebarLayoutState(INITIAL_SIDEBAR_LAYOUT_STATE, {
      type: 'SET_STUDIO_OPEN',
      isOpen: true,
    });
    expect(resolveSidebarCollapsed(studioOpen)).toBe(true);

    const studioClosed = reduceSidebarLayoutState(studioOpen, {
      type: 'SET_STUDIO_OPEN',
      isOpen: false,
    });
    expect(resolveSidebarCollapsed(studioClosed)).toBe(false);
  });

  it('preserves user manual collapse preference on wide desktop across studio open/close', () => {
    const manuallyCollapsed = reduceSidebarLayoutState(INITIAL_SIDEBAR_LAYOUT_STATE, {
      type: 'TOGGLE_MANUAL',
    });
    expect(resolveSidebarCollapsed(manuallyCollapsed)).toBe(true);

    const studioOpen = reduceSidebarLayoutState(manuallyCollapsed, {
      type: 'SET_STUDIO_OPEN',
      isOpen: true,
    });
    expect(resolveSidebarCollapsed(studioOpen)).toBe(true);

    const studioClosed = reduceSidebarLayoutState(studioOpen, {
      type: 'SET_STUDIO_OPEN',
      isOpen: false,
    });
    expect(resolveSidebarCollapsed(studioClosed)).toBe(true);
  });

  it('allows temporary manual expansion while in studio or <1280px and resets on context change', () => {
    const studioOpen = reduceSidebarLayoutState(INITIAL_SIDEBAR_LAYOUT_STATE, {
      type: 'SET_STUDIO_OPEN',
      isOpen: true,
    });
    expect(resolveSidebarCollapsed(studioOpen)).toBe(true);

    const manuallyExpandedInStudio = reduceSidebarLayoutState(studioOpen, {
      type: 'TOGGLE_MANUAL',
    });
    expect(resolveSidebarCollapsed(manuallyExpandedInStudio)).toBe(false);

    // Closing then reopening a studio auto-collapses again cleanly
    const studioClosed = reduceSidebarLayoutState(manuallyExpandedInStudio, {
      type: 'SET_STUDIO_OPEN',
      isOpen: false,
    });
    const studioReopened = reduceSidebarLayoutState(studioClosed, {
      type: 'SET_STUDIO_OPEN',
      isOpen: true,
    });
    expect(resolveSidebarCollapsed(studioReopened)).toBe(true);
  });

  it('computes floating hover drawer visual state with 200ms hover-intent delay', () => {
    expect(SIDEBAR_HOVER_DELAY_MS).toBe(200);

    // Collapsed and not hovered -> compact in flow
    expect(computeSidebarVisualState(true, false)).toEqual({
      isVisuallyCollapsed: true,
      isFloatingHoverDrawer: false,
    });

    // Collapsed and hovered -> visually expanded as floating overlay drawer
    expect(computeSidebarVisualState(true, true)).toEqual({
      isVisuallyCollapsed: false,
      isFloatingHoverDrawer: true,
    });

    // Pinned open -> expanded in flex flow, never a floating overlay drawer
    expect(computeSidebarVisualState(false, false)).toEqual({
      isVisuallyCollapsed: false,
      isFloatingHoverDrawer: false,
    });
    expect(computeSidebarVisualState(false, true)).toEqual({
      isVisuallyCollapsed: false,
      isFloatingHoverDrawer: false,
    });
  });
});
