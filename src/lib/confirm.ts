import { Alert, Platform } from 'react-native';

/** Yes/no question. Alert.alert does nothing on web, so use the browser dialog there. */
export function confirmAction(title: string, message: string, okText: string, onOk: () => void | Promise<void>) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) void onOk();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Abbrechen', style: 'cancel' },
    { text: okText, style: 'destructive', onPress: () => void onOk() },
  ]);
}
