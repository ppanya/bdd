/**
 * support/mobile-gestures.ts — Reusable Appium mobile gesture helpers
 *
 * Usage (in a screen or step):
 *   import { MobileGestures } from '../support/mobile-gestures.ts';
 *   await MobileGestures.scrollDown();
 *   await MobileGestures.swipeLeft();
 *   await MobileGestures.hideKeyboard();
 */

export const MobileGestures = {
  /**
   * Scroll down by a percentage of the screen height.
   * @param percent 0–1, default 0.5 (half screen)
   */
  async scrollDown(percent = 0.5): Promise<void> {
    await driver.execute('mobile: scrollGesture', {
      left: 100,
      top: 300,
      width: 200,
      height: 500,
      direction: 'down',
      percent,
    });
  },

  /**
   * Scroll up by a percentage of the screen height.
   * @param percent 0–1, default 0.5
   */
  async scrollUp(percent = 0.5): Promise<void> {
    await driver.execute('mobile: scrollGesture', {
      left: 100,
      top: 300,
      width: 200,
      height: 500,
      direction: 'up',
      percent,
    });
  },

  /**
   * Swipe left (e.g. next page, dismiss left).
   * @param percent 0–1, default 0.75
   */
  async swipeLeft(percent = 0.75): Promise<void> {
    await driver.execute('mobile: swipeGesture', {
      left: 100,
      top: 400,
      width: 500,
      height: 100,
      direction: 'left',
      percent,
    });
  },

  /**
   * Swipe right (e.g. previous page, navigate back).
   * @param percent 0–1, default 0.75
   */
  async swipeRight(percent = 0.75): Promise<void> {
    await driver.execute('mobile: swipeGesture', {
      left: 100,
      top: 400,
      width: 500,
      height: 100,
      direction: 'right',
      percent,
    });
  },

  /**
   * Long press an element by its resource-id or accessibility id.
   * @param elementId resource-id string (android) or accessibility id
   * @param durationMs press duration in ms, default 1500
   */
  async longPress(elementId: string, durationMs = 1500): Promise<void> {
    const el = await $(`android=new UiSelector().resourceId("${elementId}")`);
    await driver.execute('mobile: longClickGesture', {
      elementId: el.elementId,
      duration: durationMs,
    });
  },

  /**
   * Hide the on-screen keyboard if visible.
   * No-op if keyboard is not shown.
   */
  async hideKeyboard(): Promise<void> {
    try {
      await driver.hideKeyboard();
    } catch {
      // keyboard not present — safe to ignore
    }
  },
};
