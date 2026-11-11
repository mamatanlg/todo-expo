import { createContext, use, useEffect, useRef, useState, type PropsWithChildren } from 'react';

import { useAuth } from '@/auth';
import { supabase } from '../utils/supabase';

export const STATUSES = ['todo', 'in_progress', 'done'] as const;
export type TodoStatus = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<TodoStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
};

export const STATUS_COLORS: Record<TodoStatus, string> = {
  todo: '#64748b',
  in_progress: '#d97706',
  done: '#16a34a',
};

export type Todo = {
  id: number;
  title: string;
  description: string;
  status: TodoStatus;
  createdAt: number;
};

export type TodoInput = Pick<Todo, 'title' | 'description' | 'status'>;

type TodoRow = {
  id: number;
  created_at: string;
  title: string | null;
  description: string | null;
  status: string | null;
};

function isTodoStatus(status: string): status is TodoStatus {
  return STATUSES.some((knownStatus) => knownStatus === status);
}

type TodoContextValue = {
  todos: Todo[];
  isLoading: boolean;
  error: string | null;
  getTodo: (id: string) => Todo | undefined;
  createTodo: (input: TodoInput) => Promise<Todo>;
  updateTodo: (id: number, patch: Partial<TodoInput>) => Promise<void>;
  deleteTodo: (id: number) => Promise<void>;
};

const TodoContext = createContext<TodoContextValue | null>(null);

function toTodo(row: TodoRow): Todo {
  const status = row.status ?? 'todo';
  if (!isTodoStatus(status)) {
    throw new Error(`Unsupported todo status "${row.status}" in Supabase.`);
  }

  return {
    id: row.id,
    title: row.title ?? '',
    description: row.description ?? '',
    status,
    createdAt: Date.parse(row.created_at),
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unable to load todos from Supabase.';
}

export function TodoProvider({ children }: PropsWithChildren) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const userId = user?.id ?? null;
  const [loadedData, setLoadedData] = useState<{
    userId: string;
    todos: Todo[];
    error: string | null;
  } | null>(null);
  const loadRequestId = useRef(0);

  useEffect(() => {
    if (isAuthLoading || !userId) return;

    const requestId = ++loadRequestId.current;
    const loadTodos = async () => {
      try {
        const { data, error: queryError } = await supabase
          .from('todo-opxe')
          .select('id, created_at, title, description, status')
          .eq('author', userId)
          .order('created_at', { ascending: false });
        if (queryError) throw queryError;
        const loadedTodos = data.map(toTodo);
        if (requestId === loadRequestId.current) {
          setLoadedData({ userId, todos: loadedTodos, error: null });
        }
      } catch (loadError: unknown) {
        if (requestId === loadRequestId.current) {
          setLoadedData({ userId, todos: [], error: getErrorMessage(loadError) });
        }
      }
    };

    void loadTodos();

    return () => {
      loadRequestId.current += 1;
    };
  }, [isAuthLoading, userId]);

  const currentData = userId && loadedData?.userId === userId ? loadedData : null;
  const todos = currentData?.todos ?? [];
  const error = currentData?.error ?? null;
  const isLoading = isAuthLoading || (userId !== null && currentData === null);

  const getTodo = (id: string) => {
    const numericId = Number(id);
    if (!Number.isSafeInteger(numericId)) return undefined;
    return todos.find((todo) => todo.id === numericId);
  };

  const createTodo = async (input: TodoInput) => {
    if (!userId) throw new Error('Sign in before creating a todo.');

    const { data, error: insertError } = await supabase
      .from('todo-opxe')
      .insert({
        title: input.title,
        description: input.description,
        status: input.status,
        author: userId,
      })
      .select('id, created_at, title, description, status')
      .single();

    if (insertError) throw insertError;
    const todo = toTodo(data);
    setLoadedData((previous) =>
      previous?.userId === userId
        ? { ...previous, todos: [todo, ...previous.todos] }
        : previous,
    );
    return todo;
  };

  const updateTodo = async (id: number, patch: Partial<TodoInput>) => {
    if (!userId) throw new Error('Sign in before updating a todo.');

    const { data, error: updateError } = await supabase
      .from('todo-opxe')
      .update(patch)
      .eq('id', id)
      .eq('author', userId)
      .select('id, created_at, title, description, status')
      .single();

    if (updateError) throw updateError;
    const updatedTodo = toTodo(data);
    setLoadedData((previous) =>
      previous?.userId === userId
        ? {
            ...previous,
            todos: previous.todos.map((todo) => (todo.id === id ? updatedTodo : todo)),
          }
        : previous,
    );
  };

  const deleteTodo = async (id: number) => {
    if (!userId) throw new Error('Sign in before deleting a todo.');

    const { error: deleteError } = await supabase
      .from('todo-opxe')
      .delete()
      .eq('id', id)
      .eq('author', userId);

    if (deleteError) throw deleteError;
    setLoadedData((previous) =>
      previous?.userId === userId
        ? { ...previous, todos: previous.todos.filter((todo) => todo.id !== id) }
        : previous,
    );
  };

  return (
    <TodoContext
      value={{ todos, isLoading, error, getTodo, createTodo, updateTodo, deleteTodo }}
    >
      {children}
    </TodoContext>
  );
}

export function useTodos() {
  const ctx = use(TodoContext);
  if (!ctx) throw new Error('useTodos must be used inside <TodoProvider>');
  return ctx;
}
