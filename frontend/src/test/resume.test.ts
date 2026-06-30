// resume.test.ts
// Tests for the resume and cover letter API clients (src/api/resume.ts) — verifies
// correct HTTP request (URL, method, auth header, body), parsed response, and error
// handling for both generateResume and generateCoverLetter.

import '@testing-library/jest-dom';
import { generateCoverLetter, generateResume, improveResume } from '../api/resume';

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const API_BASE = 'http://localhost:8000';
const RESUME_URL = `${API_BASE}/resume/generate`;
const COVER_LETTER_URL = `${API_BASE}/resume/cover-letter`;
const ACCESS_TOKEN = 'fake-access-token';
const JOB_ID = 'job-123';

const JSON_HEADERS = {
  Authorization: `Bearer ${ACCESS_TOKEN}`,
  'Content-Type': 'application/json',
};

const GENERATED_RESUME = 'JANE DOE\n\nTailored summary...\n\nExperience...';
const GENERATED_COVER_LETTER = 'Dear Hiring Team,\n\nI am excited to apply...';

const mockFetchResponse = (body: unknown, ok = true) => ({
  ok,
  json: jest.fn().mockResolvedValue(body),
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('resume API', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateResume', () => {
    it('should send a POST request to /resume/generate with job_id body and auth header', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse({ resume: GENERATED_RESUME })
      );

      await generateResume(ACCESS_TOKEN, JOB_ID);

      expect(global.fetch).toHaveBeenCalledWith(RESUME_URL, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ job_id: JOB_ID }),
      });
    });

    it('should return the parsed resume payload on success', async () => {
      const expected = { resume: GENERATED_RESUME };
      (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse(expected));

      const result = await generateResume(ACCESS_TOKEN, JOB_ID);

      expect(result).toEqual(expected);
    });

    it('should throw a user-facing error when the response is not ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse(null, false));

      await expect(generateResume(ACCESS_TOKEN, JOB_ID)).rejects.toThrow(
        'Failed to generate resume. Please try again.'
      );
    });

    it('should not parse the body when the response is not ok', async () => {
      const response = mockFetchResponse(null, false);
      (global.fetch as jest.Mock).mockResolvedValue(response);

      await generateResume(ACCESS_TOKEN, JOB_ID).catch(() => undefined);

      expect(response.json).not.toHaveBeenCalled();
    });
  });

  describe('generateCoverLetter', () => {
    it('should send a POST request to /resume/cover-letter with job_id body and auth header', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockFetchResponse({ cover_letter: GENERATED_COVER_LETTER })
      );

      await generateCoverLetter(ACCESS_TOKEN, JOB_ID);

      expect(global.fetch).toHaveBeenCalledWith(COVER_LETTER_URL, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ job_id: JOB_ID }),
      });
    });

    it('should return the parsed cover letter payload on success', async () => {
      const expected = { cover_letter: GENERATED_COVER_LETTER };
      (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse(expected));

      const result = await generateCoverLetter(ACCESS_TOKEN, JOB_ID);

      expect(result).toEqual(expected);
    });

    it('should throw a user-facing error when the response is not ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse(null, false));

      await expect(generateCoverLetter(ACCESS_TOKEN, JOB_ID)).rejects.toThrow(
        'Failed to generate cover letter. Please try again.'
      );
    });

    it('should not parse the body when the response is not ok', async () => {
      const response = mockFetchResponse(null, false);
      (global.fetch as jest.Mock).mockResolvedValue(response);

      await generateCoverLetter(ACCESS_TOKEN, JOB_ID).catch(() => undefined);

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
