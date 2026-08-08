import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { useAllTodosQuery, useUpdateTodo } from '../hooks/useTodos';
import { useCategoriesQuery } from '../hooks/useCategories';
import { Badge } from '../components/ui/Badge';
import { TodoSkeleton } from '../components/ui/Skeleton';

const COLUMNS = [
  { id: 'todo', title: 'To Do', accent: 'border-t-gray-400' },
  { id: 'in-progress', title: 'In Progress', accent: 'border-t-blue-500' },
  { id: 'done', title: 'Done', accent: 'border-t-green-500' },
];

const priorityVariant = { high: 'red', medium: 'yellow', low: 'green' };

function KanbanCard({ todo, overlay = false, categoryMap = {} }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: todo._id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: overlay ? 1 : isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 cursor-grab active:cursor-grabbing ${
        overlay ? 'shadow-lg rotate-2' : ''
      }`}
    >
      <p className={`font-medium text-sm break-words ${todo.isCompleted ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-100'}`}>
        {todo.title}
      </p>
      {todo.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-words line-clamp-2">
          {todo.description}
        </p>
      )}
      <div className="flex flex-wrap gap-1.5 mt-2">
        <Badge variant={priorityVariant[todo.priority] || 'blue'}>{todo.priority}</Badge>
        {todo.dueDate && (
          <Badge variant="gray">Due {todo.dueDate.slice(0, 10)}</Badge>
        )}
        {(todo.tags || []).slice(0, 2).map((tag) => (
          <Badge key={tag} variant="purple">#{tag}</Badge>
        ))}
        {todo.category && categoryMap[todo.category] && (
          <span
            className="inline-block text-xs px-2 py-0.5 rounded-full font-medium text-white"
            style={{ backgroundColor: categoryMap[todo.category].color }}
          >
            {categoryMap[todo.category].name}
          </span>
        )}
      </div>
    </div>
  );
}

function KanbanColumn({ column, todos, categoryMap }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div className={`flex-1 min-w-[260px] bg-gray-100 dark:bg-gray-900/50 rounded-lg p-3 flex flex-col border-t-4 ${column.accent} transition-colors ${isOver ? 'ring-2 ring-blue-400' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-200">{column.title}</h3>
        <span className="text-xs font-medium text-gray-500 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
          {todos.length}
        </span>
      </div>
      <div ref={setNodeRef} className="flex flex-col gap-2 flex-1 min-h-[100px]">
        {todos.map((todo) => (
          <KanbanCard key={todo._id} todo={todo} categoryMap={categoryMap} />
        ))}
        {todos.length === 0 && (
          <div className="text-center text-xs text-gray-400 py-8 border border-dashed border-gray-300 dark:border-gray-700 rounded-md">
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  );
}

export default function KanbanPage() {
  const { data: todos, isLoading } = useAllTodosQuery();
  const { data: categories = [] } = useCategoriesQuery();
  const updateTodo = useUpdateTodo();
  const [activeId, setActiveId] = useState(null);

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c._id, c])),
    [categories]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  // Group todos by status
  const grouped = useMemo(() => {
    const groups = { todo: [], 'in-progress': [], done: [] };
    (todos || []).forEach((t) => {
      const key = t.status || (t.isCompleted ? 'done' : 'todo');
      if (groups[key]) groups[key].push(t);
    });
    return groups;
  }, [todos]);

  const activeTodo = useMemo(
    () => (todos || []).find((t) => t._id === activeId) || null,
    [todos, activeId]
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    // `over.id` can be a column id or another card id
    const targetColumn = COLUMNS.some((c) => c.id === over.id)
      ? over.id
      : (todos || []).find((t) => t._id === over.id)?.status;

    if (!targetColumn) return;

    const draggedTodo = (todos || []).find((t) => t._id === active.id);
    if (!draggedTodo || draggedTodo.status === targetColumn) return;

    updateTodo.mutate(
      { id: active.id, patch: { status: targetColumn } },
      {
        onError: (err) => toast.error(err.message || 'Failed to move task'),
      }
    );
  };

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight mb-6">Board</h1>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => (
            <div key={col.id} className="flex-1 min-w-[260px] space-y-2">
              <TodoSkeleton />
              <TodoSkeleton />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Board</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Drag tasks between columns to update their status
        </p>
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={(e) => setActiveId(e.active.id)}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((column) => (
            <KanbanColumn key={column.id} column={column} todos={grouped[column.id] || []} categoryMap={categoryMap} />
          ))}
        </div>
        <DragOverlay>
          {activeTodo ? <KanbanCard todo={activeTodo} overlay categoryMap={categoryMap} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
