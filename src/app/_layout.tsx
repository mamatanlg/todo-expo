import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';

import { AuthProvider, useAuth } from '@/auth';
import { TodoProvider, useTodos } from '@/todos';

export default function RootLayout() {
  return (
    <AuthProvider>
      <TodoProvider>
        <RootNavigator />
        <StatusBar style="dark" />
      </TodoProvider>
    </AuthProvider>
  );
}

function RootNavigator() {
  const { user, isLoading: authLoading } = useAuth();
  const { isLoading: todosLoading } = useTodos();

  if (authLoading || todosLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const isLoggedIn = user !== null;

  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: '#f1f5f9' } }}>
      <Stack.Protected guard={!isLoggedIn}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={isLoggedIn} redirectTo="/login">
        <Stack.Screen name="index" options={{ title: 'Todos' }} />
        <Stack.Screen name="todo/new" options={{ title: 'New todo', presentation: 'modal' }} />
        <Stack.Screen name="todo/[id]/index" options={{ title: 'Todo' }} />
        <Stack.Screen name="todo/[id]/edit" options={{ title: 'Edit todo' }} />
      </Stack.Protected>
    </Stack>
  );
}
