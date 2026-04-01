import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, StatusBar, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db, auth } from '../../../firebaseConfig';
import Header from '../../../components/Header';

const PRIMARY_GREEN = '#699E8A';
const SUBTLE_GREEN = '#699E8A20';

export default function TransactionsScreen() {
    const router = useRouter();
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'transactions'),
            where('userId', '==', user.uid),
            orderBy('date', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list: any[] = [];
            snapshot.forEach((doc) => {
                list.push({ id: doc.id, ...doc.data() });
            });
            setTransactions(list);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const renderTransactionItem = ({ item }: { item: any }) => {
        const dateObj = item.date?.toDate ? item.date.toDate() : new Date();
        const dateStr = dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
        const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

        return (
            <View style={styles.transactionRow}>
                <View style={[
                    styles.iconContainer, 
                    { backgroundColor: item.type === 'income' ? SUBTLE_GREEN : '#FFEBEE' }
                ]}>
                    <Ionicons 
                        name={(item.categoryIcon || (item.type === 'income' ? "arrow-up" : "arrow-down")) as any} 
                        size={20} 
                        color={item.type === 'income' ? PRIMARY_GREEN : '#C62828'} 
                    />
                </View>
                <View style={styles.transactionDetails}>
                    <Text style={styles.transactionName} numberOfLines={1}>
                        {item.category || item.note || 'Transaction'}
                    </Text>
                    <Text style={styles.transactionTime}>
                        {dateStr} • {timeStr}
                    </Text>
                </View>
                <Text style={[
                    styles.transactionAmount,
                    { color: item.type === 'income' ? PRIMARY_GREEN : '#C62828' }
                ]}>
                    {item.type === 'income' ? '+' : '-'}฿{(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
            </View>
        );
    };

    return (
        <View style={styles.mainContainer}>
            <Header />
            <StatusBar barStyle="light-content" />
            <View style={styles.content}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
                    </TouchableOpacity>
                    <Text style={styles.screenTitle}>All Transactions</Text>
                    <View style={{ width: 24 }} />
                </View>

                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color={PRIMARY_GREEN} />
                    </View>
                ) : transactions.length === 0 ? (
                    <View style={styles.centerContainer}>
                        <Ionicons name="receipt-outline" size={64} color="#E0E0E0" />
                        <Text style={styles.emptyText}>No transactions yet</Text>
                    </View>
                ) : (
                    <FlatList
                        data={transactions}
                        keyExtractor={(item) => item.id}
                        renderItem={renderTransactionItem}
                        contentContainerStyle={styles.listContainer}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 20,
        marginBottom: 20,
    },
    backButton: {
        padding: 5,
    },
    screenTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    listContainer: {
        paddingBottom: 40,
    },
    transactionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    transactionDetails: {
        flex: 1,
    },
    transactionName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    transactionTime: {
        fontSize: 13,
        color: '#888',
    },
    transactionAmount: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    centerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: -50,
    },
    emptyText: {
        fontSize: 18,
        color: '#999',
        marginTop: 16,
        fontWeight: '500',
    },
});
