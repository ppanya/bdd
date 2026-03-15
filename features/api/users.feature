Feature: จัดการข้อมูล Users ผ่าน API

  @smoke
  @happy-path
  Scenario: ดึงรายการ users ทั้งหมด
    When ฉันเรียก GET "/api/users"
    Then status code ควรเป็น 200
    And response ควรเป็น array

  @regression
  @happy-path
  Scenario: สร้าง user ใหม่สำเร็จ
    When ฉันเรียก POST "/api/users" ด้วย:
      | username | email             |
      | alice    | alice@example.com |
    Then status code ควรเป็น 201
    And response ควรมี field "id"

  @regression
  @negative
  Scenario: สร้าง user ที่ข้อมูลไม่ครบ ควรได้ 400
    Given ทดสอบ error case ด้วย status 400
    When ฉันเรียก POST "/api/users" ด้วย:
      | username |
      | alice    |
    Then status code ควรเป็น 400

  @regression
  @negative
  Scenario: ดึง user ที่ไม่มีอยู่ ควรได้ 404
    Given ทดสอบ error case ด้วย status 404
    When ฉันเรียก GET "/api/users/9999"
    Then status code ควรเป็น 404
