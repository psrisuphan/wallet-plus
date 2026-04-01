import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, StatusBar, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import Header from '../../../components/Header';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { db, auth } from '../../../firebaseConfig';
import { useFocusEffect } from 'expo-router';

const PRIMARY_GREEN = '#699E8A';
const SUBTLE_GREEN = '#699E8A20';
const EXPENSE_COLOR = '#FF3B30';
const INCOME_COLOR = '#699E8A';
const SCREEN_WIDTH = Dimensions.get('window').width;

// Category color map for breakdown chart
const CATEGORY_COLORS: { [key: string]: string } = {
    'Food': '#FF6B6B',
    'Transport': '#4ECDC4',
    'Shopping': '#FFE66D',
    'Bills': '#A8E6CF',
    'Health': '#FF8B94',
    'Education': '#DDA0DD',
    'Groceries': '#98D8C8',
    'Housing': '#F7DC6F',
    'Utilities': '#BB8FCE',
    'Entertainment': '#85C1E9',
    'Salary': '#82E0AA',
    'Business': '#F8C471',
    'Investment': '#76D7C4',
    'Bonus': '#F1948A',
    'Freelance': '#AED6F1',
    'Other': '#D5DBDB',
};

type Period = 'today' | 'weekly' | 'monthly' | 'yearly';

interface Transaction {
    id: string;
    type: 'income' | 'expense';
    amount: number;
    categoryName: string;
    categoryIcon: string;
    walletName?: string;
    note?: string;
    date: any;
}

interface CategoryBreakdown {
    name: string;
    icon: string;
    total: number;
    count: number;
    percentage: number;
    color: string;
}

