import { Alert, Platform } from 'react-native';

// Alert.alert buttons are a no-op on web, so fall back to window.confirm there.
export function confirmDestructive(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}

export function showOperationError(title: string, error: unknown) {
  const message = error instanceof Error ? error.message : 'Please try again.';
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}
