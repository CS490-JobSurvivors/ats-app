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
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EditIcon from '@mui/icons-material/Edit';
import {
  SkillRecord,
  SkillPayload,
  createSkill,
  updateSkill,
  deleteSkill,
  reorderSkills,
} from '../api/skills';
import { useSortableList } from '../hooks/useSortableList';

const PROFICIENCY_OPTIONS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

interface SkillsSectionProps {
  skills: SkillRecord[];
  accessToken: string;
  onSkillsChange: (updated: SkillRecord[]) => void;
}

const emptyForm: SkillPayload = {
  skill_name: '',
  category: null,
  proficiency: null,
};

interface SortableSkillItemProps {
  skill: SkillRecord;
  onEdit: (skill: SkillRecord) => void;
  onDelete: (id: string) => void;
}

const SortableSkillItem = ({ skill, onEdit, onDelete }: SortableSkillItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: skill.skill_id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Box ref={setNodeRef} style={style}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
          <IconButton
            size="small"
            {...attributes}
            {...listeners}
            sx={{ cursor: 'grab', color: 'text.secondary', flexShrink: 0 }}
          >
            <DragIndicatorIcon fontSize="small" />
          </IconButton>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={600}>
              {skill.skill_name}
            </Typography>
            {(skill.category || skill.proficiency) && (
              <Box sx={{ display: 'flex', gap: 0.5, mt: 0.25, flexWrap: 'wrap' }}>
                {skill.category && <Chip label={skill.category} size="small" variant="outlined" />}
                {skill.proficiency && (
                  <Chip label={skill.proficiency} size="small" variant="outlined" />
                )}
              </Box>
            )}
          </Box>
        </Box>
        <Box sx={{ flexShrink: 0 }}>
          <IconButton size="small" aria-label="edit skill" onClick={() => onEdit(skill)}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            aria-label="delete skill"
            onClick={() => onDelete(skill.skill_id)}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
};

const SkillsSection = ({ skills, accessToken, onSkillsChange }: SkillsSectionProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SkillPayload>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const sensors = useSensors(useSensor(PointerSensor));

  const handleReorder = async (reordered: SkillRecord[]) => {
    onSkillsChange(reordered);
    try {
      await reorderSkills(
        accessToken,
        reordered.map((s) => ({ skill_id: s.skill_id, position_number: s.position_number }))
      );
    } catch {
      onSkillsChange(skills);
    }
  };

  const { ids, activeId, handleDragStart, handleDragEnd } = useSortableList({
    items: skills,
    idKey: 'skill_id',
    onReorder: handleReorder,
  });

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFieldErrors({});
    setSaveError('');
    setDialogOpen(true);
  };

  const openEdit = (skill: SkillRecord) => {
    setEditingId(skill.skill_id);
    setForm({
      skill_name: skill.skill_name,
      category: skill.category,
      proficiency: skill.proficiency,
    });
    setFieldErrors({});
    setSaveError('');
    setDialogOpen(true);
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.skill_name.trim()) errors.skill_name = 'Skill name is required.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setSaveError('');
    setFieldErrors({});
    try {
      if (editingId) {
        const updated = await updateSkill(accessToken, editingId, form);
        onSkillsChange(skills.map((s) => (s.skill_id === editingId ? updated : s)));
      } else {
        const created = await createSkill(accessToken, form);
        onSkillsChange([...skills, created]);
      }
      setDialogOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save skill.';
      if (message.includes('already exists')) {
        setFieldErrors({ skill_name: 'A skill with this name already exists.' });
      } else {
        setSaveError(message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (skillId: string) => {
    setDeleteError('');
    try {
      await deleteSkill(accessToken, skillId);
      onSkillsChange(skills.filter((s) => s.skill_id !== skillId));
    } catch {
      setDeleteError('Failed to delete skill. Please try again.');
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
              Skills
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

          {skills.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No skills added yet.
            </Typography>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                {skills.map((skill, index) => (
                  <Box key={skill.skill_id}>
                    {index > 0 && <Divider sx={{ my: 1.5 }} />}
                    <SortableSkillItem skill={skill} onEdit={openEdit} onDelete={handleDelete} />
                  </Box>
                ))}
              </SortableContext>
              <DragOverlay>
                {activeId
                  ? (() => {
                      const skill = skills.find((s) => s.skill_id === activeId);
                      return skill ? (
                        <SortableSkillItem
                          skill={skill}
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
        <DialogTitle>{editingId ? 'Edit Skill' : 'Add Skill'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {saveError && <Alert severity="error">{saveError}</Alert>}
            <TextField
              label="Skill Name"
              value={form.skill_name}
              onChange={(e) => {
                setForm((f) => ({ ...f, skill_name: e.target.value }));
                if (fieldErrors.skill_name) setFieldErrors((errs) => ({ ...errs, skill_name: '' }));
              }}
              error={!!fieldErrors.skill_name}
              helperText={fieldErrors.skill_name}
              fullWidth
              required
              inputProps={{ maxLength: 100 }}
            />
            <TextField
              label="Category"
              value={form.category ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value || null }))}
              fullWidth
              placeholder="e.g. Programming, Design, Tools"
              inputProps={{ maxLength: 100 }}
            />
            <FormControl fullWidth>
              <InputLabel>Proficiency</InputLabel>
              <Select
                value={form.proficiency ?? ''}
                label="Proficiency"
                onChange={(e) => setForm((f) => ({ ...f, proficiency: e.target.value || null }))}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {PROFICIENCY_OPTIONS.map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
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

export default SkillsSection;
