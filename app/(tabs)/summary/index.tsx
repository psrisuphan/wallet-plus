import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { StyleSheet, Text, View, StatusBar, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import Header from '../../../components/Header';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, orderBy, Timestamp, or } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { db, auth } from '../../../firebaseConfig';
import { useFocusEffect } from 'expo-router';
import { PRIMARY as PRIMARY_GREEN, PRIMARY_LIGHT as SUBTLE_GREEN, EXPENSE_COLOR, INCOME_COLOR } from '../../../constants/Colors';
import { CATEGORY_COLORS, getCategoryColor, getCategoryIcon } from '../../../constants/Categories';
import type { Transaction, CategoryBreakdown } from '../../../types';

const SCREEN_WIDTH = Dimensions.get('window').width;

type Period = 'today' | 'weekly' | 'monthly' | 'yearly';
type ViewMode = 'overview' | 'comparison';

interface MonthlyData {
    month: string; // e.g. "Apr '25"
    income: number;
    expense: number;
    timestamp: number; // for sorting
}

const SummaryScreen = () => {
    const [period, setPeriod] = useState<Period>('today');
    const [viewMode, setViewMode] = useState<ViewMode>('overview');
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [historyTransactions, setHistoryTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const walletsRef = useRef<any[]>([]);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUserId(user.uid);
            } else {
                setUserId(null);
                setAccessibleWallets([]);
                setTransactions([]);
                setHistoryTransactions([]);
                setLoading(false);
            }
        });
        return () => unsubscribeAuth();
    }, []);

    const getDateRange = useCallback((p: Period): Date => {
        const now = new Date();
        const start = new Date();
        switch (p) {
            case 'today':
                break;
            case 'weekly':
                start.setDate(now.getDate() - 7);
                break;
            case 'monthly':
                start.setMonth(now.getMonth() - 1);
                break;
            case 'yearly':
                start.setFullYear(now.getFullYear() - 1);
                break;
        }
        start.setHours(0, 0, 0, 0);
        return start;
    }, []);
    
    // Listen to wallets for accessible wallets
    const [accessibleWallets, setAccessibleWallets] = useState<any[]>([]);

    useEffect(() => {
        if (!userId) return;

        const qWallets = query(
            collection(db, 'wallets'), 
            or(
                where('userId', '==', userId),
                where('sharedWith', 'array-contains', userId)
            )
        );
        const unsubscribe = onSnapshot(qWallets, (snapshot) => {
            const list: any[] = [];
            snapshot.forEach((doc) => {
                list.push({ id: doc.id, ...doc.data() });
            });
            walletsRef.current = list;
            setAccessibleWallets(list);
        }, (error) => {
            console.error("Summary Wallets Error:", error);
        });
        return () => unsubscribe();
    }, [userId]);

    // Effect for the current period's transactions (Overview)
    useFocusEffect(
        useCallback(() => {
            if (!userId || accessibleWallets.length === 0) {
                setTransactions([]);
                setLoading(false);
                return;
            }

            setLoading(true);
            const startDate = getDateRange(period);

            const q = query(
                collection(db, 'transactions'),
                where('walletId', 'in', accessibleWallets.map(w => w.id).slice(0, 30)),
                where('date', '>=', Timestamp.fromDate(startDate)),
                orderBy('date', 'desc')
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const list: Transaction[] = [];
                snapshot.forEach((doc) => {
                    list.push({ id: doc.id, ...doc.data() } as Transaction);
                });
                setTransactions(list);
                setLoading(false);
            }, (error) => {
                console.error("Summary Transactions Error:", error);
                setLoading(false);
            });

            return () => unsubscribe();
        }, [userId, accessibleWallets, period, getDateRange])
    );

    // Effect for longer-term transactions (Comparison) - last 6 months
    useEffect(() => {
        if (!userId || viewMode !== 'comparison' || accessibleWallets.length === 0) {
            if (viewMode === 'comparison' && accessibleWallets.length === 0) setHistoryTransactions([]);
            return;
        }

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        const q = query(
            collection(db, 'transactions'),
            where('walletId', 'in', accessibleWallets.map(w => w.id).slice(0, 30)),
            where('date', '>=', Timestamp.fromDate(sixMonthsAgo)),
            orderBy('date', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list: Transaction[] = [];
            snapshot.forEach((doc) => {
                list.push({ id: doc.id, ...doc.data() } as Transaction);
            });
            setHistoryTransactions(list);
        }, (error) => {
            console.error("Summary History Error:", error);
        });

        return () => unsubscribe();
    }, [userId, viewMode, accessibleWallets]);

    // Computed stats for Comparison View
    const comparisonData = useMemo(() => {
        const monthsMap: { [key: string]: MonthlyData } = {};
        
        historyTransactions.forEach(t => {
            if (!t.date?.toDate) return;
            const date = t.date.toDate();
            // Format: Apr '25
            const monthLabel = date.toLocaleDateString('en-GB', { month: 'short' }) + " '" + date.getFullYear().toString().slice(-2);
            const key = `${date.getFullYear()}-${date.getMonth()}`;

            if (!monthsMap[key]) {
                monthsMap[key] = {
                    month: monthLabel,
                    income: 0,
                    expense: 0,
                    timestamp: new Date(date.getFullYear(), date.getMonth(), 1).getTime()
                };
            }

            if (t.type === 'income') monthsMap[key].income += t.amount;
            else monthsMap[key].expense += t.amount;
        });

        return Object.values(monthsMap).sort((a, b) => a.timestamp - b.timestamp);
    }, [historyTransactions]);

    // Computed stats for Overview View
    const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const netBalance = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

    // Category breakdown for expenses
    const expenseBreakdown: CategoryBreakdown[] = (() => {
        const map: { [key: string]: { total: number; count: number; icon: string } } = {};
        transactions.filter(t => t.type === 'expense').forEach(t => {
            const name = t.categoryName || 'Other';
            if (!map[name]) map[name] = { total: 0, count: 0, icon: t.categoryIcon || 'help' };
            map[name].total += t.amount;
            map[name].count += 1;
        });
        const items = Object.entries(map)
            .map(([name, data]) => ({
                name,
                icon: data.icon,
                total: data.total,
                count: data.count,
                percentage: totalExpense > 0 ? (data.total / totalExpense) * 100 : 0,
                color: CATEGORY_COLORS[name] || '#CCC',
            }))
            .sort((a, b) => b.total - a.total);
        return items;
    })();

    // Income breakdown
    const incomeBreakdown: CategoryBreakdown[] = (() => {
        const map: { [key: string]: { total: number; count: number; icon: string } } = {};
        transactions.filter(t => t.type === 'income').forEach(t => {
            const name = t.categoryName || 'Other';
            if (!map[name]) map[name] = { total: 0, count: 0, icon: t.categoryIcon || 'help' };
            map[name].total += t.amount;
            map[name].count += 1;
        });
        const items = Object.entries(map)
            .map(([name, data]) => ({
                name,
                icon: data.icon,
                total: data.total,
                count: data.count,
                percentage: totalIncome > 0 ? (data.total / totalIncome) * 100 : 0,
                color: CATEGORY_COLORS[name] || '#CCC',
            }))
            .sort((a, b) => b.total - a.total);
        return items;
    })();

    // Top 5 biggest expenses
    const topExpenses = transactions
        .filter(t => t.type === 'expense')
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

    const maxBarValue = Math.max(totalIncome, totalExpense, 1);
    const periodLabel = period === 'today' ? 'Today' : period === 'weekly' ? 'This Week' : period === 'monthly' ? 'This Month' : 'This Year';

    if (loading) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" />
                <Header title="Summary" showHome={true} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={PRIMARY_GREEN} />
                    <Text style={styles.loadingText}>Crunching your numbers...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <Header title="Summary" showHome={true} />
            <View style={styles.tabContainer}>
                <TouchableOpacity 
                    style={[styles.tab, viewMode === 'overview' && styles.activeTab]} 
                    onPress={() => setViewMode('overview')}
                >
                    <Text style={[styles.tabText, viewMode === 'overview' && styles.activeTabText]}>Net</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.tab, viewMode === 'comparison' && styles.activeTab]} 
                    onPress={() => setViewMode('comparison')}
                >
                    <Text style={[styles.tabText, viewMode === 'comparison' && styles.activeTabText]}>Bar Chart</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                <View style={styles.content}>
                    {viewMode === 'overview' ? (
                        <>
                            {/* Period Selector */}
                            <View style={styles.periodContainer}>
                                {(['today', 'weekly', 'monthly', 'yearly'] as Period[]).map((p) => (
                                    <TouchableOpacity
                                        key={p}
                                        style={[styles.periodButton, period === p && styles.periodButtonActive]}
                                        onPress={() => setPeriod(p)}
                                    >
                                        <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                                            {p === 'today' ? 'Today' : p === 'weekly' ? 'Week' : p === 'monthly' ? 'Month' : 'Year'}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Overview Card */}
                            <View style={styles.card}>
                                <Text style={styles.cardLabel}>{periodLabel}'s Net</Text>
                                <Text style={[
                                    styles.netAmount,
                                    { color: netBalance > 0 ? PRIMARY_GREEN : netBalance < 0 ? EXPENSE_COLOR : '#888' }
                                ]}>
                                    {netBalance > 0 ? '+' : netBalance < 0 ? '-' : ''}฿{Math.abs(netBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </Text>

                                <View style={styles.separator} />

                                <View style={styles.barSection}>
                                    <View style={styles.barRow}>
                                        <View style={styles.barLabelRow}>
                                            <View style={[styles.barDot, { backgroundColor: INCOME_COLOR }]} />
                                            <Text style={styles.barLabel}>Income</Text>
                                        </View>
                                        <Text style={[styles.barValue, { color: INCOME_COLOR }]}>
                                            +฿{totalIncome.toLocaleString()}
                                        </Text>
                                    </View>
                                    <View style={styles.barTrack}>
                                        <View style={[styles.barFill, { width: `${(totalIncome / maxBarValue) * 100}%`, backgroundColor: INCOME_COLOR }]} />
                                    </View>

                                    <View style={[styles.barRow, { marginTop: 16 }]}>
                                        <View style={styles.barLabelRow}>
                                            <View style={[styles.barDot, { backgroundColor: EXPENSE_COLOR }]} />
                                            <Text style={styles.barLabel}>Expense</Text>
                                        </View>
                                        <Text style={[styles.barValue, { color: EXPENSE_COLOR }]}>
                                            -฿{totalExpense.toLocaleString()}
                                        </Text>
                                    </View>
                                    <View style={styles.barTrack}>
                                        <View style={[styles.barFill, { width: `${(totalExpense / maxBarValue) * 100}%`, backgroundColor: EXPENSE_COLOR }]} />
                                    </View>
                                </View>
                            </View>

                            {/* Breakdown Sections */}
                            <View style={styles.card}>
                                <View style={styles.sectionHeader}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Ionicons name="pie-chart-outline" size={18} color={EXPENSE_COLOR} />
                                        <Text style={styles.sectionTitle}>Expense Breakdown</Text>
                                    </View>
                                </View>
                                {expenseBreakdown.length === 0 ? (
                                    <View style={styles.emptyState}>
                                        <Ionicons name="receipt-outline" size={40} color="#E0E0E0" />
                                        <Text style={styles.emptyText}>No expenses {periodLabel.toLowerCase()}</Text>
                                    </View>
                                ) : (
                                    expenseBreakdown.map((cat) => (
                                        <View key={cat.name} style={styles.breakdownRow}>
                                            <View style={[styles.categoryIconBg, { backgroundColor: cat.color + '20' }]}>
                                                <Ionicons name={cat.icon as any} size={16} color={cat.color} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.breakdownName}>{cat.name}</Text>
                                                <View style={styles.breakdownTrack}>
                                                    <View style={[styles.breakdownFill, { width: `${cat.percentage}%`, backgroundColor: cat.color }]} />
                                                </View>
                                            </View>
                                            <Text style={styles.breakdownAmount}>฿{cat.total.toLocaleString()}</Text>
                                        </View>
                                    ))
                                )}
                            </View>

                            <View style={styles.card}>
                                <View style={styles.sectionHeader}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Ionicons name="pie-chart-outline" size={18} color={INCOME_COLOR} />
                                        <Text style={styles.sectionTitle}>Income Breakdown</Text>
                                    </View>
                                </View>
                                {incomeBreakdown.length === 0 ? (
                                    <View style={styles.emptyState}>
                                        <Ionicons name="cash-outline" size={40} color="#E0E0E0" />
                                        <Text style={styles.emptyText}>No income {periodLabel.toLowerCase()}</Text>
                                    </View>
                                ) : (
                                    incomeBreakdown.map((cat) => (
                                        <View key={cat.name} style={styles.breakdownRow}>
                                            <View style={[styles.categoryIconBg, { backgroundColor: INCOME_COLOR + '20' }]}>
                                                <Ionicons name={cat.icon as any} size={16} color={INCOME_COLOR} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.breakdownName}>{cat.name}</Text>
                                                <View style={styles.breakdownTrack}>
                                                    <View style={[styles.breakdownFill, { width: `${cat.percentage}%`, backgroundColor: INCOME_COLOR }]} />
                                                </View>
                                            </View>
                                            <Text style={[styles.breakdownAmount, { color: INCOME_COLOR }]}>฿{cat.total.toLocaleString()}</Text>
                                        </View>
                                    ))
                                )}
                            </View>
                        </>
                    ) : (
                        <>
                            {/* Comparison View */}
                            <View style={styles.card}>
                                <View style={styles.sectionHeader}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Ionicons name="bar-chart-outline" size={20} color={PRIMARY_GREEN} />
                                        <Text style={styles.sectionTitle}>Monthly Comparison</Text>
                                    </View>
                                </View>

                                {comparisonData.length === 0 ? (
                                    <View style={styles.emptyState}>
                                        <Ionicons name="analytics-outline" size={48} color="#EEE" />
                                        <Text style={styles.emptyText}>Not enough data for comparison</Text>
                                    </View>
                                ) : (
                                    <View style={styles.comparisonChart}>
                                        {/* Y-Axis scale would go here, omitting for simplicity */}
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'flex-end', gap: 30, paddingHorizontal: 10, paddingTop: 20 }}>
                                            {comparisonData.map((data) => {
                                                const maxM = Math.max(data.income, data.expense, 1);
                                                const chartHeight = 150;
                                                return (
                                                    <View key={data.month} style={{ alignItems: 'center' }}>
                                                        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: chartHeight }}>
                                                            <View style={[styles.comparisonBar, { height: (data.income / (Math.max(...comparisonData.map(d => Math.max(d.income, d.expense))) || 1)) * chartHeight, backgroundColor: INCOME_COLOR }]} />
                                                            <View style={[styles.comparisonBar, { height: (data.expense / (Math.max(...comparisonData.map(d => Math.max(d.income, d.expense))) || 1)) * chartHeight, backgroundColor: EXPENSE_COLOR }]} />
                                                        </View>
                                                        <Text style={styles.monthLabel}>{data.month}</Text>
                                                    </View>
                                                );
                                            })}
                                        </ScrollView>

                                        <View style={styles.comparisonLegend}>
                                            <View style={styles.legendItem}>
                                                <View style={[styles.legendDot, { backgroundColor: INCOME_COLOR }]} />
                                                <Text style={styles.legendText}>Income</Text>
                                            </View>
                                            <View style={styles.legendItem}>
                                                <View style={[styles.legendDot, { backgroundColor: EXPENSE_COLOR }]} />
                                                <Text style={styles.legendText}>Expense</Text>
                                            </View>
                                        </View>
                                    </View>
                                )}
                            </View>

                            {/* Detailed List */}
                            <View style={styles.card}>
                                <Text style={styles.sectionTitle}>History Details</Text>
                                <View style={{ marginTop: 15 }}>
                                    {[...comparisonData].reverse().map((data) => (
                                        <View key={data.month} style={styles.historyRow}>
                                            <Text style={styles.historyMonth}>{data.month}</Text>
                                            <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                                <Text style={styles.historyIncome}>+฿{data.income.toLocaleString()}</Text>
                                                <Text style={styles.historyExpense}>-฿{data.expense.toLocaleString()}</Text>
                                            </View>
                                            <View style={[styles.historyBadge, { backgroundColor: (data.income - data.expense) >= 0 ? SUBTLE_GREEN : '#FFEBEE' }]}>
                                                <Text style={[styles.historyBadgeText, { color: (data.income - data.expense) >= 0 ? PRIMARY_GREEN : EXPENSE_COLOR }]}>
                                                    ฿{(data.income - data.expense).toLocaleString()}
                                                </Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </>
                    )}
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { fontSize: 15, color: '#999', fontWeight: '500' },
    scrollContainer: { flex: 1 },
    content: { padding: 20, paddingBottom: 40 },
    
    // Tab
    tabContainer: { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    tab: { flex: 1, paddingVertical: 15, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    activeTab: { borderBottomColor: PRIMARY_GREEN },
    tabText: { fontSize: 15, fontWeight: '600', color: '#888' },
    activeTabText: { color: PRIMARY_GREEN },

    // Period selector
    periodContainer: { flexDirection: 'row', backgroundColor: '#E9ECEF', borderRadius: 12, padding: 4, marginBottom: 20 },
    periodButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    periodButtonActive: { backgroundColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    periodText: { fontSize: 15, fontWeight: '600', color: '#888' },
    periodTextActive: { color: '#333' },

    // Cards
    card: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 15, elevation: 2, borderWidth: 1, borderColor: '#F0F0F0' },
    cardLabel: { fontSize: 14, color: '#666', fontWeight: '500', marginBottom: 6 },
    netAmount: { fontSize: 32, fontWeight: 'bold', marginBottom: 16 },
    separator: { height: 1, backgroundColor: '#F0F0F0', marginBottom: 16 },

    // Overview Chart
    barSection: {},
    barRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    barLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    barDot: { width: 10, height: 10, borderRadius: 5 },
    barLabel: { fontSize: 14, fontWeight: '600', color: '#555' },
    barValue: { fontSize: 14, fontWeight: '700' },
    barTrack: { height: 10, backgroundColor: '#F0F0F0', borderRadius: 5, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 5 },

    // Comparison Chart
    comparisonChart: { marginTop: 10 },
    comparisonBar: { width: 14, borderRadius: 3 },
    monthLabel: { fontSize: 11, fontWeight: '600', color: '#999', marginTop: 10 },
    comparisonLegend: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 25 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 12, color: '#666', fontWeight: '500' },

    // Lists
    historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F8F8F8' },
    historyMonth: { fontSize: 14, fontWeight: '700', color: '#333', width: 70 },
    historyIncome: { fontSize: 12, fontWeight: '600', color: INCOME_COLOR },
    historyExpense: { fontSize: 12, fontWeight: '600', color: EXPENSE_COLOR },
    historyBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginLeft: 15, minWidth: 80, alignItems: 'center' },
    historyBadgeText: { fontSize: 12, fontWeight: '700' },

    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a1a' },
    breakdownRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10, borderBottomWidth: 1, borderBottomColor: '#F8F8F8' },
    categoryIconBg: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    breakdownName: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 4 },
    breakdownTrack: { height: 4, backgroundColor: '#F0F0F0', borderRadius: 2, overflow: 'hidden', width: '90%' },
    breakdownFill: { height: '100%', borderRadius: 2 },
    breakdownAmount: { fontSize: 14, fontWeight: '700', color: EXPENSE_COLOR },
    topExpenseRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10, borderBottomWidth: 1, borderBottomColor: '#F8F8F8' },
    rankBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' },
    rankText: { fontSize: 11, fontWeight: '800', color: '#888' },
    topExpenseName: { fontSize: 14, fontWeight: '600', color: '#333' },
    topExpenseNote: { fontSize: 12, color: '#999', marginTop: 2 },
    topExpenseAmount: { fontSize: 14, fontWeight: '700', color: EXPENSE_COLOR },
    emptyState: { alignItems: 'center', paddingVertical: 30, gap: 8 },
    emptyText: { fontSize: 14, color: '#BBB', fontWeight: '500' },
    footerInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 8, paddingBottom: 20 },
    footerText: { fontSize: 13, color: '#AAA', fontWeight: '500' },
});

export default SummaryScreen;
