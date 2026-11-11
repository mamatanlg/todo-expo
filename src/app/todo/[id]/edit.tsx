import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { TodoForm } from '@/components/TodoForm';
import { useTodos } from '@/todos';

export default function EditTodoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getTodo, updateTodo } = useTodos();
  const todo = getTodo(id);

  if (!todo) return <Text style={styles.missing}>Todo not found.</Text>;

  return (
    <TodoForm
      initial={todo}
      submitLabel="Save changes"
      onSubmit={async (input) => {
        await updateTodo(todo.id, input);
        router.back();
      }}
    />
  );
}

const styles = StyleSheet.create({
  missing: { padding: 24, textAlign: 'center', color: '#64748b' },
});
