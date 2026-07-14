// jobs.test.ts
// Tests for the jobs API client's document-metadata surface (S3-002) —
// verifies updateJobDocument issues a PATCH with the correct URL, headers, and
// body, returns the parsed DocumentRecord, and throws when the response is not ok.

import '@testing-library/jest-dom';
import {
  createJobDocument,
  linkDocumentToJob,
  listDocuments,
  unlinkDocumentFromJob,
  updateJobDocument,
  DocumentPayload,
  DocumentRecord,
  DocumentUpdatePayload,
} from '../api/jobs';

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const API_URL = 'http://localhost:8000';
const ACCESS_TOKEN = 'fake-access-token';
const JOB_ID = 'job-1111';
const DOCUMENT_ID = 'doc-2222';
const DOCUMENT_URL = `${API_URL}/jobs/${JOB_ID}/documents/${DOCUMENT_ID}`;

const buildDocument = (overrides: Partial<DocumentRecord> = {}): DocumentRecord => ({
  document_id: DOCUMENT_ID,
  job_id: JOB_ID,
  user_id: 'user-3333',
  doc_type: 'resume',
  doc_title: 'Resume',
  content: '# Resume',
  file_path: null,
  doc_version: 1,
  status: 'active',
  tags: [],
  updated_at: null,
  created_at: '2026-06-20T00:00:00Z',
  ...overrides,
});

/** Builds a fetch Response mock with a controllable ok flag and JSON body. */
const mockFetchResponse = (body: unknown, ok = true) => ({
  ok,
  json: jest.fn().mockResolvedValue(body),
});

// ---------------------------------------------------------------------------
// updateJobDocument Tests
// ---------------------------------------------------------------------------

describe('jobs API — updateJobDocument', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('request construction', () => {
    it('should send a PATCH request to the nested document route with auth and JSON headers', async () => {
      // Arrange
      const payload: DocumentUpdatePayload = { status: 'archived' };
      (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse(buildDocument()));

      // Act
      await updateJobDocument(ACCESS_TOKEN, JOB_ID, DOCUMENT_ID, payload);

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(DOCUMENT_URL, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    });

    it('should serialize a full metadata payload of title, status, and tags', async () => {
      // Arrange
      const payload: DocumentUpdatePayload = {
        doc_title: 'Resume (final)',
        status: 'draft',
        tags: ['backend', 'remote'],
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse(buildDocument()));

      // Act
      await updateJobDocument(ACCESS_TOKEN, JOB_ID, DOCUMENT_ID, payload);

      // Assert
      const [, requestInit] = (global.fetch as jest.Mock).mock.calls[0];
      expect(JSON.parse(requestInit.body)).toEqual(payload);
    });

    it('should send an empty body object when no fields are being updated', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse(buildDocument()));

      // Act
      await updateJobDocument(ACCESS_TOKEN, JOB_ID, DOCUMENT_ID, {});

      // Assert
      const [, requestInit] = (global.fetch as jest.Mock).mock.calls[0];
      expect(requestInit.body).toBe('{}');
    });

    it('should omit fields that are absent from the payload so partial updates stay partial', async () => {
      // Arrange
      const payload: DocumentUpdatePayload = { tags: ['filed'] };
      (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse(buildDocument()));

      // Act
      await updateJobDocument(ACCESS_TOKEN, JOB_ID, DOCUMENT_ID, payload);

      // Assert
      const [, requestInit] = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(requestInit.body);
      expect(body).not.toHaveProperty('doc_title');
      expect(body).not.toHaveProperty('status');
    });
  });

  describe('response handling', () => {
    it('should return the updated document record when the request succeeds', async () => {
      // Arrange
      const updated = buildDocument({
        doc_title: 'Resume (final)',
        status: 'archived',
        tags: ['senior'],
        updated_at: '2026-07-01T12:00:00Z',
      });
      (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse(updated));

      // Act
      const result = await updateJobDocument(ACCESS_TOKEN, JOB_ID, DOCUMENT_ID, {
        status: 'archived',
      });

      // Assert
      expect(result).toEqual(updated);
    });

    it('should throw an "Unable to update document." error when the response is not ok', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse({}, false));

      // Act & Assert
      await expect(
        updateJobDocument(ACCESS_TOKEN, JOB_ID, DOCUMENT_ID, { status: 'archived' })
      ).rejects.toThrow('Unable to update document.');
    });

    it('should not attempt to parse the body when the response is not ok', async () => {
      // Arrange
      const response = mockFetchResponse({}, false);
      (global.fetch as jest.Mock).mockResolvedValue(response);

      // Act
      await expect(
        updateJobDocument(ACCESS_TOKEN, JOB_ID, DOCUMENT_ID, { status: 'archived' })
      ).rejects.toThrow();

      // Assert
      expect(response.json).not.toHaveBeenCalled();
    });

    it('should propagate a network-level rejection from fetch', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network down'));

      // Act & Assert
      await expect(
        updateJobDocument(ACCESS_TOKEN, JOB_ID, DOCUMENT_ID, { status: 'draft' })
      ).rejects.toThrow('Network down');
    });
  });
});

