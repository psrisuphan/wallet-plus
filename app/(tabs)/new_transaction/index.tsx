import React, { useState } from 'react';
import { StyleSheet, Text, View, StatusBar, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import Header from '../../../components/Header';
import { Ionicons } from '@expo/vector-icons';

const WHITE_GREEN = '#699e8aff';
const EXPENSE_COLOR = '#FF3B30';
const INCOME_COLOR = '#34C759';

// Mock Categories for UI presentation
const CATEGORIES = [
  { id: '1', name: 'Food', icon: 'fast-food' },
  { id: '2', name: 'Transport', icon: 'car' },
  { id: '3', name: 'Shopping', icon: 'cart' },
  { id: '4', name: 'Bills', icon: 'receipt' },
  { id: '5', name: 'Entertainment', icon: 'film' },
];

// Mock Wallets for UI presentation
const WALLETS = [
  { id: '1', name: 'Main Wallet', icon: 'wallet' },
  { id: '2', name: 'Credit Card', icon: 'card' },
];

const AddTransactionScreen = () => {
    const [type, setType] = useState<'expense' | 'income'>('expense');
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0].id);
    const [selectedWallet, setSelectedWallet] = useState(WALLETS[0].id);

    const handleAmountChange = (text: string) => {
        // Remove any non-numeric characters except for a single decimal point
        const sanitized = text.replace(/[^0-9.]/g, '');
        // Prevent multiple dots
        if (sanitized.split('.').length > 2) return;
        setAmount(sanitized);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <Header title="Add Transaction" showHome={true} />
            
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
                            style={[styles.amountInput, { color: type === 'expense' ? EXPENSE_COLOR : INCOME_COLOR }]}
                            placeholder="0.00"
                            placeholderTextColor="#ccc"
                            keyboardType="numeric"
                            value={amount}
                            onChangeText={handleAmountChange}
                        />
                    </View>

                    {/* Category Selection */}
                    <Text style={styles.sectionTitle}>Category</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                        {CATEGORIES.map(cat => (
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

                    {/* Wallet Selection */}
                    <Text style={styles.sectionTitle}>Wallet</Text>
                    <View style={styles.walletContainer}>
                        {WALLETS.map(wallet => (
                            <TouchableOpacity 
                                key={wallet.id} 
                                style={[
                                    styles.walletButton,
                                    selectedWallet === wallet.id && styles.walletButtonActive
                                ]}
                                onPress={() => setSelectedWallet(wallet.id)}
                            >
                                <Ionicons 
                                    name={wallet.icon as any} 
                                    size={20} 
                                    color={selectedWallet === wallet.id ? '#FFF' : '#888'} 
                                />
                                <Text style={[
                                    styles.walletText,
                                    selectedWallet === wallet.id && styles.walletTextActive
                                ]}>{wallet.name}</Text>
                            </TouchableOpacity>
                        ))}
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

                </ScrollView>
                
                {/* Fixed Save Button Footer */}
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.saveButton}>
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
    walletContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 10,
    },
    walletButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginRight: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#EAEAEA',
    },
    walletButtonActive: {
        backgroundColor: WHITE_GREEN,
        borderColor: WHITE_GREEN,
    },
    walletText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#555',
        marginLeft: 8,
    },
    walletTextActive: {
        color: '#FFF',
    },
    noteInput: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#333',
        borderWidth: 1,
        borderColor: '#EAEAEA',
        minHeight: 80,
        textAlignVertical: 'top',
        marginBottom: 20,
    },
    footer: {
        padding: 20,
        paddingBottom: 40, // extra padding for bottom navigation clearance
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    saveButton: {
        backgroundColor: WHITE_GREEN,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: WHITE_GREEN,
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
