/**
 * support/mobile/screen-detector.ts — Pure screen detection helpers
 *
 * No Cucumber imports, no side effects.
 * Used by fixtures/mobile.hooks.ts and any other mobile helper that needs
 * to know which screen the app is currently on.
 */

import { safeGetPageSource } from './app-driver.ts';

export type KnownScreen = 'onboarding' | 'login' | 'pdpa' | 'pin' | 'home';
export type SubScreen = 'history' | 'settings' | 'my-profile';

/**
 * detectScreen — instant (ไม่มี timeout)
 * ใช้ getPageSource() ที่ return XML ทันที แทนการรอ element ที่มี retry loop
 * Return 'loading' ถ้า accessibility tree ยังไม่พร้อม (ไม่มี content)
 */
export async function detectScreen(): Promise<KnownScreen | SubScreen | 'loading'> {
  try {
    const source = await safeGetPageSource();
    if (source.includes('i_already_have_account_button')) return 'onboarding';
    if (source.includes('login_submit_button')) return 'login';
    if (source.includes('Manage PDPA Consent')) return 'pdpa';
    if (source.includes('pin_1')) return 'pin'; // Set PIN or Confirm PIN screen
    if (source.includes('navigation_menu_home')) return 'home';
    // Sub-screen detection — authenticated but on a child screen
    if (source.includes('Crypto History')) return 'history';
    if (source.includes('Appearances')) return 'settings';
    if (source.includes('Profile Information')) return 'my-profile';
    // Other authenticated screens (DevTools available)
    if (source.includes('profile_view_profile_button')) return 'home';
    if (source.includes('Crypto Wallet')) return 'home';
    return 'loading'; // app loading / Flutter Semantics ยังไม่พร้อม
  } catch {
    return 'loading';
  }
}

/**
 * waitForKnownScreen — timeout เดียว ไม่ซ้อน
 * ใช้ browser.waitUntil (เรียก detectScreen ทุก 500ms)
 * ถึง timeout เดี๋ยว waitUntil throw ชัดเจน
 */
export async function waitForKnownScreen(timeout = 20_000): Promise<KnownScreen | SubScreen> {
  return browser.waitUntil(
    async () => {
      const s = await detectScreen();
      return s !== 'loading' ? s : false;
    },
    { timeout, interval: 500, timeoutMsg: `App not ready after ${timeout}ms` },
  ) as Promise<KnownScreen | SubScreen>;
}
