# Screen Objects

Screen objects encapsulate locators and interactions for a specific app screen.

## Base Class

`base.screen.ts` — extend this for all screen objects.

Provides:
- Locator builders: `byResourceId()`, `byId()`, `byDesc()`
- Element helpers: `tap()`, `setText()`, `waitForElement()`, `ensureVisible()`
- Navigation: `swipe()`, `scroll()`

## Creating a Screen Object

```typescript
import { BaseScreen } from '../screens/base.screen.ts';

export class LoginScreen extends BaseScreen {
  get usernameInput() { return this.byResourceId('login_username'); }
  get submitButton() { return this.byResourceId('login_submit'); }

  async isOnLoginScreen(): Promise<boolean> {
    return (await driver.getPageSource()).includes('login_submit');
  }
}
```

## Example

See `examples/kub-wallet/screens/` for a full set of real-world screen objects.
