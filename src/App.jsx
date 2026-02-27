import React, { useState } from 'react';
import { 
  DndContext, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, GripVertical, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const initialData = {
  columns: {
    'todo': { id: 'todo', title: 'To Do', taskIds: ['task-1', 'task-2'] },
    'in-progress': { id: 'in-progress', title: 'In Progress', taskIds: ['task-3'] },
    'done': { id: 'done', title: 'Done', taskIds: [] }
  },
  tasks: {
    'task-1': { id: 'task-1', content: 'Design simple UI' },
    'task-2': { id: 'task-2', content: 'Set up Vite project' },
    'task-3': { id: 'task-3', content: 'Implement Drag and Drop' }
  },
  columnOrder: ['todo', 'in-progress', 'done']
};

function TaskCard({ task, columnId, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white p-4 mb-3 rounded-xl shadow-sm border border-slate-200 group hover:border-blue-400 transition-colors cursor-default"
    >
      <div className="flex items-center justify-between">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600">
          <GripVertical size={18} />
        </div>
        <p className="flex-1 ml-2 text-sm font-medium text-slate-700">{task.content}</p>
        <button 
          onClick={() => onDelete(task.id, columnId)}
          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-opacity"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

function Column({ column, tasks, onAddTask, onDeleteTask }) {
  const {
    setNodeRef
  } = useSortable({ id: column.id });

  return (
    <div className="flex flex-col w-80 bg-slate-100/50 rounded-2xl p-4 border border-slate-200">
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="font-semibold text-slate-700 flex items-center gap-2">
          {column.title}
          <span className="bg-slate-200 text-slate-500 text-xs px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </h2>
        <button 
          onClick={() => onAddTask(column.id)}
          className="p-1.5 hover:bg-white rounded-lg text-slate-500 hover:text-blue-600 transition-all shadow-sm border border-transparent hover:border-slate-200"
        >
          <Plus size={18} />
        </button>
      </div>

      <div ref={setNodeRef} className="flex-1 min-h-[150px]">
        <SortableContext items={column.taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} columnId={column.id} onDelete={onDeleteTask} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(initialData);
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    setData(prev => {
      const activeItems = prev.columns[activeContainer].taskIds;
      const overItems = prev.columns[overContainer].taskIds;
      
      const activeIndex = activeItems.indexOf(activeId);
      const overIndex = overItems.indexOf(overId);

      let newIndex;
      if (overId in prev.columns) {
        newIndex = overItems.length + 1;
      } else {
        const isBelowLastItem = over && overIndex === overItems.length - 1;
        const modifier = isBelowLastItem ? 1 : 0;
        newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
      }

      return {
        ...prev,
        columns: {
          ...prev.columns,
          [activeContainer]: {
            ...prev.columns[activeContainer],
            taskIds: prev.columns[activeContainer].taskIds.filter(id => id !== activeId)
          },
          [overContainer]: {
            ...prev.columns[overContainer],
            taskIds: [
              ...prev.columns[overContainer].taskIds.slice(0, newIndex),
              activeItems[activeIndex],
              ...prev.columns[overContainer].taskIds.slice(newIndex)
            ]
          }
        }
      };
    });
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) {
      setActiveId(null);
      return;
    }

    const activeId = active.id;
    const overId = over.id;

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (activeContainer && overContainer && activeContainer === overContainer) {
      const activeIndex = data.columns[activeContainer].taskIds.indexOf(activeId);
      const overIndex = data.columns[overContainer].taskIds.indexOf(overId);

      if (activeIndex !== overIndex) {
        setData(prev => ({
          ...prev,
          columns: {
            ...prev.columns,
            [activeContainer]: {
              ...prev.columns[activeContainer],
              taskIds: arrayMove(prev.columns[activeContainer].taskIds, activeIndex, overIndex)
            }
          }
        }));
      }
    }

    setActiveId(null);
  };

  const findContainer = (id) => {
    if (id in data.columns) return id;
    return Object.keys(data.columns).find(key => data.columns[key].taskIds.includes(id));
  };

  const addTask = (columnId) => {
    const content = prompt('Enter task content:');
    if (!content) return;

    const newId = `task-${Date.now()}`;
    setData(prev => ({
      ...prev,
      tasks: {
        ...prev.tasks,
        [newId]: { id: newId, content }
      },
      columns: {
        ...prev.columns,
        [columnId]: {
          ...prev.columns[columnId],
          taskIds: [...prev.columns[columnId].taskIds, newId]
        }
      }
    }));
  };

  const deleteTask = (taskId, columnId) => {
    setData(prev => {
      const newTasks = { ...prev.tasks };
      delete newTasks[taskId];
      return {
        ...prev,
        tasks: newTasks,
        columns: {
          ...prev.columns,
          [columnId]: {
            ...prev.columns[columnId],
            taskIds: prev.columns[columnId].taskIds.filter(id => id !== taskId)
          }
        }
      };
    });
  };

  return (
    <div className="min-h-screen p-8 bg-background">
      <header className="max-w-7xl mx-auto mb-10 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Claw Kanban</h1>
          <p className="text-slate-500 mt-1">Professional task management</p>
        </div>
        <div className="flex -space-x-2">
          <div className="w-10 h-10 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-white font-bold">A</div>
          <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-white flex items-center justify-center text-white font-bold text-xs">C</div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto flex gap-6 items-start overflow-x-auto pb-8">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {data.columnOrder.map(columnId => {
            const column = data.columns[columnId];
            const tasks = column.taskIds.map(taskId => data.tasks[taskId]);

            return (
              <Column 
                key={columnId} 
                column={column} 
                tasks={tasks} 
                onAddTask={addTask} 
                onDeleteTask={deleteTask}
              />
            );
          })}
          
          <DragOverlay dropAnimation={{
            sideEffects: defaultDropAnimationSideEffects({
              styles: {
                active: {
                  opacity: '0.5',
                },
              },
            }),
          }}>
            {activeId ? (
              <div className="bg-white p-4 rounded-xl shadow-xl border-2 border-blue-400 scale-105 cursor-grabbing">
                <p className="text-sm font-medium text-slate-700">{data.tasks[activeId]?.content}</p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>
    </div>
  );
}