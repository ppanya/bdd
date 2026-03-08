Feature: ระบบ Login

  Scenario: เข้าสู่ระบบไม่สำเร็จด้วยรหัสผ่านที่ผิด
    Given ฉันอยู่ที่หน้า Login
    When ฉันกรอกชื่อผู้ใช้ว่า "tomsmith"
    And ฉันกรอกรหัสผ่านว่า "wrongpassword"
    And ฉันกดปุ่ม "Login"
    Then ฉันควรจะเห็นข้อความเตือนว่า "Your password is invalid!"

  Scenario: เข้าสู่ระบบสำเร็จด้วยข้อมูลที่ถูกต้อง
    Given ฉันอยู่ที่หน้า Login
    When ฉันกรอกชื่อผู้ใช้ว่า "tomsmith"
    And ฉันกรอกรหัสผ่านว่า "SuperSecretPassword!"
    And ฉันกดปุ่ม "Login"
    Then ฉันควรจะเห็นข้อความเตือนว่า "You logged into a secure area!"
