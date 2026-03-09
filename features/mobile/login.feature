Feature: ระบบ Login บน Mobile (Flutter)

  Scenario: เข้าสู่ระบบไม่สำเร็จด้วยรหัสผ่านที่ผิด
    Given ฉันอยู่ที่หน้า Login ของแอป
    When ฉันกรอกชื่อผู้ใช้บนมือถือว่า "testuser"
    And ฉันกรอกรหัสผ่านบนมือถือว่า "wrongpassword"
    And ฉันกดปุ่ม Login บนมือถือ
    Then ฉันควรจะเห็นข้อความ error ว่า "รหัสผ่านไม่ถูกต้อง"

  Scenario: เข้าสู่ระบบสำเร็จด้วยข้อมูลที่ถูกต้อง
    Given ฉันอยู่ที่หน้า Login ของแอป
    When ฉันกรอกชื่อผู้ใช้บนมือถือว่า "testuser"
    And ฉันกรอกรหัสผ่านบนมือถือว่า "correctpassword"
    And ฉันกดปุ่ม Login บนมือถือ
    Then ฉันควรจะเห็นหน้าหลักของแอป

  @manual
  Scenario: ตรวจสอบ UI ว่าปุ่ม Login disabled ตอนช่อง input ว่าง
    Given ฉันอยู่ที่หน้า Login ของแอป
    Then ปุ่ม Login ควร disabled อยู่
