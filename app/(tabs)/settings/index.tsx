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
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const ACCENT = '#699e8aff';

const SettingsIndex = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    
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

                {/* Other Settings (Placeholder sections) */}
                <View style={styles.menuSection}>
                    <Text style={styles.menuTitle}>General</Text>
                    <TouchableOpacity style={styles.menuItem}>
                        <View style={styles.menuItemLeft}>
                            <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
                                <Ionicons name="notifications" size={20} color="#2196F3" />
                            </View>
                            <Text style={styles.menuText}>Notifications</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#CCC" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity style={styles.menuItem}>
                        <View style={styles.menuItemLeft}>
                            <View style={[styles.iconBox, { backgroundColor: '#F3E5F5' }]}>
                                <Ionicons name="lock-closed" size={20} color="#9C27B0" />
                            </View>
                            <Text style={styles.menuText}>Privacy & Security</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#CCC" />
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
});

export default SettingsIndex;
