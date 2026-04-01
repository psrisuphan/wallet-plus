import { StyleSheet, Text, View, StatusBar } from 'react-native';
import { useEffect, useState } from 'react';
import Header from '../../components/Header';
import { auth, db } from '../../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [displayName, setDisplayName] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchUserData = async () => {
            const user = auth.currentUser;
            if (user) {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    setProfileImage(data.profilePictureBase64);
                    setDisplayName(data.displayName);
                }
            }
        };

        fetchUserData();
    }, []);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <Header 
                title="Overview" 
                showLogo={false} 
                profileImage={profileImage}
                onProfilePress={() => {
                    router.push('/(tabs)/settings'); // Correct path to main settings
                }}
            />
            <View style={styles.content}>
                <Text style={styles.title}>Home Screen</Text>
                <Text style={styles.subtitle}>Welcome back to Wallet+</Text>

                <View style={styles.card}>
                    <Text style={styles.cardText}>You are successfully authenticated!</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF',
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
});
