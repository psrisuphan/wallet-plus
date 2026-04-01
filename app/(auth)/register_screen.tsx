import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Image,
    ScrollView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { app, auth, db } from '../../firebaseConfig';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { PRIMARY as ACCENT } from '../../constants/Colors';

export default function RegisterScreen() {
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [profileImageBase64, setProfileImageBase64] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please allow access to your photos to set a profile picture.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],   // Force square crop
            quality: 0.3,      // Compress heavily to keep Base64 small
            base64: true,      // Get the Base64 string directly
        });

        if (!result.canceled && result.assets[0].base64) {
            setProfileImageBase64(result.assets[0].base64);
        }
    };

    const handleRegister = async () => {
        if (!displayName.trim()) {
            Alert.alert('Missing Info', 'Please enter a display name.');
            return;
        }
        if (!email || !password || !confirmPassword) {
            Alert.alert('Missing Info', 'Please fill in all fields.');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Password Mismatch', 'Passwords do not match.');
            return;
        }
        if (password.length < 6) {
            Alert.alert('Weak Password', 'Password must be at least 6 characters.');
            return;
        }

        setLoading(true);
        try {
            // 1. Create the Firebase Auth user
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Create the user profile document in Firestore
            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                displayName: displayName.trim(),
                email: email.toLowerCase().trim(),
                profilePictureBase64: profileImageBase64 ?? null,
                createdAt: serverTimestamp(),
            });

            // 3. Root _layout.tsx will handle the redirect automatically!
        } catch (error: any) {
            Alert.alert('Registration Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Text style={styles.backButtonText}>← Back</Text>
                    </TouchableOpacity>

                    <View style={styles.main}>
                        <Text style={styles.title}>Create Account</Text>
                        <Text style={styles.subtitle}>Join Wallet+ and simplify your finances</Text>

                        {/* Profile Picture Picker */}
                        <TouchableOpacity style={styles.avatarContainer} onPress={pickImage} activeOpacity={0.8}>
                            {profileImageBase64 ? (
                                <Image
                                    source={{ uri: `data:image/jpeg;base64,${profileImageBase64}` }}
                                    style={styles.avatarImage}
                                />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Ionicons name="person" size={48} color={ACCENT} />
                                </View>
                            )}
                            <View style={styles.avatarBadge}>
                                <Ionicons name="camera" size={14} color="white" />
                            </View>
                        </TouchableOpacity>
                        <Text style={styles.avatarHint}>
                            {profileImageBase64 ? 'Tap to change photo' : 'Add a profile photo (optional)'}
                        </Text>

                        {/* Form Fields */}
                        <TextInput
                            style={styles.input}
                            placeholder="Display Name"
                            placeholderTextColor="#999"
                            value={displayName}
                            onChangeText={setDisplayName}
                            autoCapitalize="words"
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Email Address"
                            placeholderTextColor="#999"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />

                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="Choose Password"
                                placeholderTextColor="#999"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={styles.passwordInput}
                                placeholder="Confirm Password"
                                placeholderTextColor="#999"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry={!showConfirmPassword}
                            />
                            <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                                <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleRegister} disabled={loading}>
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.buttonText}>Get Started</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
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
    scrollContent: {
        flexGrow: 1,
    },
    backButton: {
        paddingHorizontal: 24,
        paddingTop: 8,
    },
    backButtonText: {
        fontSize: 18,
        color: ACCENT,
        fontWeight: '500',
    },
    main: {
        flex: 1,
        padding: 24,
        alignItems: 'center',
    },
    title: {
        fontSize: 34,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 8,
        alignSelf: 'flex-start',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 28,
        alignSelf: 'flex-start',
    },
    // Avatar Styles
    avatarContainer: {
        width: 110,
        height: 110,
        marginBottom: 10,
        position: 'relative',
    },
    avatarImage: {
        width: 110,
        height: 110,
        borderRadius: 55,
        borderWidth: 3,
        borderColor: ACCENT,
    },
    avatarPlaceholder: {
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: ACCENT + '15',
        borderWidth: 2,
        borderColor: ACCENT + '40',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarBadge: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        backgroundColor: ACCENT,
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white',
    },
    avatarHint: {
        fontSize: 12,
        color: '#999',
        marginBottom: 24,
    },
    // Form Styles
    input: {
        width: '100%',
        height: 56,
        backgroundColor: '#f5f5f5',
        borderRadius: 14,
        paddingHorizontal: 16,
        marginBottom: 16,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#eee',
        color: '#1a1a1a',
    },
    passwordContainer: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 14,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#eee',
    },
    passwordInput: {
        flex: 1,
        height: 56,
        paddingHorizontal: 16,
        fontSize: 16,
        color: '#1a1a1a',
    },
    eyeIcon: {
        padding: 10,
        marginRight: 8,
    },
    button: {
        width: '100%',
        height: 56,
        backgroundColor: ACCENT,
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
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '600',
    },
});