const SummaryScreen = () => {
    const [period, setPeriod] = useState<Period>('today');
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    const getDateRange = useCallback((p: Period): Date => {
        const now = new Date();
        const start = new Date();
        switch (p) {
            case 'today':
                // Already at now, just set to start of day
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

    useFocusEffect(
        useCallback(() => {
            const user = auth.currentUser;
            if (!user) return;

            setLoading(true);
            const startDate = getDateRange(period);

            const q = query(
                collection(db, 'transactions'),
                where('userId', '==', user.uid),
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
            });

            return () => unsubscribe();
        }, [period, getDateRange])
    );

    // Computed stats
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

    // Daily averages
    const daysInPeriod = period === 'weekly' ? 7 : period === 'monthly' ? 30 : 365;
    const avgDailyExpense = totalExpense / daysInPeriod;
    const avgDailyIncome = totalIncome / daysInPeriod;

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
            <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                <View style={styles.content}>

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

                        {/* Income vs Expense Bars */}
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
                                <View style={[
                                    styles.barFill,
                                    {
                                        width: `${(totalIncome / maxBarValue) * 100}%`,
                                        backgroundColor: INCOME_COLOR,
                                    }
                                ]} />
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
                                <View style={[
                                    styles.barFill,
                                    {
                                        width: `${(totalExpense / maxBarValue) * 100}%`,
                                        backgroundColor: EXPENSE_COLOR,
                                    }
                                ]} />
                            </View>
                        </View>
                    </View>

                    {/* Quick Stats Row */}
                    <View style={styles.statsRow}>
                        <View style={[styles.statCard, { borderLeftColor: PRIMARY_GREEN }]}>
                            <Ionicons name="wallet-outline" size={20} color={PRIMARY_GREEN} />
                            <Text style={styles.statValue}>
                                {savingsRate >= 0 ? savingsRate.toFixed(1) : '0.0'}%
                            </Text>
                            <Text style={styles.statLabel}>Savings Rate</Text>
                        </View>
                        <View style={[styles.statCard, { borderLeftColor: EXPENSE_COLOR }]}>
                            <Ionicons name="trending-down-outline" size={20} color={EXPENSE_COLOR} />
                            <Text style={styles.statValue}>
                                ฿{avgDailyExpense.toFixed(0)}
                            </Text>
                            <Text style={styles.statLabel}>Avg Daily Exp.</Text>
                        </View>
                        <View style={[styles.statCard, { borderLeftColor: INCOME_COLOR }]}>
                            <Ionicons name="trending-up-outline" size={20} color={INCOME_COLOR} />
                            <Text style={styles.statValue}>
                                ฿{avgDailyIncome.toFixed(0)}
                            </Text>
                            <Text style={styles.statLabel}>Avg Daily Inc.</Text>
                        </View>
                    </View>

                    {/* Expense Breakdown */}
                    <View style={styles.card}>
                        <View style={styles.sectionHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Ionicons name="pie-chart-outline" size={18} color="#333" />
                                <Text style={styles.sectionTitle}>Expense Breakdown</Text>
                            </View>
                            <Text style={styles.transactionCount}>{transactions.filter(t => t.type === 'expense').length} txns</Text>
                        </View>

                        {expenseBreakdown.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Ionicons name="receipt-outline" size={40} color="#E0E0E0" />
                                <Text style={styles.emptyText}>No expenses {periodLabel.toLowerCase()}</Text>
                            </View>
                        ) : (
                            <>
                                {/* Stacked bar */}
                                <View style={styles.stackedBarContainer}>
                                    {expenseBreakdown.map((cat, i) => (
                                        <View
                                            key={cat.name}
                                            style={[
                                                styles.stackedSegment,
                                                {
                                                    width: `${cat.percentage}%`,
                                                    backgroundColor: cat.color,
                                                    borderTopLeftRadius: i === 0 ? 6 : 0,
                                                    borderBottomLeftRadius: i === 0 ? 6 : 0,
                                                    borderTopRightRadius: i === expenseBreakdown.length - 1 ? 6 : 0,
                                                    borderBottomRightRadius: i === expenseBreakdown.length - 1 ? 6 : 0,
                                                }
                                            ]}
                                        />
                                    ))}
                                </View>

                                {/* Category list */}
                                {expenseBreakdown.map((cat) => (
                                    <View key={cat.name} style={styles.breakdownRow}>
                                        <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                                        <View style={[styles.categoryIconBg, { backgroundColor: cat.color + '20' }]}>
                                            <Ionicons name={cat.icon as any} size={16} color={cat.color} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.breakdownName}>{cat.name}</Text>
                                            <Text style={styles.breakdownMeta}>{cat.count} transaction{cat.count !== 1 ? 's' : ''}</Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={styles.breakdownAmount}>฿{cat.total.toLocaleString()}</Text>
                                            <Text style={styles.breakdownPercent}>{cat.percentage.toFixed(1)}%</Text>
                                        </View>
                                    </View>
                                ))}
                            </>
                        )}
                    </View>

                    {/* Income Breakdown */}
                    <View style={styles.card}>
                        <View style={styles.sectionHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Ionicons name="cash-outline" size={18} color="#333" />
                                <Text style={styles.sectionTitle}>Income Breakdown</Text>
                            </View>
                            <Text style={styles.transactionCount}>{transactions.filter(t => t.type === 'income').length} txns</Text>
                        </View>

                        {incomeBreakdown.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Ionicons name="cash-outline" size={40} color="#E0E0E0" />
                                <Text style={styles.emptyText}>No income {periodLabel.toLowerCase()}</Text>
                            </View>
                        ) : (
                            <>
                                {/* Stacked bar */}
                                <View style={[styles.stackedBarContainer, { backgroundColor: '#E8F5E9' }]}>
                                    {incomeBreakdown.map((cat, i) => (
                                        <View
                                            key={cat.name}
                                            style={[
                                                styles.stackedSegment,
                                                {
                                                    width: `${cat.percentage}%`,
                                                    backgroundColor: cat.color,
                                                    borderTopLeftRadius: i === 0 ? 6 : 0,
                                                    borderBottomLeftRadius: i === 0 ? 6 : 0,
                                                    borderTopRightRadius: i === incomeBreakdown.length - 1 ? 6 : 0,
                                                    borderBottomRightRadius: i === incomeBreakdown.length - 1 ? 6 : 0,
                                                }
                                            ]}
                                        />
                                    ))}
                                </View>

                                {/* Category list */}
                                {incomeBreakdown.map((cat) => (
                                    <View key={cat.name} style={styles.breakdownRow}>
                                        <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                                        <View style={[styles.categoryIconBg, { backgroundColor: cat.color + '20' }]}>
                                            <Ionicons name={cat.icon as any} size={16} color={cat.color} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.breakdownName}>{cat.name}</Text>
                                            <Text style={styles.breakdownMeta}>{cat.count} transaction{cat.count !== 1 ? 's' : ''}</Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={[styles.breakdownAmount, { color: INCOME_COLOR }]}>฿{cat.total.toLocaleString()}</Text>
                                            <Text style={styles.breakdownPercent}>{cat.percentage.toFixed(1)}%</Text>
                                        </View>
                                    </View>
                                ))}
                            </>
                        )}
                    </View>

                    {/* Top Expenses */}
                    {topExpenses.length > 0 && (
                        <View style={styles.card}>
                            <View style={styles.sectionHeader}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Ionicons name="flame-outline" size={18} color={EXPENSE_COLOR} />
                                    <Text style={styles.sectionTitle}>Top Expenses</Text>
                                </View>
                            </View>
                            {topExpenses.map((t, index) => (
                                <View key={t.id} style={styles.topExpenseRow}>
                                    <View style={styles.rankBadge}>
                                        <Text style={styles.rankText}>{index + 1}</Text>
                                    </View>
                                    <View style={[styles.topExpenseIcon, { backgroundColor: '#FFEBEE' }]}>
                                        <Ionicons name={(t.categoryIcon || 'help') as any} size={18} color={EXPENSE_COLOR} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.topExpenseName}>{t.categoryName || 'Unknown'}</Text>
                                        <Text style={styles.topExpenseNote} numberOfLines={1}>
                                            {t.note || t.walletName || ''}
                                            {t.date?.toDate && ` • ${t.date.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                                        </Text>
                                    </View>
                                    <Text style={[styles.topExpenseAmount]}>
                                        -฿{t.amount.toLocaleString()}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Transactions count footer */}
                    <View style={styles.footerInfo}>
                        <Ionicons name="information-circle-outline" size={16} color="#AAA" />
                        <Text style={styles.footerText}>
                            Based on {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} {periodLabel.toLowerCase()}
                        </Text>
                    </View>

                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    scrollContainer: {
        flex: 1,
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 15,
        color: '#999',
        fontWeight: '500',
    },

    // Period selector
    periodContainer: {
        flexDirection: 'row',
        backgroundColor: '#E9ECEF',
        borderRadius: 12,
        padding: 4,
        marginBottom: 20,
    },
    periodButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 10,
    },
    periodButtonActive: {
        backgroundColor: '#FFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    periodText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#888',
    },
    periodTextActive: {
        color: '#333',
    },

    // Cards
    card: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    cardLabel: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
        marginBottom: 6,
    },
    netAmount: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    separator: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginBottom: 16,
    },

    // Bar chart
    barSection: {},
    barRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    barLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    barDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    barLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#555',
    },
    barValue: {
        fontSize: 14,
        fontWeight: '700',
    },
    barTrack: {
        height: 10,
        backgroundColor: '#F0F0F0',
        borderRadius: 5,
        overflow: 'hidden',
        marginBottom: 4,
    },
    barFill: {
        height: '100%',
        borderRadius: 5,
    },

    // Stat cards
    statsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 16,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 14,
        alignItems: 'center',
        gap: 6,
        borderLeftWidth: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 1,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1a1a1a',
    },
    statLabel: {
        fontSize: 11,
        color: '#999',
        fontWeight: '500',
        textAlign: 'center',
    },

    // Section headers
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    transactionCount: {
        fontSize: 13,
        color: '#999',
        fontWeight: '500',
    },

    // Stacked bar
    stackedBarContainer: {
        flexDirection: 'row',
        height: 12,
        borderRadius: 6,
        overflow: 'hidden',
        backgroundColor: '#FFEBEE',
        marginBottom: 20,
    },
    stackedSegment: {
        height: '100%',
    },

    // Breakdown rows
    breakdownRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        gap: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F8F8F8',
    },
    categoryDot: {
        width: 4,
        height: 28,
        borderRadius: 2,
    },
    categoryIconBg: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    breakdownName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    breakdownMeta: {
        fontSize: 12,
        color: '#AAA',
        marginTop: 2,
    },
    breakdownAmount: {
        fontSize: 14,
        fontWeight: '700',
        color: EXPENSE_COLOR,
    },
    breakdownPercent: {
        fontSize: 12,
        color: '#999',
        marginTop: 2,
    },

    // Top expenses
    topExpenseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        gap: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F8F8F8',
    },
    rankBadge: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#F0F0F0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    rankText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#888',
    },
    topExpenseIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    topExpenseName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    topExpenseNote: {
        fontSize: 12,
        color: '#999',
        marginTop: 2,
    },
    topExpenseAmount: {
        fontSize: 14,
        fontWeight: '700',
        color: EXPENSE_COLOR,
    },

    // Empty & footer
    emptyState: {
        alignItems: 'center',
        paddingVertical: 30,
        gap: 8,
    },
    emptyText: {
        fontSize: 14,
        color: '#BBB',
        fontWeight: '500',
    },
    footerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingTop: 8,
        paddingBottom: 20,
    },
    footerText: {
        fontSize: 13,
        color: '#AAA',
        fontWeight: '500',
    },
});

export default SummaryScreen;
