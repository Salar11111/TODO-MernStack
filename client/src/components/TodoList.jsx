import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableTodoItem, TodoItemContent } from './TodoItem';
import { EmptyState } from './ui/EmptyState';

const listVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.04 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

function AnimatedTodoItem({ todo, selectedIds, onToggleSelect }) {
  return (
    <motion.li key={todo._id} variants={itemVariants} layout className="contents">
      <TodoItemContent
        todo={todo}
        selected={selectedIds?.has(todo._id)}
        onToggleSelect={onToggleSelect}
      />
    </motion.li>
  );
}

function PlainList({ todos, selectedIds, onToggleSelect }) {
  if (todos.length === 0) {
    return (
      <EmptyState
        filterActive={false}
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
        title="No tasks yet"
        description="Start by adding your first task above. You can add subtasks, tags, due dates, and more."
      />
    );
  }
  return (
    <motion.ul
      className="space-y-3"
      variants={listVariants}
      initial="hidden"
      animate="show"
      role="list"
      aria-label="Task list"
    >
      <AnimatePresence>
        {todos.map((todo) => (
          <AnimatedTodoItem key={todo._id} todo={todo} selectedIds={selectedIds} onToggleSelect={onToggleSelect} />
        ))}
      </AnimatePresence>
    </motion.ul>
  );
}

function SortableList({ todos, onReorder, selectedIds, onToggleSelect }) {
  const [items, setItems] = useState(() => todos.map((t) => t._id));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.indexOf(active.id);
    const newIndex = items.indexOf(over.id);
    const next = arrayMove(items, oldIndex, newIndex);

    setItems(next);
    onReorder?.(next);
  };

  const orderedTodos = items
    .map((id) => todos.find((t) => t._id === id))
    .filter(Boolean);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <motion.ul
          className="space-y-3"
          variants={listVariants}
          initial="hidden"
          animate="show"
          role="list"
          aria-label="Task list"
        >
          <AnimatePresence>
            {orderedTodos.map((todo) => (
              <SortableTodoItem
                key={todo._id}
                todo={todo}
                selected={selectedIds?.has(todo._id)}
                onToggleSelect={onToggleSelect}
              />
            ))}
          </AnimatePresence>
        </motion.ul>
      </SortableContext>
    </DndContext>
  );
}

export default function TodoList({
  todos,
  filterActive = false,
  sortable = false,
  onReorder,
  selectedIds,
  onToggleSelect,
}) {
  if (!sortable || todos.length === 0) {
    if (todos.length === 0) {
      return (
        <EmptyState
          filterActive={filterActive}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          }
          title={filterActive ? 'No matching tasks' : 'No tasks yet'}
          description={filterActive ? 'Try adjusting your filters or search terms.' : 'Start by adding your first task above.'}
        />
      );
    }
    return <PlainList todos={todos} selectedIds={selectedIds} onToggleSelect={onToggleSelect} />;
  }

  const syncKey = todos.map((t) => t._id).join('|');
  return (
    <SortableList
      key={syncKey}
      todos={todos}
      onReorder={onReorder}
      selectedIds={selectedIds}
      onToggleSelect={onToggleSelect}
    />
  );
}
