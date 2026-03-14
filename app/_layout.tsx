import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { app, auth } from '../firebaseConfig'; // Import app and auth from your config
import { View, ActivityIndicator } from 'react-native';

export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Listen for authentication state changes
    const subscriber = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
      if (initializing) setInitializing(false);
    });
    return subscriber; // unsubscribe on unmount
  }, []);

  useEffect(() => {
    if (initializing) return;

    // segments[0] is the top-level folder name (e.g., '(auth)' or '(tabs)')
    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Redirect to login if user is not logged in and not in auth group
      router.replace('/(auth)/login_screen');
    } else if (user && inAuthGroup) {
      // Redirect to home if user is logged in but trying to access auth pages
      router.replace('/(tabs)');
    }
  }, [user, initializing, segments]);

  // Show a loading spinner while checking auth status
  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="green" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
