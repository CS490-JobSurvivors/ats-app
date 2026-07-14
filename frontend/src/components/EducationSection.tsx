import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EditIcon from '@mui/icons-material/Edit';
import {
  EducationRecord,
  EducationPayload,
  createEducation,
  updateEducation,
  deleteEducation,
  reorderEducation,
} from '../api/education';
import { useSortableList } from '../hooks/useSortableList';

interface EducationSectionProps {
  educations: EducationRecord[];
  accessToken: string;
  onEducationsChange: (updated: EducationRecord[]) => void;
}

const emptyForm: EducationPayload = {
  institution_name: '',
  degree: '',
  major: '',
  start_date: '',
  end_date: null,
  GPA: null,
  is_current: false,
};

interface SortableItemProps {
  edu: EducationRecord;
  onEdit: (edu: EducationRecord) => void;
  onDelete: (id: string) => void;
}

const SortableEducationItem = ({ edu, onEdit, onDelete }: SortableItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: edu.education_id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Box ref={setNodeRef} style={style}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, flex: 1, minWidth: 0 }}>
          <IconButton
            size="small"
            {...attributes}
            {...listeners}
            sx={{ cursor: 'grab', mt: 0.5, color: 'text.secondary', flexShrink: 0 }}
          >
            <DragIndicatorIcon fontSize="small" />
          </IconButton>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              {edu.institution_name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {edu.degree} in {edu.major}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {edu.start_date} — {edu.is_current ? 'Present' : (edu.end_date ?? '')}
            </Typography>
            {edu.GPA != null && (
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                GPA: {edu.GPA}
              </Typography>
            )}
          </Box>
        </Box>
        <Box sx={{ flexShrink: 0 }}>
          <IconButton size="small" aria-label="edit education" onClick={() => onEdit(edu)}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            aria-label="delete education"
            onClick={() => onDelete(edu.education_id)}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
};

