import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, StatusBar, TouchableOpacity, ScrollView, SectionList, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
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
    const [wallets, setWallets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState<string>('all');
    const [sortOrder, setSortOrder] = useState<string>('newest');
    const [timeFilter, setTimeFilter] = useState<string>('all');
    const [customDate, setCustomDate] = useState<Date>(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

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

        const unsubscribeTransactions = onSnapshot(q, (snapshot) => {
            const list: any[] = [];
            snapshot.forEach((doc) => {
                list.push({ id: doc.id, ...doc.data() });
            });
            setTransactions(list);
            setLoading(false);
        });

        const qWallets = query(
            collection(db, 'wallets'),
            where('userId', '==', user.uid)
        );

        const unsubscribeWallets = onSnapshot(qWallets, (snapshot) => {
            const list: any[] = [];
            snapshot.forEach((doc) => {
                list.push({ id: doc.id, ...doc.data() });
            });
            setWallets(list);
        });

        return () => {
            unsubscribeTransactions();
            unsubscribeWallets();
        };
    }, []);

    const processTransactions = () => {
        let filtered = transactions.filter(t => {
            if (filterType !== 'all' && t.type !== filterType) return false;
            
            const dateObj = t.date?.toDate ? t.date.toDate() : new Date();
            const today = new Date();
            
            if (timeFilter === 'today') {
                if (dateObj.toDateString() !== today.toDateString()) return false;
            } else if (timeFilter === 'thisWeek') {
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - today.getDay());
                startOfWeek.setHours(0, 0, 0, 0);
                if (dateObj < startOfWeek) return false;
            } else if (timeFilter === 'thisMonth') {
                if (dateObj.getMonth() !== today.getMonth() || dateObj.getFullYear() !== today.getFullYear()) return false;
            } else if (timeFilter === 'custom') {
                if (dateObj.toDateString() !== customDate.toDateString()) return false;
            }
            
            return true;
        });

        filtered.sort((a, b) => {
            const dateA = a.date?.toMillis ? a.date.toMillis() : Date.now();
            const dateB = b.date?.toMillis ? b.date.toMillis() : Date.now();
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });

        const groups: { [key: string]: any[] } = {};
        filtered.forEach(t => {
            const d = t.date?.toDate ? t.date.toDate() : new Date();
            const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
            
            if (!groups[dateStr]) {
                groups[dateStr] = [];
            }
            groups[dateStr].push(t);
        });

        return Object.keys(groups).map(key => ({
            title: key,
            data: groups[key]
        }));
    };

    const renderTransactionItem = ({ item }: { item: any }) => {
        const dateObj = item.date?.toDate ? item.date.toDate() : new Date();
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
                        {item.categoryName || 'Transaction'}
                    </Text>
                    {item.note && (
                        <Text style={styles.transactionNote} numberOfLines={1}>
                            {item.note}
                        </Text>
                    )}
                    <Text style={styles.transactionTime}>
                        {dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · {timeStr}
                    </Text>
                    {item.walletId && (
                        <View style={styles.walletTagContainer}>
                            <Ionicons name="wallet-outline" size={12} color="#888" />
                            <Text style={styles.walletTagText}>
                                {wallets.find(w => w.id === item.walletId)?.name || 'Unknown Wallet'}
                            </Text>
                        </View>
                    )}
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

    const activeFilterCount = (timeFilter !== 'all' ? 1 : 0) + 
                              (filterType !== 'all' ? 1 : 0) + 
                              (sortOrder !== 'newest' ? 1 : 0);

    return (
        <View style={styles.mainContainer}>
            <Header title="All Transactions" showBack={true} />
            <StatusBar barStyle="light-content" />
            <View style={styles.filterContainer}>
                <TouchableOpacity 
                    style={styles.filterExpandButton} 
                    onPress={() => setShowFilters(!showFilters)}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="options-outline" size={18} color="#1a1a1a" />
                        <Text style={styles.filterExpandText}>Filter & Sort</Text>
                        {activeFilterCount > 0 && (
                            <View style={styles.filterBadge}>
                                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                            </View>
                        )}
                    </View>
                    <Ionicons name={showFilters ? "chevron-up" : "chevron-down"} size={18} color="#888" />
                </TouchableOpacity>

                {showFilters && (
                    <View style={styles.expandedFilters}>
                        <Text style={styles.filterCategoryTitle}>Time Period</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent}>
                            <TouchableOpacity style={[styles.filterPill, timeFilter === 'all' && styles.filterPillActive]} onPress={() => setTimeFilter('all')}>
                                <Text style={[styles.filterText, timeFilter === 'all' && styles.filterTextActive]}>All Time</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.filterPill, timeFilter === 'today' && styles.filterPillActive]} onPress={() => setTimeFilter('today')}>
                                <Text style={[styles.filterText, timeFilter === 'today' && styles.filterTextActive]}>Today</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.filterPill, timeFilter === 'thisWeek' && styles.filterPillActive]} onPress={() => setTimeFilter('thisWeek')}>
                                <Text style={[styles.filterText, timeFilter === 'thisWeek' && styles.filterTextActive]}>This Week</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.filterPill, timeFilter === 'thisMonth' && styles.filterPillActive]} onPress={() => setTimeFilter('thisMonth')}>
                                <Text style={[styles.filterText, timeFilter === 'thisMonth' && styles.filterTextActive]}>This Month</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.filterPill, timeFilter === 'custom' && styles.filterPillActive]} 
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Ionicons name="calendar-outline" size={14} color={timeFilter === 'custom' ? '#FFF' : '#666'} />
                                <Text style={[styles.filterText, timeFilter === 'custom' && styles.filterTextActive]}>
                                    {timeFilter === 'custom' ? customDate.toLocaleDateString('en-GB') : 'Custom Date'}
                                </Text>
                            </TouchableOpacity>
                        </ScrollView>

                        <Text style={styles.filterCategoryTitle}>Transaction Type</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollContent}>
                            <TouchableOpacity style={[styles.filterPill, filterType === 'all' && styles.filterPillActive]} onPress={() => setFilterType('all')}>
                                <Text style={[styles.filterText, filterType === 'all' && styles.filterTextActive]}>All Types</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.filterPill, filterType === 'income' && styles.filterPillActive]} onPress={() => setFilterType('income')}>
                                <Text style={[styles.filterText, filterType === 'income' && styles.filterTextActive]}>Income</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.filterPill, filterType === 'expense' && styles.filterPillActive]} onPress={() => setFilterType('expense')}>
                                <Text style={[styles.filterText, filterType === 'expense' && styles.filterTextActive]}>Expense</Text>
                            </TouchableOpacity>
                        </ScrollView>
                        
                        <Text style={styles.filterCategoryTitle}>Sort Order</Text>
                        <View style={{ paddingHorizontal: 20, flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity style={[styles.filterPill, sortOrder === 'newest' && styles.filterPillActive]} onPress={() => setSortOrder('newest')}>
                                <Ionicons name="arrow-down" size={14} color={sortOrder === 'newest' ? '#FFF' : '#666'} />
                                <Text style={[styles.filterText, sortOrder === 'newest' && styles.filterTextActive]}>Newest First</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.filterPill, sortOrder === 'oldest' && styles.filterPillActive]} onPress={() => setSortOrder('oldest')}>
                                <Ionicons name="arrow-up" size={14} color={sortOrder === 'oldest' ? '#FFF' : '#666'} />
                                <Text style={[styles.filterText, sortOrder === 'oldest' && styles.filterTextActive]}>Oldest First</Text>
                            </TouchableOpacity>
                        </View>
                        
                        <TouchableOpacity 
                            style={styles.resetFilterButton}
                            onPress={() => {
                                setTimeFilter('all');
                                setFilterType('all');
                                setSortOrder('newest');
                            }}
                        >
                            <Ionicons name="refresh-outline" size={16} color="#C62828" />
                            <Text style={styles.resetFilterText}>Reset Filters</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {showDatePicker && (
                <DateTimePicker
                    value={customDate}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                        setShowDatePicker(Platform.OS === 'ios');
                        if (selectedDate) {
                            setCustomDate(selectedDate);
                            setTimeFilter('custom');
                        }
                        if (Platform.OS === 'android' || event.type === 'set' || event.type === 'dismissed') {
                             setShowDatePicker(false);
                        }
                    }}
                />
            )}

            <View style={styles.content}>
                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color={PRIMARY_GREEN} />
                    </View>
                ) : transactions.length === 0 ? (
                    <View style={styles.centerContainer}>
                        <Ionicons name="receipt-outline" size={64} color="#E0E0E0" />
                        <Text style={styles.emptyText}>No transactions yet</Text>
                    </View>
                ) : processTransactions().length === 0 ? (
                    <View style={styles.centerContainer}>
                        <Ionicons name="filter-outline" size={64} color="#E0E0E0" />
                        <Text style={styles.emptyText}>No transactions match filters</Text>
                    </View>
                ) : (() => {
                    const sections = processTransactions();
                    const totalCount = sections.reduce((acc, s) => acc + s.data.length, 0);
                    return (
                        <SectionList
                            sections={sections}
                            keyExtractor={(item) => item.id}
                            renderItem={renderTransactionItem}
                            ListHeaderComponent={() => (
                                <View style={styles.listHeader}>
                                    <Text style={styles.transactionCountText}>
                                        {totalCount} {totalCount === 1 ? 'Transaction' : 'Transactions'} found
                                    </Text>
                                </View>
                            )}
                            renderSectionHeader={({ section: { title } }) => (
                                <View style={styles.dateHeaderContainer}>
                                    <View style={styles.dateHeaderLine} />
                                    <Text style={styles.sectionHeader}>{title}</Text>
                                    <View style={styles.dateHeaderLine} />
                                </View>
                            )}
                            contentContainerStyle={styles.listContainer}
                            showsVerticalScrollIndicator={false}
                            stickySectionHeadersEnabled={false}
                        />
                    );
                })()}
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
    },
    listContainer: {
        paddingBottom: 40,
        paddingHorizontal: 20,
    },
    sectionHeader: {
        fontSize: 13,
        fontWeight: '700',
        color: '#999',
        marginHorizontal: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    dateHeaderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 32,
        marginBottom: 16,
    },
    dateHeaderLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E0E0E0',
    },
    listHeader: {
        alignItems: 'flex-start',
        marginTop: 20,
        marginBottom: 0,
    },
    transactionCountText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#888',
    },
    filterContainer: {
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    filterExpandButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    filterExpandText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    filterBadge: {
        backgroundColor: PRIMARY_GREEN,
        borderRadius: 12,
        minWidth: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
        marginLeft: 4,
    },
    filterBadgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    expandedFilters: {
        paddingBottom: 20,
        gap: 8,
    },
    resetFilterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        gap: 6,
        marginTop: 16,
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: '#FFEBEE',
        borderRadius: 20,
    },
    resetFilterText: {
        color: '#C62828',
        fontSize: 13,
        fontWeight: '600',
    },
    filterCategoryTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#888',
        marginTop: 10,
        marginBottom: 8,
        paddingHorizontal: 20,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    filterScrollContent: {
        paddingHorizontal: 20,
        gap: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    filterPill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#F5F5F5',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    filterPillActive: {
        backgroundColor: PRIMARY_GREEN,
    },
    filterText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#666',
    },
    filterTextActive: {
        color: '#FFFFFF',
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
        marginBottom: 2,
    },
    transactionNote: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    transactionTime: {
        fontSize: 13,
        color: '#888',
    },
    walletTagContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 4,
    },
    walletTagText: {
        fontSize: 12,
        color: '#888',
        fontWeight: '500',
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
