// education.test.ts
// Tests for the Education CRUD API client (src/api/education.ts) — verifies each
// function issues the correct HTTP request (URL, method, auth header, body),
// returns the parsed JSON body, and throws on non-ok responses.

import '@testing-library/jest-dom';
import {
  listEducation,
  createEducation,
  updateEducation,
  deleteEducation,
  reorderEducation,
  EducationRecord,
  EducationPayload,
} from '../api/education';

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const API_BASE = 'http://localhost:8000';
const EDUCATION_URL = `${API_BASE}/education`;
const ACCESS_TOKEN = 'fake-access-token';
const EDUCATION_ID = 'edu-1';

const AUTH_HEADER = { Authorization: `Bearer ${ACCESS_TOKEN}` };
const JSON_HEADERS = { ...AUTH_HEADER, 'Content-Type': 'application/json' };

const SAMPLE_RECORD: EducationRecord = {
  education_id: EDUCATION_ID,
  education_user_id: 'user-1',
  institution_name: 'State University',
  degree: 'Bachelor of Science',
  major: 'Computer Science',
  start_date: '2020-09-01',
  end_date: '2024-05-01',
  GPA: 3.8,
  is_current: false,
  position_number: 0,
};

const SAMPLE_PAYLOAD: EducationPayload = {
  institution_name: 'State University',
  degree: 'Bachelor of Science',
  major: 'Computer Science',
  start_date: '2020-09-01',
  end_date: '2024-05-01',
  GPA: 3.8,
  is_current: false,
};

/** Builds a fetch Response mock with the given ok flag and json() body. */
const mockFetchResponse = (body: unknown, ok = true) => ({
  ok,
  json: jest.fn().mockResolvedValue(body),
});

// ---------------------------------------------------------------------------
// Education CRUD API Tests
// ---------------------------------------------------------------------------

describe('education API', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listEducation', () => {
    it('should send a GET request to /education with the bearer authorization header', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse([SAMPLE_RECORD]));

      // Act
      await listEducation(ACCESS_TOKEN);

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(EDUCATION_URL, {
        headers: AUTH_HEADER,
      });
    });

    it('should return the parsed list of education records', async () => {
      // Arrange
      const expected = [SAMPLE_RECORD];
      (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse(expected));

      // Act
      const result = await listEducation(ACCESS_TOKEN);

      // Assert
      expect(result).toEqual(expected);
    });

    it('should throw when the response is not ok', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse(null, false));

      // Act & Assert
      await expect(listEducation(ACCESS_TOKEN)).rejects.toThrow('Unable to load education.');
    });
  });

  describe('createEducation', () => {
    it('should send a POST request with the payload as the JSON body', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse(SAMPLE_RECORD));

      // Act
      await createEducation(ACCESS_TOKEN, SAMPLE_PAYLOAD);

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(EDUCATION_URL, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify(SAMPLE_PAYLOAD),
      });
    });

    it('should return the created education record', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse(SAMPLE_RECORD));

      // Act
      const result = await createEducation(ACCESS_TOKEN, SAMPLE_PAYLOAD);

      // Assert
      expect(result).toEqual(SAMPLE_RECORD);
    });

    it('should throw when the response is not ok', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse(null, false));

      // Act & Assert
      await expect(createEducation(ACCESS_TOKEN, SAMPLE_PAYLOAD)).rejects.toThrow(
        'Unable to create education record.'
      );
    });
  });

  describe('updateEducation', () => {
    it('should send a PATCH request to /education/:id with the payload as the JSON body', async () => {
      // Arrange
      const patch = { degree: 'Master of Science' };
      (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse(SAMPLE_RECORD));

      // Act
      await updateEducation(ACCESS_TOKEN, EDUCATION_ID, patch);

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(`${EDUCATION_URL}/${EDUCATION_ID}`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify(patch),
      });
    });

    it('should return the updated education record', async () => {
      // Arrange
      const updated = { ...SAMPLE_RECORD, degree: 'Master of Science' };
      (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse(updated));

      // Act
      const result = await updateEducation(ACCESS_TOKEN, EDUCATION_ID, {
        degree: 'Master of Science',
      });

      // Assert
      expect(result).toEqual(updated);
    });

    it('should throw when the response is not ok', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse(null, false));

      // Act & Assert
      await expect(updateEducation(ACCESS_TOKEN, EDUCATION_ID, {})).rejects.toThrow(
        'Unable to update education record.'
      );
    });
  });

  describe('deleteEducation', () => {
    it('should send a DELETE request to /education/:id with the bearer authorization header', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse(null));

      // Act
      await deleteEducation(ACCESS_TOKEN, EDUCATION_ID);

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(`${EDUCATION_URL}/${EDUCATION_ID}`, {
        method: 'DELETE',
        headers: AUTH_HEADER,
      });
    });

    it('should resolve to undefined on success', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse(null));

      // Act
      const result = await deleteEducation(ACCESS_TOKEN, EDUCATION_ID);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should throw when the response is not ok', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse(null, false));

      // Act & Assert
      await expect(deleteEducation(ACCESS_TOKEN, EDUCATION_ID)).rejects.toThrow(
        'Unable to delete education record.'
      );
    });
  });

  describe('reorderEducation', () => {
    const ENTRIES = [
      { education_id: 'edu-1', position_number: 1 },
      { education_id: 'edu-2', position_number: 0 },
    ];

    it('should send a PATCH request to /education/reorder with the entries as the JSON body', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse(null));

      // Act
      await reorderEducation(ACCESS_TOKEN, ENTRIES);

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(`${EDUCATION_URL}/reorder`, {
        method: 'PATCH',
        headers: JSON_HEADERS,
        body: JSON.stringify(ENTRIES),
      });
    });

    it('should resolve to undefined on success', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse(null));

      // Act
      const result = await reorderEducation(ACCESS_TOKEN, ENTRIES);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should throw when the response is not ok', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse(null, false));

      // Act & Assert
      await expect(reorderEducation(ACCESS_TOKEN, ENTRIES)).rejects.toThrow(
        'Unable to reorder education records.'
      );
    });
  });
});
