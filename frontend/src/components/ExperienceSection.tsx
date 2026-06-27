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
  ExperienceRecord,
  ExperiencePayload,
  createExperience,
  updateExperience,
  deleteExperience,
  reorderExperiences,
} from '../api/experiences';
import { useSortableList } from '../hooks/useSortableList';

interface ExperienceSectionProps {
  experiences: ExperienceRecord[];
  accessToken: string;
  onExperiencesChange: (updated: ExperienceRecord[]) => void;
}

const emptyForm: ExperiencePayload = {
  company: '',
  title: '',
  start_date: '',
  end_date: null,
  experience_description: null,
  is_current: false,
};

interface SortableItemProps {
  exp: ExperienceRecord;
  onEdit: (exp: ExperienceRecord) => void;
  onDelete: (id: string) => void;
}

const SortableExperienceItem = ({ exp, onEdit, onDelete }: SortableItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: exp.experience_id,
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
              {exp.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {exp.company}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {exp.start_date} — {exp.is_current ? 'Present' : (exp.end_date ?? '')}
            </Typography>
            {exp.experience_description && (
              <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                {exp.experience_description}
              </Typography>
            )}
          </Box>
        </Box>
        <Box sx={{ flexShrink: 0 }}>
          <IconButton size="small" onClick={() => onEdit(exp)}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => onDelete(exp.experience_id)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
};

const ExperienceSection = ({
  experiences,
  accessToken,
  onExperiencesChange,
}: ExperienceSectionProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ExperiencePayload>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const sensors = useSensors(useSensor(PointerSensor));

  const handleReorder = async (reordered: ExperienceRecord[]) => {
    onExperiencesChange(reordered);
    try {
      await reorderExperiences(
        accessToken,
        reordered.map((e) => ({
          experience_id: e.experience_id,
          position_number: e.position_number,
        }))
      );
    } catch {
      onExperiencesChange(experiences);
    }
  };

  const { ids, activeId, handleDragStart, handleDragEnd } = useSortableList({
    items: experiences,
    idKey: 'experience_id',
    onReorder: handleReorder,
  });

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFieldErrors({});
    setSaveError('');
    setDialogOpen(true);
  };

  const openEdit = (exp: ExperienceRecord) => {
    setEditingId(exp.experience_id);
    setForm({
      company: exp.company,
      title: exp.title,
      start_date: exp.start_date,
      end_date: exp.end_date,
      experience_description: exp.experience_description,
      is_current: exp.is_current,
    });
    setFieldErrors({});
    setSaveError('');
    setDialogOpen(true);
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.company.trim()) errors.company = 'Company is required.';
    if (!form.title.trim()) errors.title = 'Title is required.';
    if (!form.start_date) errors.start_date = 'Start date is required.';
    if (!form.is_current && form.end_date && form.end_date < form.start_date) {
      errors.end_date = 'End date cannot be earlier than start date.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setSaveError('');
    try {
      const payload: ExperiencePayload = {
        ...form,
        end_date: form.is_current ? null : form.end_date || null,
      };
      if (editingId) {
        const updated = await updateExperience(accessToken, editingId, payload);
        onExperiencesChange(experiences.map((e) => (e.experience_id === editingId ? updated : e)));
      } else {
        const created = await createExperience(accessToken, payload);
        onExperiencesChange([...experiences, created]);
      }
      setDialogOpen(false);
    } catch {
      setSaveError('Failed to save experience. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (experienceId: string) => {
    try {
      await deleteExperience(accessToken, experienceId);
      onExperiencesChange(experiences.filter((e) => e.experience_id !== experienceId));
    } catch {
      // silently fail — could add error toast here
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
              Experience
            </Typography>
            <Button size="small" onClick={openAdd}>
              + Add
            </Button>
          </Box>
          <Divider sx={{ mb: 2 }} />

          {experiences.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No experience entries yet.
            </Typography>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                {experiences.map((exp, index) => (
                  <Box key={exp.experience_id}>
                    {index > 0 && <Divider sx={{ my: 2 }} />}
                    <SortableExperienceItem exp={exp} onEdit={openEdit} onDelete={handleDelete} />
                  </Box>
                ))}
              </SortableContext>
              <DragOverlay>
                {activeId
                  ? (() => {
                      const exp = experiences.find((e) => e.experience_id === activeId);
                      return exp ? (
                        <SortableExperienceItem
                          exp={exp}
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
        <DialogTitle>{editingId ? 'Edit Experience' : 'Add Experience'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {saveError && (
              <Typography color="error" variant="body2">
                {saveError}
              </Typography>
            )}
            <TextField
              label="Company"
              value={form.company}
              onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
              error={!!fieldErrors.company}
              helperText={fieldErrors.company}
              fullWidth
              required
            />
            <TextField
              label="Title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              error={!!fieldErrors.title}
              helperText={fieldErrors.title}
              fullWidth
              required
            />
            <TextField
              label="Start Date"
              type="date"
              value={form.start_date}
              onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
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
              label="I currently work here"
            />
            {!form.is_current && (
              <TextField
                label="End Date"
                type="date"
                value={form.end_date ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value || null }))}
                error={!!fieldErrors.end_date}
                helperText={fieldErrors.end_date}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            )}
            <TextField
              label="Description"
              value={form.experience_description ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, experience_description: e.target.value || null }))
              }
              fullWidth
              multiline
              rows={3}
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

export default ExperienceSection;
