Feature: Wallet Screen (KUB Wallet)

  Background:
    Given I am on the Wallet screen via DEV TOOLS

  @smoke
  @happy-path
  Scenario: Wallet screen shows Crypto tab by default
    Then I see the Wallet screen
    And the Crypto tab is active

  @regression
  @happy-path
  Scenario: Wallet screen has Token, NFTs and Point sub-tabs
    Then the Token sub-tab is visible
    And the NFTs sub-tab is visible
    And the Point sub-tab is visible

  @regression
  @happy-path
  Scenario: Wallet quick action buttons are visible
    Then the Transfer button is visible
    And the Receive button is visible
    And the History button is visible

  @regression
  @happy-path
  Scenario: Tapping History navigates to Crypto History screen
    When I tap the History button
    Then I see the Crypto History screen
