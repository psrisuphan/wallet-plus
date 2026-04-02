import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, StatusBar, TouchableOpacity, ScrollView, SectionList, Platform, TextInput } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, query, where, onSnapshot, orderBy, or } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { db, auth } from '../../../firebaseConfig';
import Header from '../../../components/Header';
import { PRIMARY as PRIMARY_GREEN, PRIMARY_LIGHT as SUBTLE_GREEN } from '../../../constants/Colors';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../../constants/Categories';
import { Modal, Image } from 'react-native';
import TransactionDetailModal from '../../../components/TransactionDetailModal';

export default function TransactionsScreen() {
    const router = useRouter();
    const [transactions, setTransactions] = useState<any[]>([]);
    const [wallets, setWallets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState<string>('all');
    const [sortOrder, setSortOrder] = useState<string>('newest');
    const [timeFilter, setTimeFilter] = useState<string>('all');
    const [customDate, setCustomDate] = useState<Date>(new Date());
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedWallets, setSelectedWallets] = useState<string[]>([]);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    const normalizeDateToAD = (date: Date) => {
        const year = date.getFullYear();
        if (year > 2400) {
            const newDate = new Date(date);
            newDate.setFullYear(year - 543);
            return newDate;
        }
        return date;
    };

    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user: User | null) => {
            if (user) {
                setUserId(user.uid);
            } else {
                setUserId(null);
                setTransactions([]);
                setWallets([]);
                setLoading(false);
            }
        });
        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (!userId) return;

        // 1. Fetch ALL wallets (Owned or Shared)
        const qWallets = query(
            collection(db, 'wallets'),
            or(
                where('userId', '==', userId),
                where('sharedWith', 'array-contains', userId)
            )
        );

        const unsubscribeWallets = onSnapshot(qWallets, (snapshot) => {
            const walletList: any[] = [];
            snapshot.forEach((doc) => {
                const data = { id: doc.id, ...doc.data() };
                walletList.push(data);
            });
            setWallets(walletList);
        }, (error) => {
            console.error("Wallets Snapshot Error:", error);
        });

        return () => unsubscribeWallets();
    }, [userId]);

    useEffect(() => {
        if (!userId || wallets.length === 0) {
            setTransactions([]);
            if (!userId) setLoading(false);
            return;
        }

        // 2. Fetch ALL transactions for these wallets
        const walletIds = wallets.map(w => w.id);
        const qTransactions = query(
            collection(db, 'transactions'),
            where('walletId', 'in', walletIds.slice(0, 30)),
            orderBy('date', 'desc')
        );

        const unsubscribeTransactions = onSnapshot(qTransactions, (snap) => {
            const list: any[] = [];
            snap.forEach((d) => {
                list.push({ id: d.id, ...d.data() });
            });
            setTransactions(list);
            setLoading(false);
        }, (err) => {
            console.error("Transactions Snapshot Error:", err);
            setLoading(false);
        });

        return () => unsubscribeTransactions();
    }, [userId, wallets]);

    const resetFilters = () => {
        setTimeFilter('all');
        setFilterType('all');
        setSelectedCategories([]);
        setSelectedWallets([]);
        setSearchQuery('');
        setSortOrder('newest');
    };

    // Auto-filter selected categories if they're not valid for the selected type
    useEffect(() => {
        if (selectedCategories.length === 0) return;
        
        const incomeNames = INCOME_CATEGORIES.map(c => c.name);
        const expenseNames = EXPENSE_CATEGORIES.map(c => c.name);
        
        if (filterType === 'income') {
            setSelectedCategories(prev => prev.filter(name => incomeNames.includes(name)));
        } else if (filterType === 'expense') {
            setSelectedCategories(prev => prev.filter(name => expenseNames.includes(name)));
        }
    }, [filterType]);

    const processTransactions = () => {
        let filtered = transactions.filter(t => {
            const dateObj = t.date?.toDate ? t.date.toDate() : new Date();
            const today = new Date();
            
            // Search filter (handles note, category, and amount)
            if (searchQuery.trim() !== '') {
                const query = searchQuery.toLowerCase();
                const noteMatch = (t.note || '').toLowerCase().includes(query);
                const categoryMatch = (t.categoryName || '').toLowerCase().includes(query);
                const amountMatch = t.amount.toString().includes(query);
                
                if (!noteMatch && !categoryMatch && !amountMatch) return false;
            }

            // Category filter
            if (selectedCategories.length > 0 && !selectedCategories.includes(t.categoryName || 'Other')) return false;

            // Wallet filter
            if (selectedWallets.length > 0 && !selectedWallets.includes(t.walletId || '')) return false;

            // Type filter
            if (filterType !== 'all' && t.type !== filterType) return false;
            
            // Time filter
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
            <TouchableOpacity 
                style={styles.transactionRow}
                onPress={() => {
                    setSelectedTransaction(item);
                    setShowDetailModal(true);
                }}
                activeOpacity={0.7}
            >
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.transactionName} numberOfLines={1}>
                            {item.categoryName || 'Transaction'}
                        </Text>
                        {item.imageBase64 && (
                            <Ionicons name="camera" size={14} color={PRIMARY_GREEN} />
                        )}
                    </View>
                    {item.note && (
                        <Text style={styles.transactionNote} numberOfLines={1}>
                            {item.note}
                        </Text>
                    )}
                    <Text style={styles.transactionTime}>
                        {dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · {timeStr}
                    </Text>
                    {(() => {
                        const wallet = wallets.find(w => w.id === item.walletId);
                        const isShared = (wallet?.sharedWith?.length || 0) > 0 || (wallet && item.userId !== wallet.userId);
                        if (item.userName && isShared) {
                            return (
                                <Text style={{ fontSize: 11, color: PRIMARY_GREEN, fontWeight: '600', marginTop: 1 }}>
                                    Added by {item.userName}
                                </Text>
                            );
                        }
                        return null;
                    })()}
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
                </TouchableOpacity>
        );
    };

    const categoriesToDisplay = useMemo(() => {
        if (filterType === 'income') return INCOME_CATEGORIES;
        if (filterType === 'expense') return EXPENSE_CATEGORIES;
        return [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];
    }, [filterType]);

    const activeFilterCount = (timeFilter !== 'all' ? 1 : 0) + 
                               (filterType !== 'all' ? 1 : 0) + 
                               (selectedCategories.length > 0 ? 1 : 0) + 
                               (selectedWallets.length > 0 ? 1 : 0) + 
                               (searchQuery.trim() !== '' ? 1 : 0) + 
                               (sortOrder !== 'newest' ? 1 : 0);

    const toggleCategory = (name: string) => {
        if (name === 'all') {
            setSelectedCategories([]);
            return;
        }
        setSelectedCategories(prev => 
            prev.includes(name) 
                ? prev.filter(c => c !== name) 
                : [...prev, name]
        );
    };

    const toggleWallet = (id: string) => {
        if (id === 'all') {
            setSelectedWallets([]);
            return;
        }
        setSelectedWallets(prev => 
            prev.includes(id) 
                ? prev.filter(wId => wId !== id) 
                : [...prev, id]
        );
    };

    return (
        <View style={styles.mainContainer}>
            <Header 
                title="All Transactions" 
                showBack={true} 
                showAdd={true} 
                onAddPress={() => router.push('/(tabs)/transactions/new')}
            />
            <StatusBar barStyle="light-content" />
            <View style={styles.topControlsContainer}>
                <View style={styles.searchSection}>
                    <View style={styles.searchContainer}>
                        <Ionicons name="search-outline" size={18} color="#888" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search note or category..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholderTextColor="#999"
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <Ionicons name="close-circle" size={18} color="#888" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <TouchableOpacity 
                    style={styles.filterExpandButton} 
                    onPress={() => setShowFilters(!showFilters)}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="options-outline" size={18} color="#1a1a1a" />
                        <Text style={styles.filterExpandText}>Filter & Sort Options</Text>
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
                        <View style={styles.filterSection}>
                            <Text style={styles.filterCategoryTitle}>Time Period</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterPillScroll} contentContainerStyle={styles.filterScrollContent}>
                                <TouchableOpacity 
                                    style={[styles.filterPill, timeFilter === 'custom' && styles.filterPillActive]} 
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Ionicons name="calendar-outline" size={14} color={timeFilter === 'custom' ? '#FFF' : '#666'} />
                                    <Text style={[styles.filterText, timeFilter === 'custom' && styles.filterTextActive]}>
                                        {timeFilter === 'custom' 
                                            ? normalizeDateToAD(customDate).toLocaleDateString('en-GB', { 
                                                year: 'numeric', 
                                                month: '2-digit', 
                                                day: '2-digit',
                                                calendar: 'gregory'
                                              } as any) 
                                            : 'Custom Date'
                                        }
                                    </Text>
                                </TouchableOpacity>
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
                            </ScrollView>
                        </View>

                        <View style={styles.filterSection}>
                            <Text style={styles.filterCategoryTitle}>Transaction Type</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterPillScroll} contentContainerStyle={styles.filterScrollContent}>
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
                        </View>
                        
                        <View style={styles.filterSection}>
                            <Text style={styles.filterCategoryTitle}>Sort Order</Text>
                            <View style={styles.filterRowContainer}>
                                <TouchableOpacity style={[styles.filterPill, sortOrder === 'newest' && styles.filterPillActive]} onPress={() => setSortOrder('newest')}>
                                    <Ionicons name="arrow-down" size={14} color={sortOrder === 'newest' ? '#FFF' : '#666'} />
                                    <Text style={[styles.filterText, sortOrder === 'newest' && styles.filterTextActive]}>Newest First</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.filterPill, sortOrder === 'oldest' && styles.filterPillActive]} onPress={() => setSortOrder('oldest')}>
                                    <Ionicons name="arrow-up" size={14} color={sortOrder === 'oldest' ? '#FFF' : '#666'} />
                                    <Text style={[styles.filterText, sortOrder === 'oldest' && styles.filterTextActive]}>Oldest First</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.filterSection}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <Text style={styles.filterCategoryTitle}>Wallets</Text>
                                {selectedWallets.length > 0 && (
                                    <Text style={{ fontSize: 12, color: PRIMARY_GREEN, fontWeight: '600' }}>
                                        {selectedWallets.length} selected
                                    </Text>
                                )}
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterPillScroll} contentContainerStyle={styles.filterScrollContent}>
                                <TouchableOpacity 
                                    style={[styles.filterPill, selectedWallets.length === 0 && styles.filterPillActive]} 
                                    onPress={() => toggleWallet('all')}
                                >
                                    <Text style={[styles.filterText, selectedWallets.length === 0 && styles.filterTextActive]}>All Wallets</Text>
                                </TouchableOpacity>
                                {wallets.map((wallet: any) => {
                                    const isSelected = selectedWallets.includes(wallet.id);
                                    const isShared = wallet.userId !== userId;
                                    const wColor = wallet.color || '#666';
                                    return (
                                        <TouchableOpacity 
                                            key={wallet.id}
                                            style={[
                                                styles.filterPill, 
                                                { borderColor: wColor + '80' }, // Subtle transparent border
                                                isSelected && { backgroundColor: wColor, borderColor: wColor }
                                            ]} 
                                            onPress={() => toggleWallet(wallet.id)}
                                        >
                                            <Ionicons 
                                                name={isShared ? "people-outline" : "wallet-outline"} 
                                                size={14} 
                                                color={isSelected ? '#FFF' : wColor} 
                                            />
                                            <Text style={[
                                                styles.filterText, 
                                                { color: wColor },
                                                isSelected && { color: '#FFF' }
                                            ]}>
                                                {wallet.name}
                                                {isShared && (
                                                    <Text style={{ fontSize: 10, opacity: 0.8 }}>
                                                        {` (Shared)`}
                                                    </Text>
                                                )}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>

                        <View style={styles.filterSection}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <Text style={styles.filterCategoryTitle}>Category</Text>
                                {selectedCategories.length > 0 && (
                                    <Text style={{ fontSize: 12, color: PRIMARY_GREEN, fontWeight: '600' }}>
                                        {selectedCategories.length} selected
                                    </Text>
                                )}
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterIconScroll} contentContainerStyle={styles.filterScrollContent}>
                                <TouchableOpacity 
                                    style={[styles.categoryIconPill, selectedCategories.length === 0 && styles.categoryIconPillActive]} 
                                    onPress={() => toggleCategory('all')}
                                >
                                    <Ionicons name="grid-outline" size={18} color={selectedCategories.length === 0 ? '#FFF' : '#666'} />
                                    <Text style={[styles.filterText, selectedCategories.length === 0 && styles.filterTextActive]}>All</Text>
                                </TouchableOpacity>
                                {categoriesToDisplay.map((cat: any, idx: number) => {
                                    const isSelected = selectedCategories.includes(cat.name);
                                    return (
                                        <TouchableOpacity 
                                            key={cat.id || `cat-${idx}`}
                                            style={[styles.categoryIconPill, isSelected && styles.categoryIconPillActive]} 
                                            onPress={() => toggleCategory(cat.name)}
                                        >
                                            <Ionicons 
                                                name={(cat.icon || 'help-outline') as any} 
                                                size={18} 
                                                color={isSelected ? '#FFF' : '#666'} 
                                            />
                                            <Text style={[styles.filterText, isSelected && styles.filterTextActive]}>
                                                {cat.name}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                        
                        <TouchableOpacity 
                            style={styles.resetFilterButton}
                            onPress={resetFilters}
                        >
                            <Ionicons name="refresh-outline" size={16} color="#C62828" />
                            <Text style={styles.resetFilterText}>Reset Filters</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {showDatePicker && (
                Platform.OS === 'ios' ? (
                    <Modal
                        transparent={true}
                        animationType="slide"
                        visible={showDatePicker}
                        onRequestClose={() => setShowDatePicker(false)}
                    >
                        <TouchableOpacity 
                            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
                            activeOpacity={1}
                            onPress={() => setShowDatePicker(false)}
                        >
                            <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                    <Text style={{ fontSize: 18, fontWeight: '600' }}>Select Date</Text>
                                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                                        <Text style={{ color: PRIMARY_GREEN, fontWeight: '600', fontSize: 16 }}>Done</Text>
                                    </TouchableOpacity>
                                </View>
                                <DateTimePicker
                                    value={normalizeDateToAD(customDate)}
                                    mode="date"
                                    display="spinner"
                                    locale="en-GB"
                                    onChange={(event, selectedDate) => {
                                        if (selectedDate) setCustomDate(normalizeDateToAD(selectedDate));
                                    }}
                                />
                                <TouchableOpacity 
                                    style={{ 
                                        backgroundColor: PRIMARY_GREEN, 
                                        padding: 16, 
                                        borderRadius: 12, 
                                        alignItems: 'center',
                                        marginTop: 20
                                    }}
                                    onPress={() => {
                                        setShowDatePicker(false);
                                        setTimeFilter('custom');
                                    }}
                                >
                                    <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 16 }}>Confirm Date</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    </Modal>
                ) : (
                    <DateTimePicker
                        value={normalizeDateToAD(customDate)}
                        mode="date"
                        display="default"
                        locale="en-GB"
                        onChange={(event, selectedDate) => {
                            setShowDatePicker(false);
                            if (selectedDate) {
                                setCustomDate(normalizeDateToAD(selectedDate));
                                setTimeFilter('custom');
                            }
                        }}
                    />
                )
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
                        <TouchableOpacity onPress={resetFilters} style={styles.clearFiltersButton}>
                            <Text style={styles.clearFiltersText}>Clear all filters</Text>
                        </TouchableOpacity>
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

            {/* Transaction Detail Modal */}
            {selectedTransaction && (
                <TransactionDetailModal 
                    visible={showDetailModal}
                    transaction={selectedTransaction}
                    walletName={wallets.find(w => w.id === selectedTransaction.walletId)?.name || 'Unknown Wallet'}
                    isShared={(() => {
                        const wallet = wallets.find(w => w.id === selectedTransaction.walletId);
                        return !!((wallet?.sharedWith?.length || 0) > 0 || (wallet && selectedTransaction.userId !== wallet.userId));
                    })()}
                    onClose={() => setShowDetailModal(false)}
                    onEdit={() => {
                        setShowDetailModal(false);
                        router.push(`/(tabs)/transactions/${selectedTransaction.id}`);
                    }}
                />
            )}
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
    topControlsContainer: {
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        paddingTop: 4,
    },
    searchSection: {
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 4,
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
        padding: 20,
        gap: 16,
    },
    filterSection: {
        marginBottom: 8,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F0F0',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#1a1a1a',
    },
    filterPillScroll: {
        marginHorizontal: -20,
    },
    filterRowContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    filterIconScroll: {
        marginHorizontal: -20,
    },
    categoryIconPill: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 25,
        backgroundColor: '#F5F5F5',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    categoryIconPillActive: {
        backgroundColor: PRIMARY_GREEN,
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
        fontSize: 16,
        color: '#888',
        marginTop: 8,
    },
    clearFiltersButton: {
        marginTop: 16,
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    clearFiltersText: {
        fontSize: 15,
        color: PRIMARY_GREEN,
        fontWeight: '700',
    },
});
