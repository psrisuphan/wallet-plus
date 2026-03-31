// app/(tabs)/tab_2/index.js
import { Text, StyleSheet, View, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { auth } from '../../../firebaseConfig';
import { signOut } from 'firebase/auth';
import { useRouter } from 'expo-router';

const index = () => {
    const router = useRouter();
    const handleSignOut = async () => {
        try {
            await signOut(auth);
            router.replace('/(auth)/login');
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };
    return (
        <SafeAreaView style={styles.container}>
            <Text>ออกจากระบบ</Text>
            <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    signOutButton: {
        marginTop: 20,
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
})

export default index

