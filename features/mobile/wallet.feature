@mobile
@devtools
@wallet-screen
Feature: Wallet Screen (KUB Wallet)

  Background:
    Given I am on the Wallet screen via DEV TOOLS

  @smoke @wallet-tabs
  Scenario: Wallet screen shows Crypto tab by default
    Then I see the Wallet screen
    And the Crypto tab is active

  @wallet-subtabs
  Scenario: Wallet screen has Token, NFTs and Point sub-tabs
    Then I see the Wallet screen
    And the Token sub-tab is visible
    And the NFTs sub-tab is visible
    And the Point sub-tab is visible

  @wallet-actions
  Scenario: Wallet quick action buttons are visible
    Then I see the Wallet screen
    And the Transfer button is visible
    And the Receive button is visible
    And the History button is visible

  @wallet-history
  Scenario: Tapping History navigates to Crypto History screen
    When I tap the History button
    Then I see the Crypto History screen
