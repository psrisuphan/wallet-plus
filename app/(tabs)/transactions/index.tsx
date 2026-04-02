import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, StatusBar, TouchableOpacity, ScrollView, SectionList, Platform, TextInput, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, query, where, onSnapshot, orderBy, or } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { db, auth } from '../../../firebaseConfig';
import Header from '../../../components/Header';
import { PRIMARY as PRIMARY_GREEN, PRIMARY_LIGHT as SUBTLE_GREEN } from '../../../constants/Colors';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../../constants/Categories';
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
    const [minAmount, setMinAmount] = useState<string>('');
    const [maxAmount, setMaxAmount] = useState<string>('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    const [userId, setUserId] = useState<string | null>(null);
    const [startDate, setStartDate] = useState<Date>(new Date());
    const [endDate, setEndDate] = useState<Date>(new Date());
    const [showRangePicker, setShowRangePicker] = useState(false);
    const [editingRange, setEditingRange] = useState<'start' | 'end'>('start');

    // Scroll Indicator States
    const [timeScroll, setTimeScroll] = useState({ left: false, right: true });
    const [typeScroll, setTypeScroll] = useState({ left: false, right: true });
    const [walletScroll, setWalletScroll] = useState({ left: false, right: true });
    const [categoryScroll, setCategoryScroll] = useState({ left: false, right: true });

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

    const handleScroll = (key: 'time' | 'type' | 'wallet' | 'category') => (event: any) => {
        const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
        const left = contentOffset.x > 5;
        const right = contentOffset.x < contentSize.width - layoutMeasurement.width - 5;
        
        if (key === 'time') setTimeScroll({ left, right });
        else if (key === 'type') setTypeScroll({ left, right });
        else if (key === 'wallet') setWalletScroll({ left, right });
        else if (key === 'category') setCategoryScroll({ left, right });
    };

    const resetFilters = () => {
        setTimeFilter('all');
        setFilterType('all');
        setSelectedCategories([]);
        setSelectedWallets([]);
        setSearchQuery('');
        setSortOrder('newest');
        setMinAmount('');
        setMaxAmount('');
    };

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

    const processTransactions = () => {
        let filtered = transactions.filter(t => {
            const dateObj = t.date?.toDate ? t.date.toDate() : new Date();
            const today = new Date();
            
            if (searchQuery.trim() !== '') {
                const queryStr = searchQuery.toLowerCase();
                const noteMatch = (t.note || '').toLowerCase().includes(queryStr);
                const categoryMatch = (t.categoryName || '').toLowerCase().includes(queryStr);
                const amountMatch = t.amount.toString().includes(queryStr);
                
                if (!noteMatch && !categoryMatch && !amountMatch) return false;
            }

            if (selectedCategories.length > 0 && !selectedCategories.includes(t.categoryName || 'Other')) return false;
            if (selectedWallets.length > 0 && !selectedWallets.includes(t.walletId || '')) return false;
            if (filterType !== 'all' && t.type !== filterType) return false;
            
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
            } else if (timeFilter === 'range') {
                const sDate = new Date(startDate);
                sDate.setHours(0, 0, 0, 0);
                const eDate = new Date(endDate);
                eDate.setHours(23, 59, 59, 999);
                if (dateObj < sDate || dateObj > eDate) return false;
            }

            if (minAmount !== '') {
                if (t.amount < parseFloat(minAmount)) return false;
            }
            if (maxAmount !== '') {
                if (t.amount > parseFloat(maxAmount)) return false;
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
                               (sortOrder !== 'newest' ? 1 : 0) +
                               (minAmount !== '' || maxAmount !== '' ? 1 : 0);

    const formatDisplayDate = (date: Date) => {
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
                            placeholder="Search note, category, or amount..."
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
                        {/* Time Period Filter */}
                        <View style={styles.filterSection}>
                            <Text style={styles.filterCategoryTitle}>Time Period</Text>
                            <View style={styles.scrollWrapper}>
                                <ScrollView 
                                    horizontal 
                                    showsHorizontalScrollIndicator={false} 
                                    style={styles.filterPillScroll} 
                                    contentContainerStyle={styles.filterScrollContent}
                                    onScroll={handleScroll('time')}
                                    scrollEventThrottle={16}
                                >
                                    <TouchableOpacity 
                                        style={[styles.filterPill, timeFilter === 'range' && styles.filterPillActive]} 
                                        onPress={() => setShowRangePicker(true)}
                                    >
                                        <Ionicons name="calendar-outline" size={14} color={timeFilter === 'range' ? '#FFF' : '#666'} />
                                        <Text style={[styles.filterText, timeFilter === 'range' && styles.filterTextActive]}>
                                            {timeFilter === 'range' 
                                                ? `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`
                                                : 'Custom Range'
                                            }
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[styles.filterPill, timeFilter === 'custom' && styles.filterPillActive]} 
                                        onPress={() => setShowDatePicker(true)}
                                    >
                                        <Ionicons name="calendar-outline" size={14} color={timeFilter === 'custom' ? '#FFF' : '#666'} />
                                        <Text style={[styles.filterText, timeFilter === 'custom' && styles.filterTextActive]}>
                                            {timeFilter === 'custom' 
                                                ? formatDisplayDate(customDate) 
                                                : 'Custom Date'
                                            }
                                        </Text>
                                    </TouchableOpacity>
                                    {(['all', 'today', 'thisWeek', 'thisMonth'] as const).map((period) => (
                                        <TouchableOpacity 
                                            key={period}
                                            style={[styles.filterPill, timeFilter === period && styles.filterPillActive]} 
                                            onPress={() => setTimeFilter(period)}
                                        >
                                            <Text style={[styles.filterText, timeFilter === period && styles.filterTextActive]}>
                                                {period === 'all' ? 'All Time' : period === 'today' ? 'Today' : period === 'thisWeek' ? 'This Week' : 'This Month'}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                                {timeScroll.left && (
                                    <View style={[styles.scrollIndicator, styles.scrollIndicatorLeft]}>
                                        <Ionicons name="chevron-back" size={14} color="#bbb" />
                                    </View>
                                )}
                                {timeScroll.right && (
                                    <View style={[styles.scrollIndicator, styles.scrollIndicatorRight]}>
                                        <Ionicons name="chevron-forward" size={14} color="#bbb" />
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Transaction Type Filter */}
                        <View style={styles.filterSection}>
                            <Text style={styles.filterCategoryTitle}>Transaction Type</Text>
                            <View style={styles.scrollWrapper}>
                                <ScrollView 
                                    horizontal 
                                    showsHorizontalScrollIndicator={false} 
                                    style={styles.filterPillScroll} 
                                    contentContainerStyle={styles.filterScrollContent}
                                    onScroll={handleScroll('type')}
                                    scrollEventThrottle={16}
                                >
                                    {(['all', 'expense', 'income'] as const).map((type) => (
                                        <TouchableOpacity 
                                            key={type}
                                            style={[styles.filterPill, filterType === type && styles.filterPillActive]} 
                                            onPress={() => setFilterType(type)}
                                        >
                                            <Text style={[styles.filterText, filterType === type && styles.filterTextActive]}>
                                                {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                                {typeScroll.left && (
                                    <View style={[styles.scrollIndicator, styles.scrollIndicatorLeft]}>
                                        <Ionicons name="chevron-back" size={14} color="#bbb" />
                                    </View>
                                )}
                                {typeScroll.right && (
                                    <View style={[styles.scrollIndicator, styles.scrollIndicatorRight]}>
                                        <Ionicons name="chevron-forward" size={14} color="#bbb" />
                                    </View>
                                )}
                            </View>
                        </View>
                        
                        {/* Sort Order Filter */}
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

                        {/* Amount Range Filter */}
                        <View style={styles.filterSection}>
                            <Text style={styles.filterCategoryTitle}>Amount Range (฿)</Text>
                            <View style={styles.amountRangeContainer}>
                                <View style={styles.amountInputWrapper}>
                                    <Text style={styles.amountInputLabel}>Min</Text>
                                    <TextInput
                                        style={styles.amountInput}
                                        placeholder="0"
                                        keyboardType="numeric"
                                        value={minAmount}
                                        onChangeText={setMinAmount}
                                        placeholderTextColor="#999"
                                    />
                                </View>
                                <View style={styles.amountSeparator} />
                                <View style={styles.amountInputWrapper}>
                                    <Text style={styles.amountInputLabel}>Max</Text>
                                    <TextInput
                                        style={styles.amountInput}
                                        placeholder="Any"
                                        keyboardType="numeric"
                                        value={maxAmount}
                                        onChangeText={setMaxAmount}
                                        placeholderTextColor="#999"
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Wallets Filter */}
                        <View style={styles.filterSection}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <Text style={styles.filterCategoryTitle}>Wallets</Text>
                                {selectedWallets.length > 0 && (
                                    <Text style={{ fontSize: 12, color: PRIMARY_GREEN, fontWeight: '600' }}>
                                        {selectedWallets.length} selected
                                    </Text>
                                )}
                            </View>
                            <View style={styles.scrollWrapper}>
                                <ScrollView 
                                    horizontal 
                                    showsHorizontalScrollIndicator={false} 
                                    style={styles.filterPillScroll} 
                                    contentContainerStyle={styles.filterScrollContent}
                                    onScroll={handleScroll('wallet')}
                                    scrollEventThrottle={16}
                                >
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
                                                    { borderColor: wColor + '80' },
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
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                                {walletScroll.left && (
                                    <View style={[styles.scrollIndicator, styles.scrollIndicatorLeft]}>
                                        <Ionicons name="chevron-back" size={14} color="#bbb" />
                                    </View>
                                )}
                                {walletScroll.right && (
                                    <View style={[styles.scrollIndicator, styles.scrollIndicatorRight]}>
                                        <Ionicons name="chevron-forward" size={14} color="#bbb" />
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Category Filter */}
                        <View style={styles.filterSection}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <Text style={styles.filterCategoryTitle}>Category</Text>
                                {selectedCategories.length > 0 && (
                                    <Text style={{ fontSize: 12, color: PRIMARY_GREEN, fontWeight: '600' }}>
                                        {selectedCategories.length} selected
                                    </Text>
                                )}
                            </View>
                            <View style={styles.scrollWrapper}>
                                <ScrollView 
                                    horizontal 
                                    showsHorizontalScrollIndicator={false} 
                                    style={styles.filterIconScroll} 
                                    contentContainerStyle={styles.filterScrollContent}
                                    onScroll={handleScroll('category')}
                                    scrollEventThrottle={16}
                                >
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
                                {categoryScroll.left && (
                                    <View style={[styles.scrollIndicator, styles.scrollIndicatorLeft]}>
                                        <Ionicons name="chevron-back" size={14} color="#bbb" />
                                    </View>
                                )}
                                {categoryScroll.right && (
                                    <View style={[styles.scrollIndicator, styles.scrollIndicatorRight]}>
                                        <Ionicons name="chevron-forward" size={14} color="#bbb" />
                                    </View>
                                )}
                            </View>
                        </View>
                        
                        <TouchableOpacity style={styles.resetFilterButton} onPress={resetFilters}>
                            <Ionicons name="refresh-outline" size={16} color="#C62828" />
                            <Text style={styles.resetFilterText}>Reset Filters</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Modals for Custom Date & Range */}
            {showDatePicker && (
                Platform.OS === 'ios' ? (
                    <Modal transparent visible onRequestClose={() => setShowDatePicker(false)} animationType="slide">
                        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowDatePicker(false)}>
                            <View style={styles.bottomSheet}>
                                <View style={styles.sheetHeader}>
                                    <Text style={styles.sheetTitle}>Select Date</Text>
                                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                                        <Text style={styles.cancelText}>Cancel</Text>
                                    </TouchableOpacity>
                                </View>
                                <DateTimePicker
                                    value={customDate}
                                    mode="date"
                                    display="spinner"
                                    onChange={(_, d) => d && setCustomDate(d)}
                                />
                                <TouchableOpacity 
                                    style={styles.confirmButton}
                                    onPress={() => { setShowDatePicker(false); setTimeFilter('custom'); }}
                                >
                                    <Text style={styles.confirmButtonText}>Confirm Date</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    </Modal>
                ) : (
                    <DateTimePicker
                        value={customDate}
                        mode="date"
                        display="default"
                        onChange={(_, d) => { setShowDatePicker(false); if (d) { setCustomDate(d); setTimeFilter('custom'); } }}
                    />
                )
            )}

            {showRangePicker && (
                <Modal transparent visible onRequestClose={() => setShowRangePicker(false)} animationType="slide">
                    <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowRangePicker(false)}>
                        <View style={styles.bottomSheet}>
                            <View style={styles.sheetHeader}>
                                <Text style={styles.sheetTitle}>Select Date Range</Text>
                                <TouchableOpacity onPress={() => setShowRangePicker(false)}>
                                    <Text style={styles.cancelText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.rangeInputs}>
                                <TouchableOpacity 
                                    onPress={() => setEditingRange('start')}
                                    style={[styles.rangeBox, editingRange === 'start' && styles.rangeBoxActive]}
                                >
                                    <Text style={styles.rangeLabel}>From</Text>
                                    <Text style={[styles.rangeValue, editingRange === 'start' && { color: PRIMARY_GREEN }]}>
                                        {formatDisplayDate(startDate)}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    onPress={() => setEditingRange('end')}
                                    style={[styles.rangeBox, editingRange === 'end' && styles.rangeBoxActive]}
                                >
                                    <Text style={styles.rangeLabel}>To</Text>
                                    <Text style={[styles.rangeValue, editingRange === 'end' && { color: PRIMARY_GREEN }]}>
                                        {formatDisplayDate(endDate)}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <DateTimePicker
                                value={editingRange === 'start' ? startDate : endDate}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={(_, d) => {
                                    if (d) {
                                        if (editingRange === 'start') {
                                            setStartDate(d);
                                            if (d > endDate) setEndDate(d);
                                        } else {
                                            setEndDate(d);
                                            if (d < startDate) setStartDate(d);
                                        }
                                    }
                                    if (Platform.OS !== 'ios') setShowRangePicker(false);
                                }}
                            />

                            <TouchableOpacity 
                                style={styles.confirmButton}
                                onPress={() => { setShowRangePicker(false); setTimeFilter('range'); }}
                            >
                                <Text style={styles.confirmButtonText}>Confirm Range</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </Modal>
            )}

            {/* Content Body */}
            <View style={styles.content}>
                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color={PRIMARY_GREEN} />
                    </View>
                ) : transactions.length === 0 ? (
                    <View style={styles.centerContainer}>
                        <Ionicons name="receipt-outline" size={64} color="#E0E0E0" />
                        <Text style={styles.emptyTitle}>No transactions yet</Text>
                    </View>
                ) : processTransactions().length === 0 ? (
                    <View style={styles.centerContainer}>
                        <Ionicons name="filter-outline" size={64} color="#E0E0E0" />
                        <Text style={styles.emptyTitle}>No matches found</Text>
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
        backgroundColor: '#F2F2F7',
    },
    topControlsContainer: {
        backgroundColor: '#FFF',
        paddingTop: 10,
        paddingBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#EBEBEB',
        zIndex: 10,
    },
    searchSection: {
        paddingHorizontal: 16,
        marginBottom: 10,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F2F2F7',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 16,
        color: '#1a1a1a',
    },
    filterExpandButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#F2F2F7',
    },
    filterExpandText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#1a1a1a',
    },
    filterBadge: {
        backgroundColor: PRIMARY_GREEN,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    filterBadgeText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: 'bold',
    },
    expandedFilters: {
        backgroundColor: '#FFF',
        paddingBottom: 16,
    },
    filterSection: {
        marginBottom: 8,
    },
    filterCategoryTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#888',
        marginLeft: 16,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    scrollWrapper: {
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'center',
    },
    scrollIndicator: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 24,
        zIndex: 5,
        justifyContent: 'center',
        alignItems: 'center',
        pointerEvents: 'none',
    },
    scrollIndicatorLeft: {
        left: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
    },
    scrollIndicatorRight: {
        right: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
    },
    filterPillScroll: {
        paddingLeft: 0,
    },
    filterScrollContent: {
        paddingHorizontal: 16,
        gap: 8,
    },
    filterPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F2F2F7',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#F2F2F7',
        gap: 6,
    },
    filterPillActive: {
        backgroundColor: PRIMARY_GREEN,
        borderColor: PRIMARY_GREEN,
    },
    filterText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    filterTextActive: {
        color: '#FFF',
        fontWeight: '600',
    },
    filterRowContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 16,
        gap: 8,
    },
    filterIconScroll: {
        paddingLeft: 0,
    },
    categoryIconPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F2F2F7',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 16,
        marginRight: 8,
        gap: 8,
        borderWidth: 1,
        borderColor: '#F2F2F7',
    },
    categoryIconPillActive: {
        backgroundColor: PRIMARY_GREEN,
        borderColor: PRIMARY_GREEN,
    },
    resetFilterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        paddingVertical: 8,
        gap: 6,
    },
    resetFilterText: {
        fontSize: 14,
        color: '#C62828',
        fontWeight: '600',
    },
    content: {
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyTitle: {
        fontSize: 18,
        color: '#888',
        marginTop: 16,
        fontWeight: '600',
    },
    listHeader: {
        paddingTop: 16,
        paddingBottom: 8,
        paddingHorizontal: 16,
    },
    transactionCountText: {
        fontSize: 13,
        color: '#888',
        fontWeight: '500',
    },
    listContainer: {
        paddingBottom: 40,
    },
    dateHeaderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#F2F2F7',
    },
    dateHeaderLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E0E0E0',
    },
    sectionHeader: {
        fontSize: 12,
        fontWeight: '700',
        color: '#888',
        textTransform: 'uppercase',
        letterSpacing: 1,
        paddingHorizontal: 12,
    },
    transactionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 8,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    transactionDetails: {
        flex: 1,
        marginLeft: 14,
    },
    transactionName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    transactionNote: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    transactionTime: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
    },
    transactionAmount: {
        fontSize: 16,
        fontWeight: '700',
    },
    walletTagContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 4,
        backgroundColor: '#F5F5F7',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    walletTagText: {
        fontSize: 11,
        color: '#666',
        fontWeight: '500',
    },
    clearFiltersButton: {
        marginTop: 16,
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: '#FFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    clearFiltersText: {
        color: PRIMARY_GREEN,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    bottomSheet: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    sheetTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    cancelText: {
        color: '#888',
        fontSize: 16,
        fontWeight: '500',
    },
    confirmButton: {
        backgroundColor: PRIMARY_GREEN,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 20,
    },
    confirmButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    rangeInputs: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    rangeBox: {
        flex: 1,
        padding: 12,
        backgroundColor: '#F5F5F7',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EBEBEB',
    },
    rangeBoxActive: {
        borderColor: PRIMARY_GREEN,
        backgroundColor: PRIMARY_GREEN + '10',
    },
    rangeLabel: {
        fontSize: 12,
        color: '#888',
        marginBottom: 4,
    },
    rangeValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    amountRangeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        gap: 12,
    },
    amountInputWrapper: {
        flex: 1,
        backgroundColor: '#F2F2F7',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    amountInputLabel: {
        fontSize: 10,
        color: '#888',
        fontWeight: '700',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    amountInput: {
        fontSize: 16,
        color: '#1a1a1a',
        fontWeight: '600',
        padding: 0,
    },
    amountSeparator: {
        width: 10,
        height: 1,
        backgroundColor: '#CCC',
    },
});
