import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: true, shouldShowBanner: true, shouldShowList: true }),
});

/** Asks for permission (once) and stores the Expo push token. Silent when not possible. */
let pushToken: string | null = null;

export async function registerPush(userId: string) {
  try {
    if (!Device.isDevice) return;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', { name: 'Mosh', importance: Notifications.AndroidImportance.HIGH, lightColor: '#3ED08B' });
    }
    const current = await Notifications.getPermissionsAsync();
    let status = current.status;
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return;
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    if (!projectId) return;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    pushToken = token;
    await supabase.from('push_tokens').upsert({ user_id: userId, token, updated_at: new Date().toISOString() });
  } catch {
    // Push is optional; the app works without it.
  }
}

/** Stop pushes to this device for this account (called on sign-out). */
export async function unregisterPush(userId: string) {
  if (!pushToken) return;
  try { await supabase.from('push_tokens').delete().match({ user_id: userId, token: pushToken }); } catch { /* ignore */ }
  pushToken = null;
}
