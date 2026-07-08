import { useEffect, useState } from 'react';
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
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { supabase } from '../utils/supabaseClient';
import { DocumentRecord, listDocuments } from '../api/jobs';

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

const DocumentLibraryPage = () => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<DocumentRecord | null>(null);

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

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', px: 3, py: 5 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" fontWeight={700} mb={1}>
          Document Library
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View your saved resumes and cover letters in one place.
        </Typography>
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
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Version {document.doc_version} &middot; Created{' '}
                  {formatCreatedAt(document.created_at)}
                </Typography>
              </Box>
              <Button variant="outlined" onClick={() => setSelectedDocument(document)}>
                View
              </Button>
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
    </Box>
  );
};

export default DocumentLibraryPage;