const EducationSection = ({
  educations,
  accessToken,
  onEducationsChange,
}: EducationSectionProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EducationPayload>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const sensors = useSensors(useSensor(PointerSensor));

  const handleReorder = async (reordered: EducationRecord[]) => {
    onEducationsChange(reordered);
    try {
      await reorderEducation(
        accessToken,
        reordered.map((e) => ({
          education_id: e.education_id,
          position_number: e.position_number,
        }))
      );
    } catch {
      onEducationsChange(educations);
    }
  };

  const { ids, activeId, handleDragStart, handleDragEnd } = useSortableList({
    items: educations,
    idKey: 'education_id',
    onReorder: handleReorder,
  });

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFieldErrors({});
    setSaveError('');
    setDialogOpen(true);
  };

  const openEdit = (edu: EducationRecord) => {
    setEditingId(edu.education_id);
    setForm({
      institution_name: edu.institution_name,
      degree: edu.degree,
      major: edu.major,
      start_date: edu.start_date,
      end_date: edu.end_date,
      GPA: edu.GPA,
      is_current: edu.is_current,
    });
    setFieldErrors({});
    setSaveError('');
    setDialogOpen(true);
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.institution_name.trim()) errors.institution_name = 'Institution name is required.';
    if (!form.degree.trim()) errors.degree = 'Degree is required.';
    if (!form.major.trim()) errors.major = 'Major is required.';
    if (!form.start_date) errors.start_date = 'Start date is required.';
    if (!form.is_current && form.end_date && form.end_date < form.start_date) {
      errors.end_date = 'End date cannot be earlier than start date.';
    }
    if (form.GPA != null && form.GPA < 0) errors.GPA = 'GPA cannot be negative.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setSaveError('');
    try {
      const payload: EducationPayload = {
        ...form,
        end_date: form.is_current ? null : form.end_date || null,
      };
      if (editingId) {
        const updated = await updateEducation(accessToken, editingId, payload);
        onEducationsChange(educations.map((e) => (e.education_id === editingId ? updated : e)));
      } else {
        const created = await createEducation(accessToken, payload);
        onEducationsChange([...educations, created]);
      }
      setDialogOpen(false);
    } catch {
      setSaveError('Failed to save education record. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (educationId: string) => {
    setDeleteError('');
    try {
      await deleteEducation(accessToken, educationId);
      onEducationsChange(educations.filter((e) => e.education_id !== educationId));
    } catch {
      setDeleteError('Failed to delete education record. Please try again.');
    }
  };

  return (
    <>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
          >
            <Typography variant="h6" fontWeight={600}>
              Education
            </Typography>
            <Button size="small" onClick={openAdd}>
              + Add
            </Button>
          </Box>
          <Divider sx={{ mb: 2 }} />

          {deleteError && (
            <Alert severity="error" sx={{ mb: 1 }}>
              {deleteError}
            </Alert>
          )}

          {educations.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No education entries yet.
            </Typography>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                {educations.map((edu, index) => (
                  <Box key={edu.education_id}>
                    {index > 0 && <Divider sx={{ my: 2 }} />}
                    <SortableEducationItem edu={edu} onEdit={openEdit} onDelete={handleDelete} />
                  </Box>
                ))}
              </SortableContext>
              <DragOverlay>
                {activeId
                  ? (() => {
                      const edu = educations.find((e) => e.education_id === activeId);
                      return edu ? (
                        <SortableEducationItem
                          edu={edu}
                          onEdit={openEdit}
                          onDelete={handleDelete}
                        />
                      ) : null;
                    })()
                  : null}
              </DragOverlay>
            </DndContext>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingId ? 'Edit Education' : 'Add Education'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {saveError && <Alert severity="error">{saveError}</Alert>}
            <TextField
              label="Institution Name"
              value={form.institution_name}
              onChange={(e) => {
                setForm((f) => ({ ...f, institution_name: e.target.value }));
                if (fieldErrors.institution_name)
                  setFieldErrors((errs) => ({ ...errs, institution_name: '' }));
              }}
              error={!!fieldErrors.institution_name}
              helperText={fieldErrors.institution_name}
              fullWidth
              required
              inputProps={{ maxLength: 150 }}
            />
            <TextField
              label="Degree"
              value={form.degree}
              onChange={(e) => {
                setForm((f) => ({ ...f, degree: e.target.value }));
                if (fieldErrors.degree) setFieldErrors((errs) => ({ ...errs, degree: '' }));
              }}
              error={!!fieldErrors.degree}
              helperText={fieldErrors.degree}
              fullWidth
              required
              inputProps={{ maxLength: 100 }}
            />
            <TextField
              label="Major"
              value={form.major}
              onChange={(e) => {
                setForm((f) => ({ ...f, major: e.target.value }));
                if (fieldErrors.major) setFieldErrors((errs) => ({ ...errs, major: '' }));
              }}
              error={!!fieldErrors.major}
              helperText={fieldErrors.major}
              fullWidth
              required
              inputProps={{ maxLength: 100 }}
            />
            <TextField
              label="Start Date"
              type="date"
              value={form.start_date}
              onChange={(e) => {
                const val = e.target.value;
                setForm((f) => ({ ...f, start_date: val }));
                setFieldErrors((errs) => ({
                  ...errs,
                  start_date: val ? '' : errs.start_date,
                  end_date:
                    !form.is_current && form.end_date && form.end_date >= val ? '' : errs.end_date,
                }));
              }}
              error={!!fieldErrors.start_date}
              helperText={fieldErrors.start_date}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.is_current}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, is_current: e.target.checked, end_date: null }))
                  }
                />
              }
              label="I currently study here"
            />
            {!form.is_current && (
              <TextField
                label="End Date"
                type="date"
                value={form.end_date ?? ''}
                onChange={(e) => {
                  const val = e.target.value || null;
                  setForm((f) => ({ ...f, end_date: val }));
                  if (fieldErrors.end_date) {
                    const isValid = !val || !form.start_date || val >= form.start_date;
                    if (isValid) setFieldErrors((errs) => ({ ...errs, end_date: '' }));
                  }
                }}
                error={!!fieldErrors.end_date}
                helperText={fieldErrors.end_date}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            )}
            <TextField
              label="GPA (optional)"
              type="number"
              value={form.GPA ?? ''}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setFieldErrors((errs) => ({
                  ...errs,
                  GPA: !isNaN(val) && val < 0 ? 'GPA cannot be negative.' : '',
                }));
                setForm((f) => ({
                  ...f,
                  GPA: e.target.value === '' ? null : isNaN(val) ? null : val,
                }));
              }}
              fullWidth
              inputProps={{ min: 0, max: 4, step: 0.01 }}
              error={!!fieldErrors.GPA}
              helperText={fieldErrors.GPA}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EducationSection;
