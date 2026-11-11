import { Stack, router } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth';
import { StatusBadge, StatusPicker } from '@/components/status';
import { confirmDestructive, showOperationError } from '@/confirm';
import { STATUSES, STATUS_LABELS, useTodos, type TodoStatus } from '@/todos';

export default function TodoListScreen() {
  const { user, signOut } = useAuth();
  const { todos, error, updateTodo, deleteTodo } = useTodos();
  const [filter, setFilter] = useState<TodoStatus | null>(null);

  const visible = filter ? todos.filter((t) => t.status === filter) : todos;
  const displayName =
    typeof user?.user_metadata.full_name === 'string'
      ? user.user_metadata.full_name
      : user?.email?.split('@')[0] ?? 'there';

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void signOut().catch((error: unknown) => {
                  const message = error instanceof Error ? error.message : 'Please try again.';
                  Alert.alert('Sign out failed', message);
                });
              }}
              hitSlop={8}
            >
              <Text style={styles.headerAction}>Log out</Text>
            </Pressable>
          ),
        }}
      />

      <View style={styles.toolbar}>
        <Text style={styles.greeting}>Hi, {displayName}</Text>
        <StatusPicker
          value={filter}
          onChange={(s) => setFilter((current) => (current === s ? null : s))}
        />
      </View>

      <FlatList
        data={visible}
        keyExtractor={(t) => String(t.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          error ? <Text style={styles.loadError}>{`Unable to load todos: ${error}`}</Text> : undefined
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            {filter ? 'No todos with this status.' : 'No todos yet. Tap + to add one.'}
          </Text>
        }
        renderItem={({ item }) => {
          const next = STATUSES[(STATUSES.indexOf(item.status) + 1) % STATUSES.length];
          return (
            <Pressable
              style={styles.item}
              onPress={() =>
                router.push({ pathname: '/todo/[id]', params: { id: String(item.id) } })
              }
            >
              <View style={styles.itemBody}>
                <Text
                  style={[styles.itemTitle, item.status === 'done' && styles.itemDone]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                {item.description ? (
                  <Text style={styles.itemDescription} numberOfLines={1}>
                    {item.description}
                  </Text>
                ) : null}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Change status to ${STATUS_LABELS[next]}`}
                onPress={() => {
                  void updateTodo(item.id, { status: next }).catch((error: unknown) =>
                    showOperationError('Unable to update todo', error),
                  );
                }}
                hitSlop={6}
              >
                <StatusBadge status={item.status} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete todo"
                onPress={() => {
                  confirmDestructive('Delete todo?', item.title, () => {
                    void deleteTodo(item.id).catch((error: unknown) =>
                      showOperationError('Unable to delete todo', error),
                    );
                  });
                }}
                hitSlop={6}
              >
                <Text style={styles.delete}>✕</Text>
              </Pressable>
            </Pressable>
          );
        }}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add todo"
        onPress={() => router.push('/todo/new')}
        style={styles.fab}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerAction: { color: '#2563eb', fontWeight: '600', paddingHorizontal: 8 },
  toolbar: { padding: 16, gap: 12 },
  greeting: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  list: { paddingHorizontal: 16, paddingBottom: 96, gap: 8 },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 48 },
  loadError: { color: '#dc2626', marginVertical: 8 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
  },
  itemBody: { flex: 1, gap: 2 },
  itemTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  itemDone: { textDecorationLine: 'line-through', color: '#94a3b8' },
  itemDescription: { color: '#64748b' },
  delete: { color: '#dc2626', fontSize: 16, fontWeight: '700', paddingHorizontal: 4 },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  fabText: { color: '#fff', fontSize: 30, lineHeight: 32 },
});
