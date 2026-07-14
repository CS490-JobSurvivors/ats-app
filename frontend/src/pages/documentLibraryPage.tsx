import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import SearchIcon from '@mui/icons-material/Search';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { supabase } from '../utils/supabaseClient';
import {
  archiveDocument,
  DocStatus,
  DocumentRecord,
  DocumentUpdatePayload,
  DocumentVersion,
  DocType,
  getDocumentDownloadUrl,
  listDocumentVersions,
  listDocuments,
  restoreDocument,
  updateJobDocument,
  uploadDocument,
  updateLibraryDocument,
  duplicateDocument,
} from '../api/jobs';

const documentTypeLabel = (type: DocumentRecord['doc_type']) => {
  if (type === 'cover_letter') return 'Cover Letter';
  if (type === 'resume') return 'Resume';
  return 'Document';
};

const formatCreatedAt = (value: string) =>
  new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const statusColor = (status: DocStatus) => {
  if (status === 'archived') return 'error';
  if (status === 'draft') return 'warning';
  return 'default';
};

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt'];

const DocumentLibraryPage = () => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [actionErrorMessage, setActionErrorMessage] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [actionDocumentId, setActionDocumentId] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<DocumentRecord | null>(null);

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDocType, setUploadDocType] = useState<DocType>('resume');
  const [uploadDocTitle, setUploadDocTitle] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'' | DocType>('');
  const [filterTag, setFilterTag] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const hasActiveFilters = Boolean(filterType || filterTag);
  const visibleDocuments = documents.filter((d) => {
    if (filterTag && !d.tags.some((t) => t.toLowerCase().includes(filterTag.toLowerCase())))
      return false;
    return true;
  });

  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const [editingDocument, setEditingDocument] = useState<DocumentRecord | null>(null);
  const [editDocForm, setEditDocForm] = useState<{
    doc_title: string;
    status: DocStatus;
    tags_input: string;
  }>({ doc_title: '', status: 'active', tags_input: '' });
  const [isUpdatingDocument, setIsUpdatingDocument] = useState(false);
  const [editDocError, setEditDocError] = useState('');
  const [documentVersions, setDocumentVersions] = useState<DocumentVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  const getAccessToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('No active session.');

    return token;
  }, []);

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const token = await getAccessToken();
      const result = await listDocuments(
        token,
        includeArchived,
        filterType || undefined,
        undefined,
        sortOrder
      );
      setDocuments(result);
    } catch {
      setErrorMessage('Unable to load your document library. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [getAccessToken, includeArchived, filterType, sortOrder]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setUploadError('Unsupported file type. Allowed: PDF, DOCX, TXT.');
      setUploadFile(null);
      return;
    }
    setUploadError('');
    setUploadFile(file);
    if (!uploadDocTitle) setUploadDocTitle(file.name.replace(/\.[^/.]+$/, ''));
  };

  const handleUploadSubmit = async () => {
    if (!uploadFile || !uploadDocTitle.trim()) return;
    setIsUploading(true);
    setUploadError('');
    try {
      const token = await getAccessToken();
      await uploadDocument(token, uploadFile, uploadDocType, uploadDocTitle.trim());
      await loadDocuments();
      setUploadDialogOpen(false);
      setUploadFile(null);
      setUploadDocTitle('');
      setUploadDocType('resume');
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (doc: DocumentRecord) => {
    if (!doc.file_path) return;
    setActionErrorMessage('');
    setDownloadingId(doc.document_id);
    try {
      const token = await getAccessToken();
      const url = await getDocumentDownloadUrl(token, doc.document_id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      setActionErrorMessage('Unable to download document. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleArchiveToggle = async (document: DocumentRecord) => {
    setActionDocumentId(document.document_id);
    setActionErrorMessage('');

    try {
      const token = await getAccessToken();
      if (document.status === 'archived') {
        await restoreDocument(token, document.document_id);
      } else {
        await archiveDocument(token, document.document_id);
      }
      await loadDocuments();
    } catch {
      setActionErrorMessage('Unable to update document status. Please try again.');
    } finally {
      setActionDocumentId(null);
    }
  };

  const openEditDocument = (doc: DocumentRecord) => {
    setEditDocError('');
    setEditingDocument(doc);
    setEditDocForm({
      doc_title: doc.doc_title,
      status: doc.status,
      tags_input: doc.tags.join(', '),
    });
  };

  const saveEditDocument = async () => {
    if (!editingDocument) return;
    setIsUpdatingDocument(true);
    setEditDocError('');
    try {
      const token = await getAccessToken();
      const tags = editDocForm.tags_input
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const payload: DocumentUpdatePayload = {
        doc_title: editDocForm.doc_title,
        status: editDocForm.status,
        tags,
      };
      const updated = editingDocument.job_id
        ? await updateJobDocument(
            token,
            editingDocument.job_id,
            editingDocument.document_id,
            payload
          )
        : await updateLibraryDocument(token, editingDocument.document_id, payload);
      setDocuments((prev) =>
        prev.map((document) => (document.document_id === updated.document_id ? updated : document))
      );
      setEditingDocument(null);
    } catch {
      setEditDocError('Failed to update document.');
    } finally {
      setIsUpdatingDocument(false);
    }
  };

  const openDocument = async (document: DocumentRecord) => {
    setSelectedDocument(document);
    setDocumentVersions([]);
    if (!document.job_id) return;

    setVersionsLoading(true);
    try {
      const token = await getAccessToken();
      const versions = await listDocumentVersions(token, document.job_id, document.document_id);
      setDocumentVersions(versions);
    } finally {
      setVersionsLoading(false);
    }
  };

  const handleDuplicate = async (doc: DocumentRecord) => {
    setDuplicatingId(doc.document_id);
    try {
      const token = await getAccessToken();
      const copy = await duplicateDocument(token, doc.document_id);
      setDocuments((prev) => [copy, ...prev]);
    } catch {
      setErrorMessage('Unable to duplicate document. Please try again.');
    } finally {
      setDuplicatingId(null);
    }
  };

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', px: 3, py: 5 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          mb: 4,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h3" fontWeight={700} mb={1}>
            Document Library
          </Typography>
          <Typography variant="body1" color="text.secondary">
            View your saved resumes and cover letters in one place.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<UploadFileIcon />}
          onClick={() => setUploadDialogOpen(true)}
        >
          Upload Document
        </Button>
      </Box>

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMessage}
        </Alert>
      )}
      {actionErrorMessage && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {actionErrorMessage}
        </Alert>
      )}

      <Stack direction="row" spacing={2} sx={{ mb: 3 }} flexWrap="wrap" alignItems="center">
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel id="filter-type-label" shrink>
            Type
          </InputLabel>
          <Select
            labelId="filter-type-label"
            label="Type"
            value={filterType}
            displayEmpty
            notched
            onChange={(e) => setFilterType(e.target.value as '' | DocType)}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="resume">Resume</MenuItem>
            <MenuItem value="cover_letter">Cover Letter</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="sort-order-label">Sort by Date</InputLabel>
          <Select
            labelId="sort-order-label"
            label="Sort by Date"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
          >
            <MenuItem value="desc">Newest First</MenuItem>
            <MenuItem value="asc">Oldest First</MenuItem>
          </Select>
        </FormControl>
        <TextField
          size="small"
          label="Search by tag"
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value)}
          sx={{ minWidth: 180 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <FormControlLabel
          control={
            <Switch
              checked={includeArchived}
              onChange={(event) => setIncludeArchived(event.target.checked)}
            />
          }
          label="Show archived"
          sx={{ ml: 'auto' }}
        />
      </Stack>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress aria-label="Loading documents" />
        </Box>
      ) : documents.length === 0 && !hasActiveFilters ? (
        <Paper
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            px: 3,
            py: 5,
            textAlign: 'center',
          }}
        >
          <DescriptionOutlinedIcon sx={{ fontSize: 44, color: 'text.secondary', mb: 1 }} />
          <Typography variant="h6" fontWeight={600}>
            {includeArchived ? 'No archived documents.' : 'No documents saved yet.'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {includeArchived
              ? 'Archived resumes and cover letters will appear here.'
              : 'Saved resumes and cover letters will appear here.'}
          </Typography>
        </Paper>
      ) : visibleDocuments.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography color="text.secondary" sx={{ mb: 1 }}>
            No documents match the selected filters.
          </Typography>
          <Button
            size="small"
            onClick={() => {
              setFilterType('');
              setFilterTag('');
            }}
          >
            Clear filters
          </Button>
        </Box>
      ) : (
        <Stack spacing={2}>
          {visibleDocuments.map((document) => (
            <Paper
              key={document.document_id}
              elevation={0}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                p: 2.5,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr auto' },
                gap: 2,
                alignItems: 'center',
              }}
            >
              <Box>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}
                >
                  <Typography variant="h6" fontWeight={700}>
                    {document.doc_title}
                  </Typography>
                  <Chip size="small" label={documentTypeLabel(document.doc_type)} />
                  {document.file_path && (
                    <Chip size="small" label="Uploaded File" color="primary" variant="outlined" />
                  )}
                  <Chip
                    size="small"
                    label={document.status}
                    variant="outlined"
                    color={statusColor(document.status)}
                  />
                </Box>
                {document.tags.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
                    {document.tags.map((tag) => (
                      <Chip key={tag} label={tag} size="small" />
                    ))}
                  </Box>
                )}
                <Typography variant="body2" color="text.secondary">
                  Version {document.doc_version} &middot; Created{' '}
                  {formatCreatedAt(document.created_at)}
                  {document.updated_at ? ` · Updated ${formatCreatedAt(document.updated_at)}` : ''}
                </Typography>
              </Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="flex-end">
                <Button variant="outlined" size="small" onClick={() => openEditDocument(document)}>
                  Edit
                </Button>
                {document.file_path && (
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={downloadingId === document.document_id}
                    onClick={() => handleDownload(document)}
                  >
                    {downloadingId === document.document_id ? 'Loading...' : 'Download'}
                  </Button>
                )}
                {document.content && (
                  <Button variant="outlined" size="small" onClick={() => openDocument(document)}>
                    View
                  </Button>
                )}
                <Button
                  variant="outlined"
                  size="small"
                  color={document.status === 'archived' ? 'primary' : 'warning'}
                  disabled={actionDocumentId === document.document_id}
                  onClick={() => handleArchiveToggle(document)}
                >
                  {document.status === 'archived' ? 'Restore' : 'Archive'}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={duplicatingId === document.document_id}
                  onClick={() => handleDuplicate(document)}
                >
                  {duplicatingId === document.document_id ? 'Duplicating...' : 'Duplicate'}
                </Button>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      <Dialog
        open={Boolean(selectedDocument)}
        onClose={() => setSelectedDocument(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          {selectedDocument?.doc_title}
          <Typography variant="body2" color="text.secondary">
            {documentTypeLabel(selectedDocument?.doc_type ?? null)} &middot; Version{' '}
            {selectedDocument?.doc_version}
            {selectedDocument?.updated_at
              ? ` · Updated ${formatCreatedAt(selectedDocument.updated_at)}`
              : ''}
          </Typography>
          {selectedDocument && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
              <Chip
                size="small"
                label={selectedDocument.status}
                variant="outlined"
                color={statusColor(selectedDocument.status)}
              />
              {selectedDocument.tags.map((tag) => (
                <Chip key={tag} label={tag} size="small" />
              ))}
            </Box>
          )}
        </DialogTitle>
        <Divider />
        <DialogContent>
          <TextField
            value={selectedDocument?.content ?? ''}
            multiline
            fullWidth
            minRows={16}
            InputProps={{ readOnly: true }}
            inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.85rem' } }}
          />
          {selectedDocument?.job_id && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>
                Version History
              </Typography>
              {versionsLoading ? (
                <CircularProgress size={20} />
              ) : documentVersions.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No version history available.
                </Typography>
              ) : (
                <Stack spacing={0.5}>
                  {documentVersions.map((version) => (
                    <Box
                      key={version.version_id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        py: 0.5,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Typography variant="body2">
                        v{version.version_number} &middot;{' '}
                        {new Date(version.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Typography>
                      {version.content && (
                        <Button
                          size="small"
                          onClick={() =>
                            setSelectedDocument((prev) =>
                              prev ? { ...prev, content: version.content } : prev
                            )
                          }
                        >
                          Restore
                        </Button>
                      )}
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigator.clipboard.writeText(selectedDocument?.content ?? '')}>
            Copy
          </Button>
          <Button
            onClick={() => {
              const blob = new Blob([selectedDocument?.content ?? ''], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${selectedDocument?.doc_title ?? 'document'}.txt`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Download
          </Button>
          <Button variant="contained" onClick={() => setSelectedDocument(null)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(editingDocument)}
        onClose={() => setEditingDocument(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Edit Document</DialogTitle>
        <Divider />
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {editDocError && <Alert severity="error">{editDocError}</Alert>}
            <TextField
              label="Title"
              fullWidth
              value={editDocForm.doc_title}
              onChange={(event) =>
                setEditDocForm((current) => ({ ...current, doc_title: event.target.value }))
              }
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={editDocForm.status}
                onChange={(event) =>
                  setEditDocForm((current) => ({
                    ...current,
                    status: event.target.value as DocStatus,
                  }))
                }
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="archived">Archived</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Tags"
              fullWidth
              value={editDocForm.tags_input}
              onChange={(event) =>
                setEditDocForm((current) => ({ ...current, tags_input: event.target.value }))
              }
              helperText="Separate with commas"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingDocument(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={saveEditDocument}
            disabled={isUpdatingDocument || !editDocForm.doc_title.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={uploadDialogOpen}
        onClose={() => !isUploading && setUploadDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Upload Document</DialogTitle>
        <Divider />
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {uploadError && <Alert severity="error">{uploadError}</Alert>}

            <Box>
              <Typography variant="body2" fontWeight={600} mb={0.5}>
                Document Type
              </Typography>
              <Select
                value={uploadDocType}
                onChange={(event) => setUploadDocType(event.target.value as DocType)}
                fullWidth
                size="small"
              >
                <MenuItem value="resume">Resume</MenuItem>
                <MenuItem value="cover_letter">Cover Letter</MenuItem>
              </Select>
            </Box>

            <TextField
              label="Document Title"
              value={uploadDocTitle}
              onChange={(event) => setUploadDocTitle(event.target.value)}
              fullWidth
              size="small"
            />

            <Box>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                data-testid="file-upload-input"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <Button
                variant="outlined"
                startIcon={<UploadFileIcon />}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadFile ? uploadFile.name : 'Choose File'}
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1.5 }}>
                PDF, DOCX, or TXT &middot; max 10 MB
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleUploadSubmit}
            disabled={!uploadFile || !uploadDocTitle.trim() || isUploading}
          >
            {isUploading ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DocumentLibraryPage;
