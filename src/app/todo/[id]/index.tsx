import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { StatusBadge, StatusPicker } from '@/components/status';
import { confirmDestructive, showOperationError } from '@/confirm';
import { useTodos } from '@/todos';

export default function TodoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getTodo, updateTodo, deleteTodo } = useTodos();
  const todo = getTodo(id);

  if (!todo) return <Text style={styles.missing}>Todo not found.</Text>;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: todo.title }} />

      <View style={styles.card}>
        <StatusBadge status={todo.status} />
        <Text style={styles.title}>{todo.title}</Text>
        <Text style={todo.description ? styles.description : styles.placeholder}>
          {todo.description || 'No description'}
        </Text>
        <Text style={styles.meta}>Created {new Date(todo.createdAt).toLocaleString()}</Text>
      </View>

      <Text style={styles.label}>Status</Text>
      <StatusPicker
        value={todo.status}
        onChange={(status) => {
          void updateTodo(todo.id, { status }).catch((error: unknown) =>
            showOperationError('Unable to update todo', error),
          );
        }}
      />

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push({ pathname: '/todo/[id]/edit', params: { id: String(todo.id) } })
          }
          style={[styles.button, styles.edit]}
        >
          <Text style={styles.buttonText}>Edit</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            confirmDestructive('Delete todo?', todo.title, () => {
              void deleteTodo(todo.id)
                .then(() => router.back())
                .catch((error: unknown) =>
                  showOperationError('Unable to delete todo', error),
                );
            })
          }
          style={[styles.button, styles.delete]}
        >
          <Text style={styles.buttonText}>Delete</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  missing: { padding: 24, textAlign: 'center', color: '#64748b' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 8 },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  description: { fontSize: 16, color: '#334155' },
  placeholder: { fontSize: 16, color: '#94a3b8', fontStyle: 'italic' },
  meta: { fontSize: 12, color: '#94a3b8' },
  label: { fontWeight: '600', color: '#334155', marginTop: 8 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  button: { flex: 1, borderRadius: 8, padding: 14, alignItems: 'center' },
  edit: { backgroundColor: '#2563eb' },
  delete: { backgroundColor: '#dc2626' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
