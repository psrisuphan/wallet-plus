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
import { sendPasswordResetEmail } from 'firebase/auth';
import { app, auth } from '../../firebaseConfig';
import { SafeAreaView } from 'react-native-safe-area-context'
import { PRIMARY } from '../../constants/Colors';

export default function ForgotPasswordScreen() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleResetPassword = async () => {
        if (!email) {
            alert("Please enter your email address.");
            return;
        }

        setIsLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            alert("Password reset email sent! Please check your inbox.");
            router.replace('/(auth)/login_screen');
        } catch (error: any) {
            alert("Error: " + error.message);
        } finally {
            setIsLoading(false);
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
                    <Text style={styles.title}>Forgot Password?</Text>
                    <Text style={styles.subtitle}>
                        Enter your email address and we'll send you a link to reset your password.
                    </Text>

                    <TextInput
                        style={styles.input}
                        placeholder="Email Address"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />

                    <TouchableOpacity
                        style={[styles.button, isLoading && styles.buttonDisabled]}
                        onPress={handleResetPassword}
                        disabled={isLoading}
                    >
                        <Text style={styles.buttonText}>
                            {isLoading ? 'Sending...' : 'Send Reset Link'}
                        </Text>
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
        color: PRIMARY,
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
        lineHeight: 24,
    },
    input: {
        height: 56,
        backgroundColor: '#f5f5f5',
        borderRadius: 14,
        paddingHorizontal: 16,
        marginBottom: 24,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#eee',
    },
    button: {
        height: 56,
        backgroundColor: PRIMARY,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    buttonDisabled: {
        backgroundColor: '#A5CFFF',
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
