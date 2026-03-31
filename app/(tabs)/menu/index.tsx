import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, StatusBar } from 'react-native';
import Header from '../../../components/Header';
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
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <Header title="Menu" showHome={true} />
            <View style={styles.content}>
                <Text style={styles.thaiText}>ออกจากระบบ</Text>
                <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                    <Text style={styles.signOutText}>Sign Out</Text>
                </TouchableOpacity>
            </View>
        </View>
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
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    thaiText: {
        fontSize: 18,
        color: '#555',
        marginBottom: 10,
    }
})

export default index

