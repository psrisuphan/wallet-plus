import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, StatusBar, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Modal, ActivityIndicator, FlatList, Alert } from 'react-native';
import Header from '../../../components/Header';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';

const WHITE_GREEN = '#699e8aff';
const EXPENSE_COLOR = '#FF3B30';
const INCOME_COLOR = '#34C759';

interface Wallet {
  id: string;
  name: string;
  balance: number;
  icon: string;
  color?: string;
}

// Pre-defined Categories based on transaction type
const EXPENSE_CATEGORIES = [
  { id: '1', name: 'Food', icon: 'fast-food' },
  { id: '2', name: 'Transport', icon: 'car' },
  { id: '3', name: 'Shopping', icon: 'cart' },
  { id: '4', name: 'Bills', icon: 'receipt' },
  { id: '5', name: 'Health', icon: 'medkit' },
  { id: '6', name: 'Education', icon: 'school' },
  { id: '7', name: 'Groceries', icon: 'basket' },
  { id: '8', name: 'Housing', icon: 'home' },
  { id: '9', name: 'Utilities', icon: 'flash' },
  { id: '10', name: 'Entertainment', icon: 'film' },
];

const INCOME_CATEGORIES = [
  { id: '11', name: 'Salary', icon: 'cash' },
  { id: '12', name: 'Business', icon: 'briefcase' },
  { id: '13', name: 'Investment', icon: 'trending-up' },
  { id: '14', name: 'Bonus', icon: 'gift' },
  { id: '15', name: 'Freelance', icon: 'laptop' },
  { id: '16', name: 'Other', icon: 'add-circle' },
];

const AddTransactionScreen = () => {
    const [type, setType] = useState<'expense' | 'income'>('expense');
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(EXPENSE_CATEGORIES[0].id);
    
    // Auto-switch category selection when toggling between expense and income
    useEffect(() => {
        setSelectedCategory(type === 'expense' ? EXPENSE_CATEGORIES[0].id : INCOME_CATEGORIES[0].id);
    }, [type]);

    // Wallet State
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
    const [isWalletModalVisible, setIsWalletModalVisible] = useState(false);
    const [loadingWallets, setLoadingWallets] = useState(true);

    const [searchQuery, setSearchQuery] = useState('');
    const [sortType, setSortType] = useState<'name' | 'balanceAsc' | 'balanceDesc'>('name');
    const [showSortDropdown, setShowSortDropdown] = useState(false);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                const q = query(collection(db, 'wallets'), where('userId', '==', user.uid));
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
            } else {
                setWallets([]);
                setSelectedWallet(null);
                setLoadingWallets(false);
            }
        });

        return () => unsubscribeAuth();
    }, []);

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

    const submitTransaction = () => {
        // Placeholder for actual Firestore logic
        Alert.alert("Success", "Transaction ready to be saved!");
    };

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
                            keyboardType="numeric"
                            value={amount}
                            onChangeText={handleAmountChange}
                        />
                    </View>

                    {/* Note Input */}
                    <Text style={styles.sectionTitle}>Note</Text>
                    <TextInput
                        style={styles.noteInput}
                        placeholder="What was this for?"
                        placeholderTextColor="#999"
                        value={note}
                        onChangeText={setNote}
                    />

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

                    {/* Category Selection */}
                    <Text style={styles.sectionTitle}>Category</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
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

                </ScrollView>
                
                {/* Fixed Save Button Footer */}
                <View style={styles.footer}>
                    <TouchableOpacity 
                        style={[
                            styles.saveButton,
                            { 
                                backgroundColor: type === 'expense' ? EXPENSE_COLOR : WHITE_GREEN,
                                shadowColor: type === 'expense' ? EXPENSE_COLOR : WHITE_GREEN 
                            }
                        ]}
                        onPress={handleSave}
                    >
                        <Text style={styles.saveButtonText}>Save Transaction</Text>
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
        paddingBottom: 40,
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
    categoryScroll: {
        marginBottom: 20,
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
        fontSize: 13,
        color: '#888',
        fontWeight: '500',
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
    noteInput: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 14,
        paddingHorizontal: 16,
        fontSize: 16,
        color: '#333',
        borderWidth: 1,
        borderColor: '#EAEAEA',
        marginBottom: 20,
    },
    footer: {
        padding: 20,
        paddingBottom: 40,
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    saveButton: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    saveButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default AddTransactionScreen;
