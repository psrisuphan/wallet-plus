import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { app } from '../../firebaseConfig';
import { SafeAreaView } from 'react-native-safe-area-context'

const auth = getAuth(app);

export default function RegisterScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const router = useRouter();

    const handleRegister = async () => {
        if (!email || !password || !confirmPassword) {
            alert("Please fill in all fields.");
            return;
        }
        if (password !== confirmPassword) {
            alert("Passwords do not match.");
            return;
        }
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            // Root _layout.tsx will handle the redirect automatically!
        } catch (error: any) {
            alert("Registration Error: " + error.message);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Text style={styles.backButtonText}>← Back</Text>
                </TouchableOpacity>

                <View style={styles.main}>
                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.subtitle}>Join Wallet+ and simplify your finances</Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Email Address"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Choose Password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                    />

                    <TouchableOpacity style={styles.button} onPress={handleRegister}>
                        <Text style={styles.buttonText}>Get Started</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    keyboardView: {
        flex: 1,
    },
    backButton: {
        paddingHorizontal: 24,
        paddingTop: 8,
    },
    backButtonText: {
        fontSize: 18,
        color: '#007AFF',
        fontWeight: '500',
    },
    main: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
    },
    title: {
        fontSize: 34,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 18,
        color: '#666',
        marginBottom: 32,
    },
    input: {
        height: 56,
        backgroundColor: '#f5f5f5',
        borderRadius: 14,
        paddingHorizontal: 16,
        marginBottom: 16,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#eee',
    },
    button: {
        height: 56,
        backgroundColor: '#34C759', // iOS Green
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '600',
    },
    linkText: {
        color: '#007AFF',
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '500',
    },
});
