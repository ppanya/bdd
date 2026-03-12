@mobile
@login-screen
Feature: Login on Mobile (KUB Wallet)

  # Phone login — button state
  @phone-disable
  Scenario: Log in button is disabled when phone number is empty
    Given I am on the Phone login screen
    Then the Log in button should be disabled

  @phone-enable
  Scenario: Log in button is enabled when phone number is filled
    Given I am on the Phone login screen
    When I enter phone number "0812345678"
    Then the Log in button should be enabled

  # Email login — button state
  @email-disable
  Scenario: Log in button is disabled when email login fields are empty
    Given I am on the Email login screen
    Then the Log in button should be disabled

  @email-partial
  Scenario: Log in button is disabled when only email is filled
    Given I am on the Email login screen
    When I enter email "test@example.com"
    Then the Log in button should be disabled

  @email-enable
  Scenario: Log in button is enabled when both email and password are filled
    Given I am on the Email login screen
    When I enter email "test@example.com"
    And I enter password "anypassword"
    Then the Log in button should be enabled

  # Login flow — existing user (PDPA already handled, goes straight to Home)
  # @email-login
  # Scenario: Successful login with email reaches Home screen
  #   Given I am on the Email login screen
  #   When I enter email "test@example.com"
  #   And I enter password "P@ssw0rd123"
  #   And I tap the Log in button
  #   Then I see the Home screen

  # Login flow — new user (PDPA + PIN required before Home)
  @new-user-pin
  Scenario: New user login with PDPA and PIN setup reaches Home screen
    Given I am on the Email login screen
    When I enter email "test@example.com"
    And I enter password "P@ssw0rd123"
    And I tap the Log in button
    Then I see the Set PIN screen
    And I set PIN "123456"
    Then I see the Home screen

  # # Navigation links from Login screen
  # @forgot-password
  # Scenario: Tap Forgot Password navigates away from Login screen
  #   Given I am on the Email login screen
  #   When I tap the Forgot Password link
  #   Then I leave the Login screen

  # @register
  # Scenario: Tap Register navigates away from Login screen
  #   Given I am on the Phone login screen
  #   When I tap the Register link
  #   Then I leave the Login screen

  # # Complete round-trip: navigate to login → inject session → use app → logout → back to login
  # @logout-loop
  # Scenario: Session injection and logout returns to Login screen
  #   Given I am on the Phone login screen
  #   When I inject a test session via DEV TOOLS
  #   And I clear the session via DEV TOOLS
  #   Then I am back on the Login screen
