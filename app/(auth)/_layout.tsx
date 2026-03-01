import { Stack } from 'expo-router';

export default function AuthLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="login_screen" options={{ title: 'Login' }} />
            <Stack.Screen name="register_screen" options={{ title: 'Register' }} />
            <Stack.Screen name="forgot_password_screen" options={{ title: 'Forgot Password' }} />
        </Stack>
    );
}
