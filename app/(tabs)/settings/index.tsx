import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  StatusBar, 
  Image, 
  ScrollView, 
  TextInput, 
  Alert, 
  ActivityIndicator,
  Modal
} from 'react-native';
import Header from '../../../components/Header';
import { auth, db } from '../../../firebaseConfig';
import { signOut } from 'firebase/auth';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { doc, getDoc, updateDoc, writeBatch, collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { PRIMARY as ACCENT } from '../../../constants/Colors';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../../constants/Categories';

const SettingsIndex = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [isClearModalVisible, setIsClearModalVisible] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [isClearing, setIsClearing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    
    // Auth Data
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [createdAt, setCreatedAt] = useState<any>(null); // New state for created date
    const [profileImageBase64, setProfileImageBase64] = useState<string | null>(null);
    
    // Temp Edit Data
    const [tempName, setTempName] = useState('');
    const [tempImage, setTempImage] = useState<string | null>(null);

    const router = useRouter();
    const params = useLocalSearchParams();

    const fetchUserData = async () => {
        const user = auth.currentUser;
        if (user) {
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    const name = data.displayName || '';
                    const img = data.profilePictureBase64 || null;
                    
                    setDisplayName(name);
                    setEmail(data.email || '');
                    setCreatedAt(data.createdAt); // Capture the timestamp
                    setProfileImageBase64(img);
                    
                    // Initialize Temp
                    setTempName(name);
                    setTempImage(img);
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
            } finally {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        fetchUserData();
    }, []);

    // Re-check for edit parameter every time the screen is focused
    useFocusEffect(
        useCallback(() => {
            if (params.edit === 'true' && !loading) {
                setTempName(displayName);
                setTempImage(profileImageBase64);
                setIsEditModalVisible(true);
                
                // Clear the parameter so it can be re-triggered
                router.setParams({ edit: 'false' });
            }
        }, [params.edit, loading, displayName, profileImageBase64])
    );

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please allow photo access to change your picture.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.3,
            base64: true,
        });

        if (!result.canceled && result.assets[0].base64) {
            setTempImage(result.assets[0].base64);
        }
    };

    const handleUpdate = async () => {
        if (!tempName.trim()) {
            Alert.alert('Error', 'Please enter a display name.');
            return;
        }

        setSaving(true);
        try {
            const user = auth.currentUser;
            if (user) {
                await updateDoc(doc(db, 'users', user.uid), {
                    displayName: tempName.trim(),
                    profilePictureBase64: tempImage,
                });
                
                // Update Local State
                await fetchUserData();
                setIsEditModalVisible(false);
                Alert.alert('Success', 'Profile updated!');
            }
        } catch (error: any) {
            Alert.alert('Update Error', error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSignOut = async () => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Sign Out', 
              style: 'destructive',
              onPress: async () => {
                try {
                    await signOut(auth);
                } catch (error) {
                    console.error("Error signing out:", error);
                }
              }
            }
        ]);
    };

    const handleClearData = async () => {
        if (confirmText.toUpperCase() !== 'CLEAR') {
            Alert.alert('Error', 'Please type CLEAR to confirm.');
            return;
        }

        setIsClearing(true);
        try {
            const user = auth.currentUser;
            if (user) {
                const batch = writeBatch(db);
                
                // 1. Clear Wallets
                const walletsRef = collection(db, 'wallets');
                const walletsQuery = query(walletsRef, where('userId', '==', user.uid));
                const walletsSnap = await getDocs(walletsQuery);
                walletsSnap.forEach((doc) => batch.delete(doc.ref));

                // 2. Clear Transactions
                const transactionsRef = collection(db, 'transactions');
                const transactionsQuery = query(transactionsRef, where('userId', '==', user.uid));
                const transactionsSnap = await getDocs(transactionsQuery);
                transactionsSnap.forEach((doc) => batch.delete(doc.ref));

                await batch.commit();
                
                setIsClearModalVisible(false);
                setConfirmText('');
                Alert.alert('Success', 'All wallets and transactions have been cleared.');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setIsClearing(false);
        }
    };

    const handleGenerateMockData = async () => {
        const user = auth.currentUser;
        if (!user) return;

        setIsGenerating(true);
        try {
            const wallets = [
                { name: 'Main Savings', balance: 5000, color: ACCENT, icon: 'wallet' },
                { name: 'Daily Spending', balance: 1200, color: '#F5A623', icon: 'car' },
                { name: 'Vacation Fund', balance: 800, color: '#4A90E2', icon: 'airplane' }
            ];

            const walletIdList: string[] = [];
            
            // Step 1: Create Wallets (Wait for them to exist so transaction rules pass)
            const walletsBatch = writeBatch(db);
            for (const w of wallets) {
                const wRef = doc(collection(db, 'wallets'));
                walletsBatch.set(wRef, {
                    name: w.name,
                    balance: w.balance,
                    color: w.color,
                    icon: w.icon,
                    userId: user.uid,
                    sharedWith: [],
                    createdAt: Timestamp.now()
                });
                walletIdList.push(wRef.id);
            }
            await walletsBatch.commit();

            // Step 2: Create Transactions in a separate batch
            const transBatch = writeBatch(db);
            
            for (let i = 0; i < 80; i++) {
                const isExpense = Math.random() > 0.25;
                const pool = isExpense ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
                const category = pool[Math.floor(Math.random() * pool.length)];
                
                const amount = isExpense ? Math.floor(Math.random() * 500) + 20 : Math.floor(Math.random() * 3000) + 1000;
                const randomWalletId = walletIdList[Math.floor(Math.random() * walletIdList.length)];
                const date = new Date();
                date.setDate(date.getDate() - Math.floor(Math.random() * 60));

                const tRef = doc(collection(db, 'transactions'));
                transBatch.set(tRef, {
                    amount,
                    categoryName: category.name,
                    categoryIcon: category.icon,
                    categoryId: category.id,
                    date: Timestamp.fromDate(date),
                    note: `Mock ${category.name} transaction`,
                    type: isExpense ? 'expense' : 'income',
                    userId: user.uid,
                    userName: displayName || 'Me', // Use actual display name
                    walletId: randomWalletId,
                    createdAt: Timestamp.now()
                });
            }

            await transBatch.commit();
            Alert.alert('Success', 'Generated 3 wallets and 80 transactions with full data!');
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={ACCENT} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <Header title="Settings" showHome={true} />
            
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                {/* Profile Card Section (The clickable "floor") */}
                <TouchableOpacity 
                    style={styles.profileCard} 
                    onPress={() => {
                        setTempName(displayName);
                        setTempImage(profileImageBase64);
                        setIsEditModalVisible(true);
                    }}
                    activeOpacity={0.7}
                >
                    <View style={styles.profileCardLeft}>
                        {profileImageBase64 ? (
                            <Image
                                source={{ uri: `data:image/jpeg;base64,${profileImageBase64}` }}
                                style={styles.cardAvatar}
                            />
                        ) : (
                            <View style={styles.cardAvatarPlaceholder}>
                                <Ionicons name="person" size={24} color={ACCENT} />
                            </View>
                        )}
                        <View style={styles.profileCardText}>
                            <Text style={styles.cardName}>{displayName || 'Set Name'}</Text>
                            <Text style={styles.cardEmail}>{email}</Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={24} color="#CCC" />
                </TouchableOpacity>

                {/* Data Management Section */}
                <Text style={styles.menuTitle}>DATA MANAGEMENT</Text>
                <View style={styles.menuSection}>
                    <TouchableOpacity 
                        style={styles.menuItem} 
                        onPress={() => {
                            setConfirmText('');
                            setIsClearModalVisible(true);
                        }}
                    >
                        <View style={styles.menuItemLeft}>
                            <View style={[styles.iconBox, { backgroundColor: '#FF3B3015' }]}>
                                <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                            </View>
                            <Text style={[styles.menuText, { color: '#FF3B30' }]}>Clear All Personal Data</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#DDD" />
                    </TouchableOpacity>
                </View>

                {/* Developer Tools Section */}
                <Text style={styles.menuTitle}>DEVELOPER TOOLS</Text>
                <View style={styles.menuSection}>
                    <TouchableOpacity 
                        style={styles.menuItem} 
                        onPress={handleGenerateMockData}
                        disabled={isGenerating}
                    >
                        <View style={styles.menuItemLeft}>
                            <View style={[styles.iconBox, { backgroundColor: ACCENT + '15' }]}>
                                <Ionicons name="flask-outline" size={20} color={ACCENT} />
                            </View>
                            <Text style={styles.menuText}>Generate Mock Data</Text>
                        </View>
                        {isGenerating ? (
                            <ActivityIndicator size="small" color={ACCENT} />
                        ) : (
                            <Ionicons name="chevron-forward" size={20} color="#DDD" />
                        )}
                    </TouchableOpacity>
                </View>

                {/* Sign Out Section */}
                <View style={styles.logoutSection}>
                    <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                        <Ionicons name="log-out-outline" size={24} color="#FFF" />
                        <Text style={styles.signOutText}>Sign Out Account</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>

            {/* Edit Profile Modal (The "Edit Page" inside a modal) */}
            <Modal
                visible={isEditModalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setIsEditModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Edit Profile</Text>
                        <TouchableOpacity onPress={handleUpdate} disabled={saving}>
                            {saving ? (
                                <ActivityIndicator size="small" color={ACCENT} />
                            ) : (
                                <Text style={styles.doneText}>Save</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody}>
                        <View style={styles.editAvatarSection}>
                            <TouchableOpacity style={styles.editAvatarWrapper} onPress={pickImage}>
                                {tempImage ? (
                                    <Image
                                        source={{ uri: `data:image/jpeg;base64,${tempImage}` }}
                                        style={styles.editAvatar}
                                    />
                                ) : (
                                    <View style={styles.editAvatarPlaceholder}>
                                        <Ionicons name="person" size={50} color={ACCENT} />
                                    </View>
                                )}
                                <View style={styles.modalCameraBadge}>
                                    <Ionicons name="camera" size={18} color="white" />
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={pickImage}>
                                <Text style={styles.changePhotoText}>Change Profile Photo</Text>
                            </TouchableOpacity>
                            <Text style={styles.modalEmailDisplay}>{email}</Text>
                            {createdAt && (
                                <Text style={styles.modalDateDisplay}>
                                    Joined {createdAt.toDate ? createdAt.toDate().toLocaleDateString() : new Date(createdAt.seconds * 1000).toLocaleDateString()}
                                </Text>
                            )}
                        </View>

                        <View style={styles.editForm}>
                            <View style={styles.editInputGroup}>
                                <Text style={styles.editLabel}>NAME</Text>
                                <TextInput
                                    style={styles.editInput}
                                    value={tempName}
                                    onChangeText={setTempName}
                                    placeholder="Enter your name"
                                    autoFocus
                                />
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </Modal>

            {/* Clear Data Modal */}
            <Modal
                visible={isClearModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsClearModalVisible(false)}
            >
                <View style={styles.clearModalOverlay}>
                    <View style={styles.clearModalContent}>
                        <View style={styles.clearModalIcon}>
                            <Ionicons name="warning" size={40} color="#FF3B30" />
                        </View>
                        <Text style={styles.clearModalTitle}>Clear All Data?</Text>
                        <Text style={styles.clearModalDescription}>
                            This will permanently delete all your wallets and transactions. This action cannot be undone.
                        </Text>
                        
                        <View style={styles.clearInputContainer}>
                            <Text style={styles.clearInputLabel}>Type <Text style={{fontWeight: 'bold'}}>CLEAR</Text> to confirm</Text>
                            <TextInput
                                style={styles.clearInput}
                                value={confirmText}
                                onChangeText={setConfirmText}
                                placeholder="CLEAR"
                                autoCapitalize="characters"
                                autoCorrect={false}
                            />
                        </View>

                        <View style={styles.clearModalButtons}>
                            <TouchableOpacity 
                                style={[styles.clearBtn, styles.clearCancelBtn]} 
                                onPress={() => {
                                    setIsClearModalVisible(false);
                                    setConfirmText('');
                                }}
                            >
                                <Text style={styles.clearCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.clearBtn, styles.clearConfirmBtn, { opacity: confirmText.toUpperCase() === 'CLEAR' ? 1 : 0.5 }]} 
                                onPress={handleClearData}
                                disabled={isClearing || confirmText.toUpperCase() !== 'CLEAR'}
                            >
                                {isClearing ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Text style={styles.clearConfirmText}>Clear Now</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF',
    },
    scrollContent: {
        paddingTop: 16,
        paddingBottom: 40,
    },
    // Main Settings Screen Styles
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFF',
        padding: 16,
        marginHorizontal: 20,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
        marginBottom: 24,
    },
    profileCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginRight: 16,
    },
    cardAvatarPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: ACCENT + '10',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    profileCardText: {
        justifyContent: 'center',
    },
    cardName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 2,
    },
    cardEmail: {
        fontSize: 14,
        color: '#888',
    },
    menuSection: {
        backgroundColor: '#FFF',
        marginHorizontal: 20,
        borderRadius: 20,
        padding: 8,
        marginBottom: 24,
    },
    menuTitle: {
        marginLeft: 16,
        marginTop: 8,
        marginBottom: 12,
        fontSize: 14,
        fontWeight: '700',
        color: '#999',
        letterSpacing: 1,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 12,
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    menuText: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    logoutSection: {
        paddingHorizontal: 20,
    },
    signOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        borderRadius: 16,
        backgroundColor: '#FF3B30',
        elevation: 3,
    },
    signOutText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    // Modal Edit Styles
    modalContainer: {
        flex: 1,
        backgroundColor: '#FFF',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    cancelText: {
        color: '#666',
        fontSize: 16,
    },
    doneText: {
        color: ACCENT,
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalBody: {
        flex: 1,
    },
    editAvatarSection: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    editAvatarWrapper: {
        width: 100,
        height: 100,
        position: 'relative',
        marginBottom: 12,
    },
    editAvatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    editAvatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: ACCENT + '05',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: ACCENT + '20',
    },
    modalCameraBadge: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        backgroundColor: ACCENT,
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    changePhotoText: {
        color: ACCENT,
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 8,
    },
    modalEmailDisplay: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    modalDateDisplay: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
    },
    editForm: {
        padding: 20,
    },
    editInputGroup: {
        marginBottom: 24,
    },
    editLabel: {
        fontSize: 12,
        color: '#999',
        fontWeight: '700',
        marginBottom: 8,
        marginLeft: 4,
    },
    editInput: {
        backgroundColor: '#F5F5F5',
        height: 52,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        color: '#1a1a1a',
        justifyContent: 'center',
    },
    // Clear Data Modal Styles
    clearModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    clearModalContent: {
        backgroundColor: '#FFF',
        width: '100%',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
    },
    clearModalIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FF3B3010',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    clearModalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 8,
    },
    clearModalDescription: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    clearInputContainer: {
        width: '100%',
        marginBottom: 24,
    },
    clearInputLabel: {
        fontSize: 13,
        color: '#888',
        marginBottom: 8,
        textAlign: 'center',
    },
    clearInput: {
        backgroundColor: '#F8F8F8',
        height: 52,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FF3B30',
        textAlign: 'center',
        borderWidth: 1,
        borderColor: '#EEE',
    },
    clearModalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    clearBtn: {
        flex: 1,
        height: 52,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    clearCancelBtn: {
        backgroundColor: '#F5F5F5',
    },
    clearConfirmBtn: {
        backgroundColor: '#FF3B30',
    },
    clearCancelText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '600',
    },
    clearConfirmText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default SettingsIndex;
