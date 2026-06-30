import { useState } from 'react';
import { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

interface SortableItem {
  position_number: number;
}

interface UseSortableListOptions<T extends SortableItem> {
  items: T[];
  idKey: keyof T;
  onReorder: (reordered: T[]) => void;
}

export function useSortableList<T extends SortableItem>({
  items,
  idKey,
  onReorder,
}: UseSortableListOptions<T>) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const ids = items.map((item) => String(item[idKey]));

  const handleDragStart = (event: { active: { id: string | number } }) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((item) => String(item[idKey]) === String(active.id));
    const newIndex = items.findIndex((item) => String(item[idKey]) === String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
      ...item,
      position_number: index,
    }));

    onReorder(reordered);
  };

  return { ids, activeId, handleDragStart, handleDragEnd };
}
