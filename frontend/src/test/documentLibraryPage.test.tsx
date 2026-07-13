import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DocumentLibraryPage from '../pages/documentLibraryPage';
import { supabase } from '../utils/supabaseClient';
import {
  archiveDocument,
  getDocumentDownloadUrl,
  listDocumentVersions,
  listDocuments,
  restoreDocument,
  updateJobDocument,
  uploadDocument,
} from '../api/jobs';

jest.mock('../utils/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

jest.mock('../api/jobs', () => ({
  archiveDocument: jest.fn(),
  getDocumentDownloadUrl: jest.fn(),
  listDocumentVersions: jest.fn(),
  listDocuments: jest.fn(),
  restoreDocument: jest.fn(),
  updateJobDocument: jest.fn(),
  uploadDocument: jest.fn(),
}));

const mockGetSession = supabase.auth.getSession as jest.Mock;
const mockArchiveDocument = archiveDocument as jest.Mock;
const mockGetDocumentDownloadUrl = getDocumentDownloadUrl as jest.Mock;
const mockListDocumentVersions = listDocumentVersions as jest.Mock;
const mockListDocuments = listDocuments as jest.Mock;
const mockRestoreDocument = restoreDocument as jest.Mock;
const mockUpdateJobDocument = updateJobDocument as jest.Mock;
const mockUploadDocument = uploadDocument as jest.Mock;

const documents = [
  {
    document_id: 'doc-1',
    user_id: 'user-1',
    job_id: 'job-1',
    doc_type: 'resume',
    doc_title: 'Resume - Software Engineer at Acme',
    content: '# Resume',
    file_path: null,
    doc_version: 2,
    status: 'active',
    tags: [],
    updated_at: null,
    created_at: '2026-07-01T12:00:00Z',
  },
  {
    document_id: 'doc-2',
    user_id: 'user-1',
    job_id: 'job-2',
    doc_type: 'cover_letter',
    doc_title: 'Cover Letter - Designer at Studio',
    content: '# Cover Letter',
    file_path: null,
    doc_version: 1,
    status: 'active',
    tags: ['design'],
    updated_at: null,
    created_at: '2026-07-02T12:00:00Z',
  },
];

const archivedDocument = {
  ...documents[0],
  document_id: 'doc-archived',
  doc_title: 'Archived Resume',
  status: 'archived',
  updated_at: '2026-07-03T12:00:00Z',
};

describe('DocumentLibraryPage', () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'test-token' } } });
    mockListDocuments.mockResolvedValue(documents);
    mockListDocumentVersions.mockResolvedValue([]);
    mockArchiveDocument.mockResolvedValue({ ...documents[0], status: 'archived' });
    mockRestoreDocument.mockResolvedValue({ ...archivedDocument, status: 'active' });
    mockUpdateJobDocument.mockResolvedValue({ ...documents[0], doc_title: 'Updated Resume' });
    mockGetDocumentDownloadUrl.mockResolvedValue('https://example.com/signed-download');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('loads and renders all user documents', async () => {
    render(<DocumentLibraryPage />);

    expect(screen.getByRole('heading', { name: /document library/i })).toBeInTheDocument();
    expect(await screen.findByText('Resume - Software Engineer at Acme')).toBeInTheDocument();
    expect(screen.getByText('Cover Letter - Designer at Studio')).toBeInTheDocument();
    expect(screen.getByText('Version 2 · Created Jul 1, 2026')).toBeInTheDocument();
    expect(screen.getByText('design')).toBeInTheDocument();
    expect(mockListDocuments).toHaveBeenCalledWith('test-token', false);
  });

  it('shows an empty state when no documents exist', async () => {
    mockListDocuments.mockResolvedValueOnce([]);

    render(<DocumentLibraryPage />);

    expect(await screen.findByText('No documents saved yet.')).toBeInTheDocument();
    expect(
      screen.getByText('Saved resumes and cover letters will appear here.')
    ).toBeInTheDocument();
  });

  it('shows an error when documents fail to load', async () => {
    mockListDocuments.mockRejectedValueOnce(new Error('network error'));

    render(<DocumentLibraryPage />);

    expect(
      await screen.findByText('Unable to load your document library. Please try again.')
    ).toBeInTheDocument();
  });

  it('opens a read-only view dialog and loads version history for document content', async () => {
    mockListDocumentVersions.mockResolvedValueOnce([
      {
        version_id: 'version-1',
        document_id: 'doc-1',
        user_id: 'user-1',
        version_number: 1,
        content: '# Old Resume',
        file_path: null,
        created_at: '2026-07-01T12:00:00Z',
      },
    ]);
    render(<DocumentLibraryPage />);

    await screen.findByText('Resume - Software Engineer at Acme');
    await userEvent.click(screen.getAllByRole('button', { name: /view/i })[0]);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByDisplayValue('# Resume')).toBeInTheDocument();
    expect(await screen.findByText(/v1/)).toBeInTheDocument();
    expect(mockListDocumentVersions).toHaveBeenCalledWith('test-token', 'job-1', 'doc-1');
  });

  it('opens upload dialog and calls uploadDocument on submit', async () => {
    const uploadedDoc = {
      document_id: 'doc-3',
      user_id: 'user-1',
      job_id: null,
      doc_type: 'resume',
      doc_title: 'Uploaded Resume',
      content: null,
      file_path: 'user-1/doc-3.pdf',
      doc_version: 1,
      status: 'active',
      tags: [],
      updated_at: null,
      created_at: '2026-07-08T10:00:00Z',
    };
    mockListDocuments
      .mockResolvedValueOnce(documents)
      .mockResolvedValueOnce([uploadedDoc, ...documents]);
    mockUploadDocument.mockResolvedValueOnce(uploadedDoc);

    render(<DocumentLibraryPage />);
    await screen.findByText('Resume - Software Engineer at Acme');

    await userEvent.click(screen.getByRole('button', { name: /upload document/i }));
    expect(screen.getByRole('dialog', { name: /upload document/i })).toBeInTheDocument();

    const titleInput = screen.getByLabelText(/document title/i);
    fireEvent.change(titleInput, { target: { value: 'Uploaded Resume' } });

    const file = new File(['%PDF-1.4'], 'resume.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByTestId('file-upload-input') as HTMLInputElement;
    Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
    fireEvent.change(fileInput);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^upload$/i })).not.toBeDisabled()
    );
    await userEvent.click(screen.getByRole('button', { name: /^upload$/i }));

    await waitFor(() => expect(mockUploadDocument).toHaveBeenCalledTimes(1));
    expect(mockUploadDocument).toHaveBeenCalledWith(
      'test-token',
      file,
      'resume',
      'Uploaded Resume'
    );
    expect(await screen.findByText('Uploaded Resume')).toBeInTheDocument();
  });

  it('shows an error in upload dialog when an unsupported file type is selected', async () => {
    render(<DocumentLibraryPage />);
    await screen.findByText('Resume - Software Engineer at Acme');

    await userEvent.click(screen.getByRole('button', { name: /upload document/i }));

    const badFile = new File(['data'], 'malware.exe', { type: 'application/octet-stream' });
    const fileInput = screen.getByTestId('file-upload-input') as HTMLInputElement;
    Object.defineProperty(fileInput, 'files', { value: [badFile], configurable: true });
    fireEvent.change(fileInput);

    expect(await screen.findByText(/unsupported file type/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^upload$/i })).toBeDisabled();
  });

  it('shows Uploaded File chip and Download button for documents with a file_path', async () => {
    const docWithFile = {
      document_id: 'doc-4',
      user_id: 'user-1',
      job_id: null,
      doc_type: 'cover_letter',
      doc_title: 'Uploaded Cover Letter',
      content: null,
      file_path: 'user-1/doc-4.pdf',
      doc_version: 1,
      status: 'active',
      tags: [],
      updated_at: null,
      created_at: '2026-07-08T09:00:00Z',
    };
    mockListDocuments.mockResolvedValueOnce([docWithFile]);

    render(<DocumentLibraryPage />);
    await screen.findByText('Uploaded Cover Letter');

    expect(screen.getByText('Uploaded File')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /view/i })).not.toBeInTheDocument();
  });

  it('shows an error when a document download fails', async () => {
    const docWithFile = {
      document_id: 'doc-4',
      user_id: 'user-1',
      job_id: null,
      doc_type: 'cover_letter',
      doc_title: 'Uploaded Cover Letter',
      content: null,
      file_path: 'user-1/doc-4.pdf',
      doc_version: 1,
      status: 'active',
      tags: [],
      updated_at: null,
      created_at: '2026-07-08T09:00:00Z',
    };
    mockListDocuments.mockResolvedValueOnce([docWithFile]);
    mockGetDocumentDownloadUrl.mockRejectedValueOnce(new Error('download failed'));

    render(<DocumentLibraryPage />);
    await screen.findByText('Uploaded Cover Letter');

    await userEvent.click(screen.getByRole('button', { name: /download/i }));

    expect(
      await screen.findByText('Unable to download document. Please try again.')
    ).toBeInTheDocument();
  });

  it('loads archived documents when the archived toggle is enabled', async () => {
    mockListDocuments.mockResolvedValueOnce(documents).mockResolvedValueOnce([archivedDocument]);

    render(<DocumentLibraryPage />);

    await screen.findByText('Resume - Software Engineer at Acme');
    await userEvent.click(screen.getByRole('checkbox', { name: /show archived/i }));

    expect(await screen.findByText('Archived Resume')).toBeInTheDocument();
    expect(screen.queryByText('Resume - Software Engineer at Acme')).not.toBeInTheDocument();
    expect(screen.queryByText('Cover Letter - Designer at Studio')).not.toBeInTheDocument();
    expect(screen.getByText('archived')).toBeInTheDocument();
    expect(mockListDocuments).toHaveBeenLastCalledWith('test-token', true);
  });

  it('archives an active document and reloads the library', async () => {
    render(<DocumentLibraryPage />);

    await screen.findByText('Resume - Software Engineer at Acme');
    await userEvent.click(screen.getAllByRole('button', { name: /archive/i })[0]);

    await waitFor(() => expect(mockArchiveDocument).toHaveBeenCalledWith('test-token', 'doc-1'));
    expect(mockListDocuments).toHaveBeenLastCalledWith('test-token', false);
  });

  it('restores an archived document and reloads the library', async () => {
    mockListDocuments.mockResolvedValue([archivedDocument]);

    render(<DocumentLibraryPage />);

    await screen.findByText('Archived Resume');
    await userEvent.click(screen.getByRole('button', { name: /restore/i }));

    await waitFor(() =>
      expect(mockRestoreDocument).toHaveBeenCalledWith('test-token', 'doc-archived')
    );
    expect(mockListDocuments).toHaveBeenLastCalledWith('test-token', false);
  });

  it('updates document metadata from the edit dialog', async () => {
    render(<DocumentLibraryPage />);

    await screen.findByText('Resume - Software Engineer at Acme');
    await userEvent.click(screen.getAllByRole('button', { name: /^edit$/i })[0]);
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Updated Resume' } });
    fireEvent.change(screen.getByLabelText(/tags/i), { target: { value: 'backend, remote' } });
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() =>
      expect(mockUpdateJobDocument).toHaveBeenCalledWith('test-token', 'job-1', 'doc-1', {
        doc_title: 'Updated Resume',
        status: 'active',
        tags: ['backend', 'remote'],
      })
    );
  });

  it('shows an error when archive or restore fails', async () => {
    mockArchiveDocument.mockRejectedValueOnce(new Error('network error'));

    render(<DocumentLibraryPage />);

    await screen.findByText('Resume - Software Engineer at Acme');
    await userEvent.click(screen.getAllByRole('button', { name: /archive/i })[0]);

    expect(
      await screen.findByText('Unable to update document status. Please try again.')
    ).toBeInTheDocument();
  });

  it('shows a Download button in the view dialog that triggers a blob download for content documents', async () => {
    const mockCreateObjectURL = jest.fn().mockReturnValue('blob:mock-url');
    const mockRevokeObjectURL = jest.fn();
    Object.defineProperty(URL, 'createObjectURL', { writable: true, value: mockCreateObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { writable: true, value: mockRevokeObjectURL });

    render(<DocumentLibraryPage />);
    await screen.findByText('Resume - Software Engineer at Acme');

    // doc-1 (Resume) is first in API order on this branch (no sort feature yet)
    await userEvent.click(screen.getAllByRole('button', { name: /^view$/i })[0]);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();

    const downloadBtn = within(dialog).getByRole('button', { name: /^download$/i });
    expect(downloadBtn).toBeInTheDocument();

    await userEvent.click(downloadBtn);

    expect(mockCreateObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });
});
