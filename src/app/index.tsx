import { Redirect } from 'expo-router';
import { useAuth } from '@/lib/auth';

export default function Index() {
  const { session, profile } = useAuth();
  if (!session) return <Redirect href="/welcome" />;
  if (!profile?.onboarded) return <Redirect href="/onboarding" />;
  return <Redirect href="/events" />;
}