// ---------------------------------------------------------------------------
// linkDocumentToJob Tests
// ---------------------------------------------------------------------------

describe('jobs API — linkDocumentToJob', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should send a PATCH request to the link route with the auth header', async () => {
    // Arrange
    (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse(buildDocument()));

    // Act
    await linkDocumentToJob(ACCESS_TOKEN, JOB_ID, DOCUMENT_ID);

    // Assert
    expect(global.fetch).toHaveBeenCalledWith(`${DOCUMENT_URL}/link`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
    });
  });

  it('should throw an "Unable to link document." error when the response is not ok', async () => {
    // Arrange
    (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse({}, false));

    // Act & Assert
    await expect(linkDocumentToJob(ACCESS_TOKEN, JOB_ID, DOCUMENT_ID)).rejects.toThrow(
      'Unable to link document.'
    );
  });
});

// ---------------------------------------------------------------------------
// unlinkDocumentFromJob Tests
// ---------------------------------------------------------------------------

describe('jobs API — unlinkDocumentFromJob', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should send a PATCH request to the unlink route with the auth header', async () => {
    // Arrange
    (global.fetch as jest.Mock).mockResolvedValue(
      mockFetchResponse(buildDocument({ job_id: null }))
    );

    // Act
    await unlinkDocumentFromJob(ACCESS_TOKEN, JOB_ID, DOCUMENT_ID);

    // Assert
    expect(global.fetch).toHaveBeenCalledWith(`${DOCUMENT_URL}/unlink`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
    });
  });

  it('should throw an "Unable to unlink document." error when the response is not ok', async () => {
    // Arrange
    (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse({}, false));

    // Act & Assert
    await expect(unlinkDocumentFromJob(ACCESS_TOKEN, JOB_ID, DOCUMENT_ID)).rejects.toThrow(
      'Unable to unlink document.'
    );
  });
});

// ---------------------------------------------------------------------------
// listDocuments Tests
// ---------------------------------------------------------------------------

describe('jobs API — listDocuments', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should send a GET request to the library route with the auth header and return the array', async () => {
    // Arrange
    const library = [buildDocument(), buildDocument({ document_id: 'doc-9999' })];
    (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse(library));

    // Act
    const result = await listDocuments(ACCESS_TOKEN);

    // Assert
    expect(global.fetch).toHaveBeenCalledWith(
      `${API_URL}/jobs/documents?include_archived=false&sort_order=desc`,
      { method: 'GET', headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } }
    );
    expect(result).toEqual(library);
  });

  it('should throw an "Unable to load documents." error when the response is not ok', async () => {
    // Arrange
    (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse({}, false));

    // Act & Assert
    await expect(listDocuments(ACCESS_TOKEN)).rejects.toThrow('Unable to load documents.');
  });
});

// ---------------------------------------------------------------------------
// createJobDocument Tests
// ---------------------------------------------------------------------------

describe('jobs API — createJobDocument', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should send a POST request to the nested documents route with the payload and JSON headers', async () => {
    // Arrange
    const payload: DocumentPayload = {
      doc_type: 'resume',
      doc_title: 'Resume - Software Engineer at Acme',
      content: '# Resume',
    };
    (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse(buildDocument()));

    // Act
    await createJobDocument(ACCESS_TOKEN, JOB_ID, payload);

    // Assert
    expect(global.fetch).toHaveBeenCalledWith(`${API_URL}/jobs/${JOB_ID}/documents`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  });

  it('should throw an "Unable to save document." error when the response is not ok', async () => {
    // Arrange
    const payload: DocumentPayload = { doc_type: 'cover_letter', doc_title: 'Cover Letter' };
    (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse({}, false));

    // Act & Assert
    await expect(createJobDocument(ACCESS_TOKEN, JOB_ID, payload)).rejects.toThrow(
      'Unable to save document.'
    );
  });
});
