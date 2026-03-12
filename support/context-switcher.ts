/**
 * support/context-switcher.ts — App/WebView context switching utility
 *
 * Useful for hybrid app scenarios where the app embeds a WebView.
 *
 * Usage:
 *   import { ContextSwitcher } from '../support/context-switcher.ts';
 *   await ContextSwitcher.switchToWebView();
 *   await ContextSwitcher.openUrl('https://example.com');
 *   await ContextSwitcher.switchBackToApp();
 */

const NATIVE_APP_CONTEXT = 'NATIVE_APP';

export const ContextSwitcher = {
  /**
   * Return all available contexts (NATIVE_APP + any WEBVIEWs).
   */
  async getContexts(): Promise<string[]> {
    return (await driver.getContexts()) as string[];
  },

  /**
   * Switch to the native app context.
   */
  async switchToNativeApp(): Promise<void> {
    await driver.switchContext(NATIVE_APP_CONTEXT);
  },

  /**
   * Switch to the first available WebView context.
   * Waits up to `timeoutMs` for a WebView to appear.
   */
  async switchToWebView(timeoutMs = 10_000): Promise<void> {
    const webviewContext = await browser.waitUntil(
      async () => {
        const contexts = (await driver.getContexts()) as string[];
        return contexts.find((c) => c !== NATIVE_APP_CONTEXT) ?? false;
      },
      {
        timeout: timeoutMs,
        interval: 500,
        timeoutMsg: `No WebView context found after ${timeoutMs}ms`,
      },
    );
    await driver.switchContext(webviewContext as string);
  },

  /**
   * Switch to the Chrome/Safari browser context (platform-aware).
   * Falls back to switchToWebView if no explicit browser context found.
   */
  async switchToBrowser(): Promise<void> {
    const contexts = (await driver.getContexts()) as string[];
    const platform = (driver.capabilities as Record<string, unknown>)['platformName'];
    const browserPrefix = platform === 'iOS' ? 'WEBVIEW_safari' : 'WEBVIEW_chrome';
    const browserCtx = contexts.find((c) => c.startsWith(browserPrefix));
    if (browserCtx) {
      await driver.switchContext(browserCtx);
    } else {
      await this.switchToWebView();
    }
  },

  /**
   * Open a URL in the current WebView/browser context.
   */
  async openUrl(url: string): Promise<void> {
    await browser.url(url);
  },

  /**
   * Switch back to native app context.
   */
  async switchBackToApp(): Promise<void> {
    await this.switchToNativeApp();
  },

  /**
   * Wait for a WebView context to be available.
   */
  async waitForWebView(timeoutMs = 10_000): Promise<boolean> {
    try {
      await browser.waitUntil(
        async () => {
          const contexts = (await driver.getContexts()) as string[];
          return contexts.some((c) => c !== NATIVE_APP_CONTEXT);
        },
        { timeout: timeoutMs, interval: 500 },
      );
      return true;
    } catch {
      return false;
    }
  },
};
