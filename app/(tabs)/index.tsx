import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { signOut } from 'firebase/auth';
import { app, auth } from '../../firebaseConfig';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
    const handleSignOut = () => {
        signOut(auth);
        // Root _layout.tsx will automatically redirect to login
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Home Screen</Text>
                <Text style={styles.subtitle}>Welcome back to Wallet+</Text>

                <View style={styles.card}>
                    <Text style={styles.cardText}>You are successfully authenticated!</Text>
                </View>

                <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                    <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FEFFD3',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 18,
        color: '#666',
        marginBottom: 32,
    },
    card: {
        backgroundColor: 'white',
        padding: 24,
        borderRadius: 16,
        width: '100%',
        alignItems: 'center',
        marginBottom: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    cardText: {
        fontSize: 16,
        color: '#333',
        textAlign: 'center',
    },
    signOutButton: {
        paddingVertical: 14,
        paddingHorizontal: 32,
        backgroundColor: '#FF3B30',
        borderRadius: 12,
    },
    signOutText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    }
});
