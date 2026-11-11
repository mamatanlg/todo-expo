import { router } from 'expo-router';

import { TodoForm } from '@/components/TodoForm';
import { useTodos } from '@/todos';

export default function NewTodoScreen() {
  const { createTodo } = useTodos();

  return (
    <TodoForm
      submitLabel="Create todo"
      onSubmit={async (input) => {
        await createTodo(input);
        router.back();
      }}
    />
  );
}
