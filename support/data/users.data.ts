/**
 * Test data สำหรับ user scenarios
 * ใช้ร่วมกันได้ทั้ง UI steps และ API steps
 */
export const users = {
  valid: {
    username: 'testuser',
    password: 'correctpassword',
  },
  invalid: {
    username: 'testuser',
    password: 'wrongpassword',
  },
  admin: {
    username: 'admin',
    password: 'adminpassword',
  },
} as const;
