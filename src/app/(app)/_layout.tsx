import * as Notifications from 'expo-notifications';
import { Redirect, router, Stack } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { registerPush } from '@/lib/push';
import { C } from '@/lib/theme';

export default function AppLayout() {
  const { session, profile } = useAuth();

  useEffect(() => {
    if (profile?.onboarded) registerPush(profile.id);
  }, [profile?.onboarded, profile?.id]);

  // Open the right screen when someone taps a push notification.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      const d = r.notification.request.content.data as { url?: string } | undefined;
      if (d?.url && typeof d.url === 'string' && d.url.startsWith('/')) router.push(d.url as never);
    });
    return () => sub.remove();
  }, []);

  if (!session) return <Redirect href="/welcome" />;
  if (!profile) return null;
  if (!profile.onboarded) return <Redirect href="/onboarding" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.paper } }} />;
}
