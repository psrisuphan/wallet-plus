import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, Text, View, StatusBar, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Modal, ActivityIndicator, FlatList, Alert, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import Header from '../../../components/Header';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../../firebaseConfig';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import { PRIMARY as WHITE_GREEN, EXPENSE_COLOR, INCOME_COLOR } from '../../../constants/Colors';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../../constants/Categories';
import type { Wallet } from '../../../types';

const EditTransactionScreen = () => {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    
    // Original transaction state
    const [originalTransaction, setOriginalTransaction] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [type, setType] = useState<'expense' | 'income'>('expense');
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [imageNoteBase64, setImageNoteBase64] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState(EXPENSE_CATEGORIES[0].id);
    const [isSaving, setIsSaving] = useState(false);

    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);
    
    // Wallet State
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
    const [isWalletModalVisible, setIsWalletModalVisible] = useState(false);
    const [loadingWallets, setLoadingWallets] = useState(true);

    const [searchQuery, setSearchQuery] = useState('');
    const [sortType, setSortType] = useState<'name' | 'balanceAsc' | 'balanceDesc'>('name');
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    // Initial Auth
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUserId(user.uid);
            } else {
                setUserId(null);
                setWallets([]);
                setSelectedWallet(null);
                setLoadingWallets(false);
            }
        });
        return () => unsubscribeAuth();
    }, []);

    // Fetch Wallets
    useEffect(() => {
        if (!userId) return;
        setLoadingWallets(true);
        const q = query(collection(db, 'wallets'), where('userId', '==', userId));
        const unsubscribeWallets = onSnapshot(q, (querySnapshot) => {
            const walletData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Wallet[];
            setWallets(walletData);
            setLoadingWallets(false);
        });
        return () => unsubscribeWallets();
    }, [userId]);

    // Fetch Transaction Data
    useEffect(() => {
        const fetchTransaction = async () => {
            if (!id || typeof id !== 'string') return;
            try {
                const docRef = doc(db, 'transactions', id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setOriginalTransaction({ id: docSnap.id, ...data });
                    setType(data.type);
                    setAmount(data.amount.toString());
                    setNote(data.note || '');
                    setImageNoteBase64(data.imageBase64 || null);
                    setSelectedCategory(data.categoryId || (data.type === 'expense' ? EXPENSE_CATEGORIES[0].id : INCOME_CATEGORIES[0].id));
                } else {
                    Alert.alert("Error", "Transaction not found");
                    router.back();
                }
            } catch (err) {
                console.error(err);
                Alert.alert("Error", "Could not fetch transaction details");
            } finally {
                setLoading(false);
            }
        };
        fetchTransaction();
    }, [id]);

    const handleDelete = async () => {
        Alert.alert(
            "Delete Transaction",
            "Are you sure you want to delete this transaction? This will also update your wallet balance.",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive", 
                    onPress: async () => {
                        if (!originalTransaction) return;
                        setIsSaving(true);
                        try {
                            const batch = writeBatch(db);
                            const transactionRef = doc(db, 'transactions', id as string);
                            
                            // Revert wallet balance
                            const walletRef = doc(db, 'wallets', originalTransaction.walletId);
                            const walletSnap = await getDoc(walletRef);
                            if (!walletSnap.exists()) throw new Error("Wallet not found");
                            const walletData = walletSnap.data();
                            
                            const revertedBalance = originalTransaction.type === 'expense'
                                ? walletData.balance + originalTransaction.amount
                                : walletData.balance - originalTransaction.amount;
                                
                            batch.update(walletRef, { balance: revertedBalance });
                            batch.delete(transactionRef);
                            
                            await batch.commit();
                            Alert.alert("Success", "Transaction deleted successfully!");
                            router.push('/(tabs)/transactions');
                        } catch (error) {
                            console.error("Error deleting transaction: ", error);
                            Alert.alert("Error", "Could not delete transaction.");
                        } finally {
                            setIsSaving(false);
                        }
                    } 
                }
            ]
        );
    };

    // Set selected wallet once wallets are loaded
    useEffect(() => {
        if (originalTransaction && wallets.length > 0 && !selectedWallet) {
            const wallet = wallets.find(w => w.id === originalTransaction.walletId);
            if (wallet) {
                setSelectedWallet(wallet);
            }
        }
    }, [wallets, originalTransaction]);

    const handleAmountChange = (text: string) => {
        const sanitized = text.replace(/[^0-9.]/g, '');
        if (sanitized.split('.').length > 2) return;
        setAmount(sanitized);
    };

    const handleSave = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            Alert.alert("Invalid Amount", "Please enter a valid amount greater than zero.");
            return;
        }

        if (!selectedWallet) {
            Alert.alert("Select Wallet", "Please select a wallet to proceed.");
            return;
        }

        const parsedAmount = parseFloat(amount);
        
        // Calculate projected final balance for the selected wallet
        let projectedBalance = selectedWallet.balance;
        if (type === 'expense') {
            if (originalTransaction.walletId === selectedWallet.id) {
                // If same wallet, we need to account for reverting the old transaction FIRST
                const revertAmount = originalTransaction.type === 'expense' ? originalTransaction.amount : -originalTransaction.amount;
                projectedBalance = selectedWallet.balance + revertAmount - parsedAmount;
            } else {
                // If different wallet, it's just new balance - amount
                projectedBalance = selectedWallet.balance - parsedAmount;
            }
        }

        if (type === 'expense' && projectedBalance < 0) {
            Alert.alert(
                "Insufficient Balance",
                `This update will result in a negative balance (฿${projectedBalance.toLocaleString()}) for ${selectedWallet.name}. Continue anyway?`,
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Continue", style: "destructive", onPress: () => submitUpdate(parsedAmount) }
                ]
            );
            return;
        }

        submitUpdate(parsedAmount);
    };

    const submitUpdate = async (parsedAmount: number) => {
        if (!auth.currentUser || !selectedWallet) return;
        setIsSaving(true);
        try {
            const batch = writeBatch(db);
            const transactionRef = doc(db, 'transactions', id as string);
            
            // 1. Revert old balance
            const oldWalletRef = doc(db, 'wallets', originalTransaction.walletId);
            const oldWalletSnap = await getDoc(oldWalletRef);
            if (!oldWalletSnap.exists()) throw new Error("Old wallet not found");
            const oldWalletData = oldWalletSnap.data() as Wallet;
            
            let revertedBalance = originalTransaction.type === 'expense' 
                ? oldWalletData.balance + originalTransaction.amount 
                : oldWalletData.balance - originalTransaction.amount;

            // 2. Apply new balance
            if (originalTransaction.walletId === selectedWallet.id) {
                const finalBalance = type === 'expense' 
                    ? revertedBalance - parsedAmount 
                    : revertedBalance + parsedAmount;
                batch.update(oldWalletRef, { balance: finalBalance });
            } else {
                batch.update(oldWalletRef, { balance: revertedBalance });
                const newWalletRef = doc(db, 'wallets', selectedWallet.id);
                // Note: selectedWallet.balance here is the STALE balance from state (before reverting old wallet)
                // BUT since it's a different wallet, it's already "clean".
                const newBalance = type === 'expense' 
                    ? selectedWallet.balance - parsedAmount 
                    : selectedWallet.balance + parsedAmount;
                batch.update(newWalletRef, { balance: newBalance });
            }

            // 3. Update transaction document
            const activeCategories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
            const categoryData = activeCategories.find(c => c.id === selectedCategory);

            batch.update(transactionRef, {
                walletId: selectedWallet.id,
                walletName: selectedWallet.name,
                type: type,
                amount: parsedAmount,
                categoryId: selectedCategory,
                categoryName: categoryData?.name || 'Unknown',
                categoryIcon: categoryData?.icon || 'help',
                note: note.trim() || null,
                imageBase64: imageNoteBase64 ?? null,
            });

            await batch.commit();
            Alert.alert("Success", "Transaction updated successfully!");
            router.push('/(tabs)/transactions');
            
        } catch (error) {
            console.error("Error updating transaction: ", error);
            Alert.alert("Error", "Could not update transaction. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please allow access to your photos to add an image note.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.3,
            base64: true,
        });

        if (!result.canceled && result.assets[0].base64) {
            setImageNoteBase64(result.assets[0].base64);
        }
    };

    const removeImage = () => {
        setImageNoteBase64(null);
    };

    const handleCategoryScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
        setCanScrollLeft(contentOffset.x > 0);
        setCanScrollRight(contentOffset.x < contentSize.width - layoutMeasurement.width - 5);
    };

    const filteredAndSortedWallets = useMemo(() => {
        let result = wallets.filter(w => w.name.toLowerCase().includes(searchQuery.toLowerCase()));
        result.sort((a, b) => {
            if (sortType === 'name') return a.name.localeCompare(b.name);
            if (sortType === 'balanceAsc') return a.balance - b.balance;
            if (sortType === 'balanceDesc') return b.balance - a.balance;
            return 0;
        });
        return result;
    }, [wallets, searchQuery, sortType]);

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={WHITE_GREEN} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <Header 
                title="Edit Transaction" 
                showBack={true} 
                onBackPress={() => router.push('/(tabs)/transactions')}
            />
            
            <Modal
                visible={isWalletModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsWalletModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Wallet</Text>
                            <TouchableOpacity onPress={() => setIsWalletModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search wallet..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholderTextColor="#999"
                            />
                        </View>

                        <FlatList
                            data={filteredAndSortedWallets}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity 
                                    style={styles.modalWalletItem}
                                    onPress={() => {
                                        setSelectedWallet(item);
                                        setIsWalletModalVisible(false);
                                    }}
                                >
                                    <View style={[styles.modalWalletIcon, { backgroundColor: item.color || WHITE_GREEN }]}>
                                        <Ionicons name={item.icon as any || 'wallet'} size={24} color="#FFF" />
                                    </View>
                                    <View style={styles.modalWalletInfo}>
                                        <Text style={styles.modalWalletName}>{item.name}</Text>
                                        <Text style={styles.modalWalletBalance}>฿{item.balance.toLocaleString()}</Text>
                                    </View>
                                    {selectedWallet?.id === item.id && (
                                        <Ionicons name="checkmark-circle" size={24} color={WHITE_GREEN} />
                                    )}
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={() => (
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyText}>No wallets found.</Text>
                                </View>
                            )}
                        />
                    </View>
                </View>
            </Modal>

            <KeyboardAvoidingView 
                style={{ flex: 1 }} 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.typeContainer}>
                        <TouchableOpacity 
                            style={[styles.typeButton, type === 'expense' && styles.typeButtonExpenseActive]}
                            onPress={() => setType('expense')}
                        >
                            <Text style={[styles.typeText, type === 'expense' && styles.typeTextActive]}>Expense</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.typeButton, type === 'income' && styles.typeButtonIncomeActive]}
                            onPress={() => setType('income')}
                        >
                            <Text style={[styles.typeText, type === 'income' && styles.typeTextActive]}>Income</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.amountContainer}>
                        <Text style={styles.currencySymbol}>฿</Text>
                        <TextInput
                            style={[styles.amountInput, { color: '#333' }]}
                            placeholder="0.00"
                            placeholderTextColor="#ccc"
                            keyboardType="decimal-pad"
                            value={amount}
                            onChangeText={handleAmountChange}
                        />
                    </View>

                    <Text style={styles.sectionTitle}>Category</Text>
                    <View style={styles.categoryScrollWrapper}>
                        <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={false} 
                            style={styles.categoryScroll}
                            onScroll={handleCategoryScroll}
                            scrollEventThrottle={16}
                        >
                            {(type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(cat => (
                                <TouchableOpacity 
                                    key={cat.id} 
                                    style={styles.categoryButton}
                                    onPress={() => setSelectedCategory(cat.id)}
                                >
                                    <View style={[
                                        styles.iconContainer, 
                                        selectedCategory === cat.id ? { backgroundColor: WHITE_GREEN } : null
                                    ]}>
                                        <Ionicons 
                                            name={cat.icon as any} 
                                            size={24} 
                                            color={selectedCategory === cat.id ? '#FFF' : '#888'} 
                                        />
                                    </View>
                                    <Text style={[
                                        styles.categoryText,
                                        selectedCategory === cat.id && styles.categoryTextActive
                                    ]}>{cat.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        {canScrollLeft && (
                            <View style={[styles.scrollIndicatorHint, styles.scrollIndicatorHintLeft]}>
                                <Ionicons name="chevron-back" size={20} color="#bbb" />
                            </View>
                        )}
                        {canScrollRight && (
                            <View style={[styles.scrollIndicatorHint, styles.scrollIndicatorHintRight]}>
                                <Ionicons name="chevron-forward" size={20} color="#bbb" />
                            </View>
                        )}
                    </View>

                    <Text style={styles.sectionTitle}>Note</Text>
                    <TextInput
                        style={styles.noteInput}
                        placeholder="What was this for?"
                        placeholderTextColor="#999"
                        value={note}
                        onChangeText={setNote}
                    />

                    {/* Wallet Section */}
                    <Text style={styles.sectionTitle}>Wallet</Text>
                    <TouchableOpacity 
                        style={styles.walletSelector}
                        onPress={() => setIsWalletModalVisible(true)}
                    >
                        {loadingWallets ? (
                            <ActivityIndicator size="small" color={WHITE_GREEN} />
                        ) : selectedWallet ? (
                            <>
                                <View style={styles.walletSelectorInner}>
                                    <View style={[styles.selectorIconContainer, { backgroundColor: selectedWallet.color || WHITE_GREEN }]}>
                                        <Ionicons name={selectedWallet.icon as any || 'wallet'} size={20} color="#FFF" />
                                    </View>
                                    <View>
                                        <Text style={styles.walletSelectorText}>{selectedWallet.name}</Text>
                                        <Text style={{ fontSize: 13, color: '#888', marginTop: 2 }}>฿{selectedWallet.balance.toLocaleString()}</Text>
                                    </View>
                                </View>
                                <Ionicons name="chevron-down" size={20} color="#888" />
                            </>
                        ) : (
                            <Text style={{ color: WHITE_GREEN }}>Select Wallet</Text>
                        )}
                    </TouchableOpacity>

                    {/* Image Note */}
                    <Text style={styles.sectionTitle}>Image Note (Optional)</Text>
                    <View style={styles.imagePickerContainer}>
                        {imageNoteBase64 ? (
                            <View style={styles.imagePreviewContainer}>
                                <Image 
                                    source={{ uri: `data:image/jpeg;base64,${imageNoteBase64}` }} 
                                    style={styles.imagePreview} 
                                />
                                <TouchableOpacity 
                                    style={styles.removeImageButton} 
                                    onPress={removeImage}
                                >
                                    <Ionicons name="close-circle" size={24} color="#FF3B30" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity 
                                style={styles.imagePickerPlaceholder} 
                                onPress={pickImage}
                            >
                                <Ionicons name="camera-outline" size={32} color="#888" />
                                <Text style={styles.imagePickerText}>Add a photo receipt or note</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                </ScrollView>
                
                <View style={styles.footer}>
                    <TouchableOpacity 
                        style={styles.deleteButton}
                        onPress={handleDelete}
                        disabled={isSaving}
                    >
                        <Ionicons name="trash-outline" size={24} color="#FF3B30" />
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[
                            styles.saveButton,
                            { 
                                backgroundColor: type === 'expense' ? EXPENSE_COLOR : WHITE_GREEN,
                                opacity: isSaving ? 0.7 : 1
                            }
                        ]}
                        onPress={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>Update</Text>}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    scrollContent: { padding: 20, paddingBottom: 40 },
    typeContainer: { flexDirection: 'row', backgroundColor: '#E9ECEF', borderRadius: 12, padding: 4, marginBottom: 30 },
    typeButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
    typeButtonExpenseActive: { backgroundColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    typeButtonIncomeActive: { backgroundColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    typeText: { fontSize: 16, fontWeight: '600', color: '#888' },
    typeTextActive: { color: '#333' },
    amountContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
    currencySymbol: { fontSize: 32, fontWeight: 'bold', color: '#333', marginRight: 8 },
    amountInput: { fontSize: 52, fontWeight: 'bold', minWidth: 150, textAlign: 'center' },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15, marginTop: 10 },
    categoryScrollWrapper: { position: 'relative', marginBottom: 20 },
    categoryScroll: { paddingRight: 10 },
    iconContainer: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    categoryButton: { alignItems: 'center', marginRight: 20, width: 80 },
    categoryText: { fontSize: 13, color: '#666', fontWeight: '500' },
    categoryTextActive: { color: WHITE_GREEN, fontWeight: 'bold' },
    scrollIndicatorHint: { position: 'absolute', top: 0, height: 60, width: 30, justifyContent: 'center' },
    scrollIndicatorHintLeft: { left: -10 },
    scrollIndicatorHintRight: { right: -10, alignItems: 'flex-end' },
    noteInput: { backgroundColor: '#FFF', borderRadius: 12, padding: 15, fontSize: 16, color: '#333', marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
    walletSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', borderRadius: 12, padding: 15, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
    walletSelectorInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    selectorIconContainer: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    walletSelectorText: { fontSize: 16, fontWeight: '600', color: '#333' },
    footer: { padding: 20, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#EEE', flexDirection: 'row', gap: 12 },
    deleteButton: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', borderColor: '#FF3B30', borderWidth: 1 },
    saveButton: { flex: 1, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    saveButtonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '80%', padding: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F3F5', borderRadius: 12, paddingHorizontal: 12, marginBottom: 20 },
    searchIcon: { marginRight: 10 },
    searchInput: { flex: 1, height: 44, fontSize: 16, color: '#333' },
    modalWalletItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 10, backgroundColor: '#F8F9FA' },
    modalWalletIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    modalWalletInfo: { flex: 1, marginLeft: 12 },
    modalWalletName: { fontSize: 16, fontWeight: '600', color: '#333' },
    modalWalletBalance: { fontSize: 14, color: '#888' },
    emptyContainer: { alignItems: 'center', padding: 40 },
    emptyText: { color: '#999', fontSize: 16 },
    imagePickerContainer: {
        marginBottom: 20,
    },
    imagePickerPlaceholder: {
        height: 120,
        backgroundColor: '#FFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EAEAEA',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imagePickerText: {
        marginTop: 8,
        fontSize: 14,
        color: '#888',
    },
    imagePreviewContainer: {
        position: 'relative',
        width: '100%',
        height: 200,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#EAEAEA',
    },
    imagePreview: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    removeImageButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: 15,
    },
});

export default EditTransactionScreen;
