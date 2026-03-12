/**
 * BaseScreen — abstract class สำหรับ Mobile screen objects
 *
 * ใช้ UIAutomator2 (Android) / XCUITest (iOS) ผ่าน Flutter Semantics
 * Flutter expose accessibility nodes ผ่าน Semantics(identifier: '...') widget
 * ซึ่ง map ไปยัง content-desc (Android) / accessibilityIdentifier (iOS)
 *
 * Selectors:
 *   byId(id)      → ~id                  (exact content-desc / accessibilityIdentifier)
 *   byDesc(text)  → descriptionContains  (partial content-desc — useful for compound
 *                                         content-desc ที่มี \n เช่น "navigation_menu_wallet\nWallet")
 */

/**
 * Global timeouts — single source of truth, ไม่ใช้ magic numbers ใน screen objects
 *   element  — รอ element ทั่วไปปรากฏ (ไม่มี network/navigation)
 *   nav      — รอหลัง navigation transition + network (login, submit, page change)
 *   toast    — toast แสดงสั้น ใช้ timeout น้อยพอ
 */
export const TIMEOUTS = {
  element: 10_000,
  nav: 15_000,
  toast: 5_000,
} as const;

export abstract class BaseScreen {
  /** Exact accessibility id (content-desc on Android, accessibilityIdentifier on iOS) */
  protected byId(identifier: string) {
    return $(`~${identifier}`);
  }

  /**
   * UiSelector descriptionContains — ใช้เมื่อ content-desc มี newline หรือ prefix เพิ่มเติม
   * เช่น content-desc = "navigation_menu_wallet\nWallet" → byDesc("navigation_menu_wallet")
   */
  protected byDesc(partial: string) {
    return $(`android=new UiSelector().descriptionContains("${partial}")`);
  }

  /**
   * UiSelector resourceId — ใช้สำหรับ Flutter elements ที่มี resource-id แต่ไม่มี content-desc
   * เช่น login_email_input, login_password_input ที่เป็น input fields
   */
  protected byResourceId(resourceId: string) {
    return $(`android=new UiSelector().resourceId("${resourceId}")`);
  }

  async waitForElement(el: ChainablePromiseElement, timeout: number = TIMEOUTS.element) {
    await el.waitForDisplayed({ timeout });
    return el;
  }

  /**
   * Flush UiAutomator2 accessibility cache หลัง navigation transition
   *
   * Flutter push semantic nodes ใหม่เข้า accessibility tree หลัง navigate
   * UiAutomator2 cache อาจยังเก็บ nodes เก่าอยู่ → resetAccessibilityCache บังคับ fresh read
   * ทำให้ waitForDisplayed เจอ element ใหม่เร็วขึ้น ไม่ต้องรอ cache expire เอง
   */
  async waitForIdle(_maxWait: number = TIMEOUTS.nav) {
    try {
      await driver.execute('mobile: resetAccessibilityCache', {});
    } catch {
      // not critical — next waitForElement will retry via polling anyway
    }
  }

  /**
   * รอให้ element clickable=true — ใช้หลัง setValue() เพื่อรอ Flutter reactive state update
   * Flutter UI อัปเดต clickable attribute แบบ async หลัง setState()
   * ดังนั้นการ check ทันทีหลัง setValue จะยังได้ clickable=false อยู่
   */
  async waitForClickable(el: ChainablePromiseElement, timeout: number = TIMEOUTS.element) {
    await el.waitForDisplayed({ timeout });
    await browser.waitUntil(async () => (await el.getAttribute('clickable')) === 'true', {
      timeout,
      interval: 500,
      timeoutMsg: `Element not clickable within ${timeout}ms`,
    });
  }

  async tap(el: ChainablePromiseElement) {
    // 1. Wait for element to be displayed
    await el.waitForDisplayed({ timeout: TIMEOUTS.element });

    // 2. Check if element is clickable (Flutter disabled state check)
    const clickable = await el.getAttribute('clickable');
    if (clickable === 'false') {
      throw new Error(
        `Element is disabled (clickable=false) — cannot tap. ` +
          `Ensure the element is enabled before interacting.`,
      );
    }

    // 3. Perform click
    await el.click();
  }

  async setText(el: ChainablePromiseElement, text: string) {
    // 1. Wait for element to be displayed
    await el.waitForDisplayed({ timeout: TIMEOUTS.element });

    // 2. Click to focus the field — required for Flutter + TalkBack (accessibility mode).
    //    Without explicit focus, clearValue/setValue may not trigger Flutter's onChange.
    await el.click();

    // 3. Clear existing value
    await el.clearValue();

    // 4. Use addValue (keyboard mechanism) instead of setValue (direct text set).
    //    setValue() calls UiObject2.setText() which bypasses Flutter's TextEditingController.
    //    addValue() sends through the keyboard/input method, triggering onChanged → form validation.
    await el.addValue(text);
  }

  async getText(el: ChainablePromiseElement): Promise<string> {
    return el.getText();
  }

  async isDisplayed(el: ChainablePromiseElement): Promise<boolean> {
    return el.isDisplayed();
  }

  async scrollDown(pixels = 300) {
    await browser
      .action('pointer', { parameters: { pointerType: 'touch' } })
      .move({ x: 200, y: 500 })
      .down()
      .move({ x: 200, y: 500 - pixels, duration: 300 })
      .up()
      .perform();
  }

  async swipe(startX: number, startY: number, endX: number, endY: number) {
    await browser
      .action('pointer', { parameters: { pointerType: 'touch' } })
      .move({ x: startX, y: startY })
      .down()
      .move({ x: endX, y: endY, duration: 300 })
      .up()
      .perform();
  }
}
