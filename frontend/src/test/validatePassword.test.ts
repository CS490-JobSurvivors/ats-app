// validatePassword.test.ts
// Tests for validatePassword — verifies password complexity and length rules

import { validatePassword } from '../components/validatePassword';

describe('validatePassword', () => {
  describe('valid passwords', () => {
    test('should return true when password meets all requirements', () => {
      const password = 'Abcdef1!';

      const result = validatePassword(password);

      expect(result).toBe(true);
    });

    test('should return true when password is exactly the minimum length of 8', () => {
      const password = 'Abcde1!x';

      const result = validatePassword(password);

      expect(result).toBe(true);
    });

    test('should return true when password is exactly the maximum length of 20', () => {
      const password = 'Abcdefghij1234567!aZ';

      const result = validatePassword(password);

      expect(result).toBe(true);
    });

    test('should return true when password contains multiple special characters', () => {
      const password = 'Abc1!@#$%';

      const result = validatePassword(password);

      expect(result).toBe(true);
    });
  });

  describe('invalid passwords', () => {
    test('should return false when password has no uppercase letter', () => {
      const password = 'abcdef1!';

      const result = validatePassword(password);

      expect(result).toBe(false);
    });

    test('should return false when password has no lowercase letter', () => {
      const password = 'ABCDEF1!';

      const result = validatePassword(password);

      expect(result).toBe(false);
    });

    test('should return false when password has no digit', () => {
      const password = 'Abcdefg!';

      const result = validatePassword(password);

      expect(result).toBe(false);
    });

    test('should return false when password has no special character', () => {
      const password = 'Abcdefg1';

      const result = validatePassword(password);

      expect(result).toBe(false);
    });

    test('should return false when underscore is the only special character', () => {
      const password = 'Abcdef1_';

      const result = validatePassword(password);

      expect(result).toBe(false);
    });

    test('should return false when password is shorter than 8 characters', () => {
      const password = 'Abc1!a';

      const result = validatePassword(password);

      expect(result).toBe(false);
    });

    test('should return false when password is longer than 20 characters', () => {
      const password = 'Abcdefghij1234567!aZbc';

      const result = validatePassword(password);

      expect(result).toBe(false);
    });

    test('should return false when password is an empty string', () => {
      const password = '';

      const result = validatePassword(password);

      expect(result).toBe(false);
    });
  });
});
