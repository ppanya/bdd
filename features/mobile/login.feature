Feature: Login on Mobile (KUB Wallet)

  # Phone login — button state
  @smoke
  @happy-path
  Scenario: Log in button is disabled when phone number is empty
    Given I am on the Phone login screen
    Then the Log in button should be disabled

  @regression
  @happy-path
  Scenario: Log in button is enabled when phone number is filled
    Given I am on the Phone login screen
    When I enter phone number "0812345678"
    Then the Log in button should be enabled

  # Email login — button state
  @regression
  @negative
  Scenario: Log in button is disabled when email login fields are empty
    Given I am on the Email login screen
    Then the Log in button should be disabled

  @regression
  @negative
  Scenario: Log in button is disabled when only email is filled
    Given I am on the Email login screen
    When I enter email "test@example.com"
    Then the Log in button should be disabled

  @regression
  @happy-path
  Scenario: Log in button is enabled when both email and password are filled
    Given I am on the Email login screen
    When I enter email "test@example.com"
    And I enter password "anypassword"
    Then the Log in button should be enabled

  # Login flow — new user (PDPA + PIN required before Home)
  @smoke
  @happy-path
  @monday=7839498373/8142073690
  Scenario: New user login with PDPA and PIN setup reaches Home screen
    Given I am on the Email login screen
    When I enter email "test@example.com"
    And I enter password "P@ssw0rd123"
    And I tap the Log in button
    And I accept PDPA if prompted
    Then I see the Set PIN screen
    And I set PIN "123456"
    Then I see the Home screen
