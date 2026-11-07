import { useFonts } from 'expo-font';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/lib/auth';
import { isConfigured } from '@/lib/supabase';
import { C, fontFiles } from '@/lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Root() {
  const { loading } = useAuth();
  const [fontsLoaded] = useFonts(fontFiles);
  const ready = fontsLoaded && !loading;
  useEffect(() => { if (ready) SplashScreen.hideAsync().catch(() => {}); }, [ready]);
  if (!ready) return null;
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.paper } }} />
    </>
  );
}

export default function RootLayout() {
  if (!isConfigured) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: C.paper }}>
        <Text style={{ fontSize: 18, textAlign: 'center' }}>
          Supabase ist noch nicht eingerichtet. Trage EXPO_PUBLIC_SUPABASE_URL und EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in die Datei .env ein (siehe README).
        </Text>
      </View>
    );
  }
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
