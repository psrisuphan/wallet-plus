import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, Text, View, StatusBar, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Modal, ActivityIndicator, FlatList, Alert, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import Header from '../../../components/Header';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../../firebaseConfig';
import { useRouter, useFocusEffect } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import { PRIMARY as WHITE_GREEN, EXPENSE_COLOR, INCOME_COLOR, BORDER } from '../../../constants/Colors';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../../constants/Categories';
import type { Wallet } from '../../../types';

const AddTransactionScreen = () => {
    const router = useRouter();
    const [type, setType] = useState<'expense' | 'income'>('expense');
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [imageNoteBase64, setImageNoteBase64] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState(EXPENSE_CATEGORIES[0].id);
    const [isSaving, setIsSaving] = useState(false);

    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);
    
    // Reset form when the screen is focused (e.g. when switching back to this tab)
    useFocusEffect(
        useCallback(() => {
            setAmount('');
            setNote('');
            setSelectedWallet(null);
            setSelectedCategory(type === 'expense' ? EXPENSE_CATEGORIES[0].id : INCOME_CATEGORIES[0].id);
        }, [type])
    );

    // Auto-switch category selection when toggling between expense and income
    useEffect(() => {
        setSelectedCategory(type === 'expense' ? EXPENSE_CATEGORIES[0].id : INCOME_CATEGORIES[0].id);
        setCanScrollLeft(false);
        setCanScrollRight(true);
    }, [type]);

    const handleCategoryScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const xOffset = event.nativeEvent.contentOffset.x;
        const layoutWidth = event.nativeEvent.layoutMeasurement.width;
        const contentWidth = event.nativeEvent.contentSize.width;

        setCanScrollLeft(xOffset > 0);
        // 5px tolerance because precision issues can prevent exact equality
        setCanScrollRight(xOffset < contentWidth - layoutWidth - 5);
    };

    // Wallet State
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
    const [isWalletModalVisible, setIsWalletModalVisible] = useState(false);
    const [loadingWallets, setLoadingWallets] = useState(true);

    const [searchQuery, setSearchQuery] = useState('');
    const [sortType, setSortType] = useState<'name' | 'balanceAsc' | 'balanceDesc'>('name');
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

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

    useEffect(() => {
        if (!userId) {
            setLoadingWallets(false);
            return;
        }

        setLoadingWallets(true);
        const q = query(collection(db, 'wallets'), where('userId', '==', userId));
        const unsubscribeWallets = onSnapshot(q, (querySnapshot) => {
            const walletData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Wallet[];
            setWallets(walletData);
            setLoadingWallets(false);
        }, (error) => {
            console.error("Error fetching wallets: ", error);
            setLoadingWallets(false);
        });

        return () => unsubscribeWallets();
    }, [userId]);

    // Sync selected wallet with real-time updates from Firestore
    useEffect(() => {
        if (selectedWallet && wallets.length > 0) {
            const updated = wallets.find(w => w.id === selectedWallet.id);
            if (updated && (updated.balance !== selectedWallet.balance || updated.name !== selectedWallet.name)) {
                setSelectedWallet(updated);
            }
        }
    }, [wallets, selectedWallet]);

    const filteredAndSortedWallets = useMemo(() => {
        let result = wallets.filter(w => w.name.toLowerCase().includes(searchQuery.toLowerCase()));
        
        result.sort((a, b) => {
            if (sortType === 'name') {
                return a.name.localeCompare(b.name);
            } else if (sortType === 'balanceAsc') {
                return a.balance - b.balance;
            } else if (sortType === 'balanceDesc') {
                return b.balance - a.balance;
            }
            return 0;
        });

        return result;
    }, [wallets, searchQuery, sortType]);

    const handleAmountChange = (text: string) => {
        // Remove any non-numeric characters except for a single decimal point
        const sanitized = text.replace(/[^0-9.]/g, '');
        // Prevent multiple dots
        if (sanitized.split('.').length > 2) return;
        setAmount(sanitized);
    };

    const handleSave = () => {
        if (!amount || parseFloat(amount) <= 0) {
            Alert.alert("Invalid Amount", "Please enter a valid amount greater than zero.");
            return;
        }

        if (!selectedWallet) {
            Alert.alert("Select Wallet", "Please select a wallet to proceed.");
            return;
        }

        const parsedAmount = parseFloat(amount);

        // Check for insufficient balance on expenses
        if (type === 'expense' && parsedAmount > selectedWallet.balance) {
            Alert.alert(
                "Insufficient Balance",
                `Your expense (฿${parsedAmount.toLocaleString()}) exceeds the balance of ${selectedWallet.name} (฿${selectedWallet.balance.toLocaleString()}). Do you want to continue anyway?`,
                [
                    { text: "Cancel", style: "cancel" },
                    { 
                        text: "Continue", 
                        style: "destructive",
                        onPress: () => submitTransaction() 
                    }
                ]
            );
            return;
        }

        // Otherwise, save normally
        submitTransaction();
    };

    const submitTransaction = async () => {
        if (!auth.currentUser || !selectedWallet) return;

        setIsSaving(true);
        const parsedAmount = parseFloat(amount);
        
        try {
            // Find category details to save along with transaction for easier reading later
            const activeCategories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
            const categoryData = activeCategories.find(c => c.id === selectedCategory);

            // 1. Create transaction document
            const transactionData = {
                userId: auth.currentUser.uid,
                walletId: selectedWallet.id,
                walletName: selectedWallet.name,
                type: type, // 'expense' or 'income'
                amount: parsedAmount,
                categoryId: selectedCategory,
                categoryName: categoryData?.name || 'Unknown',
                categoryIcon: categoryData?.icon || 'help',
                note: note.trim() || null,
                imageBase64: imageNoteBase64 ?? null,
                date: serverTimestamp(),
            };
            
            await addDoc(collection(db, 'transactions'), transactionData);

            // 2. Update the respective wallet balance
            const walletRef = doc(db, 'wallets', selectedWallet.id);
            const newBalance = type === 'expense' 
                ? selectedWallet.balance - parsedAmount 
                : selectedWallet.balance + parsedAmount;
                
            await updateDoc(walletRef, { balance: newBalance });

            // 3. Reset and navigate back
            Alert.alert("Success", "Transaction saved successfully!");
            setAmount('');
            setNote('');
            setSelectedWallet(null);
            setSelectedCategory(type === 'expense' ? EXPENSE_CATEGORIES[0].id : INCOME_CATEGORIES[0].id);
            
            setImageNoteBase64(null);
            
            if (router.canGoBack()) {
                router.back();
            } else {
                router.push("/(tabs)");
            }
            
        } catch (error) {
            console.error("Error saving transaction: ", error);
            Alert.alert("Error", "Could not save transaction. Please try again.");
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

    if (!loadingWallets && wallets.length === 0) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" />
                <Header title="Add Transaction" showHome={true} />
                <View style={styles.emptyWalletsContainer}>
                    <View style={styles.emptyWalletsIconContainer}>
                        <View style={styles.emptyWalletsCircle}>
                            <Ionicons name="wallet-outline" size={70} color={WHITE_GREEN} />
                        </View>
                        <View style={styles.emptyWalletsBadge}>
                            <Ionicons name="add" size={24} color="#FFF" />
                        </View>
                    </View>
                    
                    <Text style={styles.emptyWalletsTitle}>No Wallets Available</Text>
                    <Text style={styles.emptyWalletsSubtitle}>
                        You haven't created any wallets yet. To start tracking your transactions, you'll need at least one wallet to store your balance.
                    </Text>
                    
                    <TouchableOpacity 
                        style={styles.createWalletButton}
                        onPress={() => router.push('/(tabs)/wallet/add')}
                    >
                        <Text style={styles.createWalletButtonText}>Create Your First Wallet</Text>
                        <Ionicons name="arrow-forward" size={20} color="#FFF" style={{ marginLeft: 10 }} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <Header title="Add Transaction" showHome={true} />
            
            {/* Wallet Selection Modal */}
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

                        <View style={{ zIndex: 10 }}>
                            <View style={styles.resultsHeader}>
                                <Text style={styles.resultsCount}>{filteredAndSortedWallets.length} wallet{filteredAndSortedWallets.length !== 1 ? 's' : ''} found</Text>
                                
                                <TouchableOpacity 
                                    style={styles.sortToggle} 
                                    onPress={() => setShowSortDropdown(!showSortDropdown)}
                                >
                                    <Text style={styles.sortToggleText}>
                                        Sort by: {sortType === 'name' ? 'Name' : sortType === 'balanceAsc' ? 'Low ฿' : 'High ฿'}
                                    </Text>
                                    <Ionicons name={showSortDropdown ? "chevron-up" : "chevron-down"} size={16} color="#666" />
                                </TouchableOpacity>
                            </View>
                            
                            {showSortDropdown && (
                                <View style={styles.dropdownMenu}>
                                    <TouchableOpacity style={styles.dropdownItem} onPress={() => { setSortType('name'); setShowSortDropdown(false); }}>
                                        <Text style={[styles.dropdownItemText, sortType === 'name' && styles.dropdownItemTextActive]}>Name</Text>
                                        {sortType === 'name' && <Ionicons name="checkmark" size={16} color={WHITE_GREEN} />}
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.dropdownItem} onPress={() => { setSortType('balanceAsc'); setShowSortDropdown(false); }}>
                                        <Text style={[styles.dropdownItemText, sortType === 'balanceAsc' && styles.dropdownItemTextActive]}>Low ฿</Text>
                                        {sortType === 'balanceAsc' && <Ionicons name="checkmark" size={16} color={WHITE_GREEN} />}
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.dropdownItem} onPress={() => { setSortType('balanceDesc'); setShowSortDropdown(false); }}>
                                        <Text style={[styles.dropdownItemText, sortType === 'balanceDesc' && styles.dropdownItemTextActive]}>High ฿</Text>
                                        {sortType === 'balanceDesc' && <Ionicons name="checkmark" size={16} color={WHITE_GREEN} />}
                                    </TouchableOpacity>
                                </View>
                            )}
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
                                    <Text style={styles.emptyText}>
                                        {wallets.length === 0 
                                            ? "No wallets found. Please create one."
                                            : "No matching wallets found."}
                                    </Text>
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
                    
                    {/* Income / Expense Toggle */}
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

                    {/* Amount Input area */}
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

                    {/* Category Selection */}
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
                            {/* Extra padding to prevent right-most item from being covered by the indicator */}
                            <View style={{ width: 30 }} />
                        </ScrollView>
                        
                        {/* Scroll Affordance Indicators */}
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

                    {/* Note Input */}
                    <Text style={styles.sectionTitle}>Note</Text>
                    <View style={styles.noteInputContainer}>
                        <TextInput
                            style={styles.noteInput}
                            placeholder="What was this for?"
                            placeholderTextColor="#999"
                            value={note}
                            onChangeText={setNote}
                            multiline={true}
                            textAlignVertical="top"
                        />
                        <View style={styles.noteActionContainer}>
                            <TouchableOpacity 
                                style={styles.noteImageAction} 
                                onPress={pickImage}
                            >
                                <Ionicons 
                                    name={imageNoteBase64 ? "camera" : "camera-outline"} 
                                    size={22} 
                                    color="#FFF" 
                                />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Image Preview inside Note section */}
                    {imageNoteBase64 && (
                        <View style={styles.inlineImagePreviewContainer}>
                            <Image 
                                source={{ uri: `data:image/jpeg;base64,${imageNoteBase64}` }} 
                                style={styles.inlineImagePreview} 
                            />
                            <TouchableOpacity 
                                style={styles.removeImageButtonSmall} 
                                onPress={removeImage}
                            >
                                <Ionicons name="close-circle" size={20} color="#FF3B30" />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Wallet Selection */}
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
                            <>
                                <View style={styles.walletSelectorInner}>
                                    <View style={[styles.selectorIconContainer, { backgroundColor: '#E8F5E9' }]}>
                                        <Ionicons name="add" size={20} color={WHITE_GREEN} />
                                    </View>
                                    <Text style={[styles.walletSelectorPlaceholder, { color: WHITE_GREEN, fontWeight: 'bold' }]}>Select Wallet</Text>
                                </View>
                                <Ionicons name="chevron-down" size={20} color={WHITE_GREEN} />
                            </>
                        )}
                    </TouchableOpacity>

                </ScrollView>
                
                {/* Fixed Save Button Footer */}
                <View style={styles.footer}>
                    <TouchableOpacity 
                        style={[
                            styles.saveButton,
                            { 
                                backgroundColor: type === 'expense' ? EXPENSE_COLOR : WHITE_GREEN,
                                shadowColor: type === 'expense' ? EXPENSE_COLOR : WHITE_GREEN,
                                opacity: isSaving ? 0.7 : 1
                            }
                        ]}
                        onPress={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.saveButtonText}>Save Transaction</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 120, // Increased to account for floating footer
    },
    typeContainer: {
        flexDirection: 'row',
        backgroundColor: '#E9ECEF',
        borderRadius: 12,
        padding: 4,
        marginBottom: 30,
    },
    typeButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 10,
    },
    typeButtonExpenseActive: {
        backgroundColor: '#FFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    typeButtonIncomeActive: {
        backgroundColor: '#FFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    typeText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#888',
    },
    typeTextActive: {
        color: '#333',
    },
    amountContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
    },
    currencySymbol: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#333',
        marginRight: 8,
    },
    amountInput: {
        fontSize: 52,
        fontWeight: 'bold',
        minWidth: 150,
        textAlign: 'center',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
        marginTop: 10,
    },
    categoryScrollWrapper: {
        position: 'relative',
        marginBottom: 20,
    },
    categoryScroll: {
        paddingRight: 10,
    },
    scrollIndicatorHint: {
        position: 'absolute',
        top: 0,
        height: 60,
        width: 30,
        justifyContent: 'center',
    },
    scrollIndicatorHintLeft: {
        left: -10,
        alignItems: 'flex-start',
        backgroundColor: 'rgba(250,250,250,0.8)',
    },
    scrollIndicatorHintRight: {
        right: -10,
        alignItems: 'flex-end',
        backgroundColor: 'rgba(250,250,250,0.8)',
    },
    categoryButton: {
        alignItems: 'center',
        marginRight: 20,
        width: 70,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    categoryText: {
        fontSize: 12,
        color: '#888',
        fontWeight: '500',
        textAlign: 'center',
        height: 32,
    },
    categoryTextActive: {
        color: WHITE_GREEN,
        fontWeight: 'bold',
    },
    walletSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EAEAEA',
        marginBottom: 20,
    },
    walletSelectorInner: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    selectorIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    walletSelectorText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    walletSelectorPlaceholder: {
        fontSize: 16,
        color: '#999',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    modalWalletItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    modalWalletIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    modalWalletInfo: {
        flex: 1,
    },
    modalWalletName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    modalWalletBalance: {
        fontSize: 14,
        color: '#888',
    },
    emptyContainer: {
        padding: 20,
        alignItems: 'center',
    },
    emptyText: {
        color: '#888',
        fontSize: 16,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        paddingHorizontal: 12,
        marginBottom: 12,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        height: 48,
        fontSize: 16,
        color: '#333',
    },
    resultsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    resultsCount: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    sortToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    sortToggleText: {
        fontSize: 13,
        color: '#666',
        fontWeight: '600',
        marginRight: 4,
    },
    dropdownMenu: {
        position: 'absolute',
        top: '100%',
        right: 0,
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 8,
        minWidth: 160,
        zIndex: 1000,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: '#EAEAEA',
    },
    dropdownItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#EAEAEA',
    },
    dropdownItemText: {
        fontSize: 14,
        color: '#333',
    },
    dropdownItemTextActive: {
        color: WHITE_GREEN,
        fontWeight: 'bold',
    },
    noteInputContainer: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        marginBottom: 10,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#EAEAEA',
        minHeight: 120,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    noteInput: {
        flex: 1,
        padding: 15,
        fontSize: 16,
        color: '#333',
        minHeight: 80,
    },
    noteActionContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingRight: 10,
        paddingBottom: 10,
    },
    noteImageAction: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: WHITE_GREEN,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: WHITE_GREEN,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    inlineImagePreviewContainer: {
        width: '100%',
        height: 150,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 20,
        backgroundColor: '#F8F9FA',
        borderWidth: 1,
        borderColor: '#EAEAEA',
        position: 'relative',
    },
    inlineImagePreview: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    footer: {
        padding: 24,
        paddingBottom: 16,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
    },
    saveButton: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    saveButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
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
    removeImageButtonSmall: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: 12,
    },
    // Empty Wallet state
    emptyWalletsContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        backgroundColor: '#F8F9FA',
    },
    emptyWalletsIconContainer: {
        position: 'relative',
        marginBottom: 32,
    },
    emptyWalletsCircle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: WHITE_GREEN,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    emptyWalletsBadge: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: WHITE_GREEN,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#F8F9FA',
    },
    emptyWalletsTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
        marginBottom: 12,
    },
    emptyWalletsSubtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 40,
    },
    createWalletButton: {
        flexDirection: 'row',
        backgroundColor: WHITE_GREEN,
        paddingHorizontal: 28,
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: WHITE_GREEN,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 8,
    },
    createWalletButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default AddTransactionScreen;
