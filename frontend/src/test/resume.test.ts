// resume.test.ts
// Tests for the resume generation API client (src/api/resume.ts) — verifies that
// generateResume issues the correct HTTP request (URL, method, auth header, body),
// returns the parsed JSON body, and throws on a non-ok response.

import '@testing-library/jest-dom';
import { generateResume, improveResume } from '../api/resume';

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const API_BASE = 'http://localhost:8000';
const RESUME_URL = `${API_BASE}/resume/generate`;
const ACCESS_TOKEN = 'fake-access-token';
const JOB_ID = 'job-123';

const JSON_HEADERS = {
  Authorization: `Bearer ${ACCESS_TOKEN}`,
  'Content-Type': 'application/json',
};

const GENERATED_RESUME = 'JANE DOE\n\nTailored summary...\n\nExperience...';

/** Builds a fetch Response mock with the given ok flag and json() body. */
const mockFetchResponse = (body: unknown, ok = true) => ({
  ok,
  json: jest.fn().mockResolvedValue(body),
});

// ---------------------------------------------------------------------------
// Resume generation API Tests
// ---------------------------------------------------------------------------

describe('resume API', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateResume', () => {
    it('should send a POST request to /resume/generate with the job_id JSON body and auth header', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse({ resume: GENERATED_RESUME })
      );

      // Act
      await generateResume(ACCESS_TOKEN, JOB_ID);

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(RESUME_URL, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ job_id: JOB_ID }),
      });
    });

    it('should return the parsed resume payload on success', async () => {
      // Arrange
      const expected = { resume: GENERATED_RESUME };
      (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse(expected));

      // Act
      const result = await generateResume(ACCESS_TOKEN, JOB_ID);

      // Assert
      expect(result).toEqual(expected);
    });

    it('should throw a user-facing error when the response is not ok', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse(null, false));

      // Act & Assert
      await expect(generateResume(ACCESS_TOKEN, JOB_ID)).rejects.toThrow(
        'Failed to generate resume. Please try again.'
      );
    });

    it('should not parse the body when the response is not ok', async () => {
      // Arrange
      const response = mockFetchResponse(null, false);
      (global.fetch as jest.Mock).mockResolvedValue(response);

      // Act
      await generateResume(ACCESS_TOKEN, JOB_ID).catch(() => undefined);

      // Assert
      expect(response.json).not.toHaveBeenCalled();
    });
  });

  describe('improveResume', () => {
    const IMPROVE_URL = `${API_BASE}/resume/improve`;
    const DRAFT_TEXT = '# John Doe\n\nSummary...';
    const IMPROVED_TEXT = '# John Doe\n\nPolished summary...';

    it('should send a POST request to /resume/improve with job_id and draft_text', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse({ improved: IMPROVED_TEXT }));

      await improveResume(ACCESS_TOKEN, JOB_ID, DRAFT_TEXT);

      expect(global.fetch).toHaveBeenCalledWith(IMPROVE_URL, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ job_id: JOB_ID, draft_text: DRAFT_TEXT }),
      });
    });

    it('should return the parsed improved payload on success', async () => {
      const expected = { improved: IMPROVED_TEXT };
      (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse(expected));

      const result = await improveResume(ACCESS_TOKEN, JOB_ID, DRAFT_TEXT);

      expect(result).toEqual(expected);
    });

    it('should throw a user-facing error when the response is not ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse(null, false));

      await expect(improveResume(ACCESS_TOKEN, JOB_ID, DRAFT_TEXT)).rejects.toThrow(
        'Failed to improve resume. Please try again.'
      );
    });

    it('should not parse the body when the response is not ok', async () => {
      const response = mockFetchResponse(null, false);
      (global.fetch as jest.Mock).mockResolvedValue(response);

      await improveResume(ACCESS_TOKEN, JOB_ID, DRAFT_TEXT).catch(() => undefined);

      expect(response.json).not.toHaveBeenCalled();
    });
  });
});
