/**
 * BaseScreen — abstract class สำหรับ Mobile screen objects
 *
 * ใช้ UIAutomator2 (Android) / XCUITest (iOS) ผ่าน Flutter Semantics
 * Flutter expose accessibility nodes ผ่าน Semantics(identifier: '...') widget
 * ซึ่ง map ไปยัง content-desc (Android) / accessibilityIdentifier (iOS)
 * Appium selector: ~identifier_name
 */
export abstract class BaseScreen {
  /**
   * หา element ด้วย Semantics identifier
   * Flutter: Semantics(identifier: 'my_id')
   * Android: content-desc="my_id"  →  ~my_id
   * iOS:     accessibilityIdentifier="my_id"  →  ~my_id
   */
  protected byId(identifier: string) {
    return $(`~${identifier}`);
  }

  async waitForElement(el: ChainablePromiseElement, timeout = 10_000) {
    await el.waitForDisplayed({ timeout });
    return el;
  }

  async tap(el: ChainablePromiseElement) {
    await el.click();
  }

  async setText(el: ChainablePromiseElement, text: string) {
    await el.setValue(text);
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
