Feature: Profile Menu Screen (KUB Wallet)

  Background:
    Given I am on the Profile Menu screen via DEV TOOLS

  @smoke
  @happy-path
  Scenario: Profile menu shows all main sections
    Then I see the Profile Menu screen
    And the Manage Wallet menu item is visible
    And the Bank Account menu item is visible
    And the Security menu item is visible

  @regression
  @happy-path
  Scenario: View Profile button is visible on Profile menu
    Then the View Profile button is visible

  @regression
  @happy-path
  Scenario: Navigating to Settings from Profile menu
    When I tap on Appearances menu item
    Then I see the Appearances screen

  @regression
  @happy-path
  Scenario: Navigating to My Profile from Profile menu
    When I tap the View Profile button
    Then I see the Profile Information screen
