import { useEffect, useRef, useState } from 'react';
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
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { supabase } from '../utils/supabaseClient';
import {
  DocumentRecord,
  DocType,
  getDocumentDownloadUrl,
  listDocuments,
  uploadDocument,
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

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt'];

const DocumentLibraryPage = () => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<DocumentRecord | null>(null);

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDocType, setUploadDocType] = useState<DocType>('resume');
  const [uploadDocTitle, setUploadDocTitle] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const loadDocuments = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) throw new Error('No active session.');

        const result = await listDocuments(token);
        setDocuments(result);
      } catch {
        setErrorMessage('Unable to load your document library. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadDocuments();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setUploadError(`Unsupported file type. Allowed: PDF, DOCX, TXT.`);
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
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('No active session.');

      const newDoc = await uploadDocument(token, uploadFile, uploadDocType, uploadDocTitle.trim());
      setDocuments((prev) => [newDoc, ...prev]);
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
    setDownloadingId(doc.document_id);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('No active session.');

      const url = await getDocumentDownloadUrl(token, doc.document_id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      // silently fail — user can retry
    } finally {
      setDownloadingId(null);
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

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress aria-label="Loading documents" />
        </Box>
      ) : documents.length === 0 ? (
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
            No documents saved yet.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Saved resumes and cover letters will appear here.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {documents.map((document) => (
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
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}
                >
                  <Typography variant="h6" fontWeight={700}>
                    {document.doc_title}
                  </Typography>
                  <Chip size="small" label={documentTypeLabel(document.doc_type)} />
                  {document.file_path && (
                    <Chip size="small" label="Uploaded File" color="primary" variant="outlined" />
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Version {document.doc_version} &middot; Created{' '}
                  {formatCreatedAt(document.created_at)}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
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
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setSelectedDocument(document)}
                  >
                    View
                  </Button>
                )}
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      {/* View text content dialog */}
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
          </Typography>
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigator.clipboard.writeText(selectedDocument?.content ?? '')}>
            Copy
          </Button>
          <Button variant="contained" onClick={() => setSelectedDocument(null)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Upload dialog */}
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
                onChange={(e) => setUploadDocType(e.target.value as DocType)}
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
              onChange={(e) => setUploadDocTitle(e.target.value)}
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
