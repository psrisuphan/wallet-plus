import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, StatusBar, ScrollView, TouchableOpacity } from 'react-native';
import Header from '../../components/Header';
import { auth, db } from '../../firebaseConfig';
import { doc, getDoc, collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { useRouter } from 'expo-router';

const PRIMARY_GREEN = '#699E8A';
const SUBTLE_GREEN = '#699E8A20';

export default function HomeScreen() {
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [displayName, setDisplayName] = useState<string | null>(null);
    const [totalBalance, setTotalBalance] = useState(0);
    const [todayChange, setTodayChange] = useState(0);
    const [wallets, setWallets] = useState<any[]>([]);
    const [todayTransactions, setTodayTransactions] = useState<any[]>([]);
    const [walletDailyChanges, setWalletDailyChanges] = useState<{[key: string]: number}>({});
    const [loading, setLoading] = useState(true);
    const [showTopArrow, setShowTopArrow] = useState(false);
    const [showBottomArrow, setShowBottomArrow] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        // Fetch user profile
        const fetchUserData = async () => {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                setProfileImage(data.profilePictureBase64);
                setDisplayName(data.displayName);
            }
        };

        // Listen to wallets for total balance
        const qWallets = query(collection(db, 'wallets'), where('userId', '==', user.uid));
        const unsubscribeWallets = onSnapshot(qWallets, (snapshot) => {
            let total = 0;
            const walletsList: any[] = [];
            snapshot.forEach((doc) => {
                const docData = doc.data() as any;
                const data = { id: doc.id, ...docData };
                total += data.balance || 0;
                walletsList.push(data);
            });
            setTotalBalance(total);
            setWallets(walletsList);
        });

        // Listen to today's transactions
        const start = new Date();
        start.setHours(0, 0, 0, 0);

        const qTransactions = query(
            collection(db, 'transactions'),
            where('userId', '==', user.uid),
            where('date', '>=', Timestamp.fromDate(start)),
            orderBy('date', 'desc')
        );

        const unsubscribeTransactions = onSnapshot(qTransactions, (snapshot) => {
            const list: any[] = [];
            let totalNet = 0;
            const deltas: {[key: string]: number} = {};

            snapshot.forEach((doc) => {
                const data = doc.data();
                const amount = data.amount || 0;
                const type = data.type;
                const walletId = data.walletId;
                
                const net = type === 'income' ? amount : -amount;
                totalNet += net;
                
                if (walletId) {
                    deltas[walletId] = (deltas[walletId] || 0) + net;
                }
                
                list.push({ id: doc.id, ...data });
            });
            
            setTodayTransactions(list);
            setTodayChange(totalNet);
            setWalletDailyChanges(deltas);
            setLoading(false);
        });

        fetchUserData();
        return () => {
            unsubscribeWallets();
            unsubscribeTransactions();
        };
    }, []);

    const handleWalletScroll = (event: any) => {
        const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
        const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
        const isAtTop = contentOffset.y <= 0;

        setShowTopArrow(!isAtTop);
        setShowBottomArrow(contentSize.height > layoutMeasurement.height && !isCloseToBottom);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <Header 
                title="Overview" 
                showLogo={false} 
                profileImage={profileImage}
                onProfilePress={() => {
                    router.push('/(tabs)/settings?edit=true'); 
                }}
            />
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                <View style={styles.content}>
                    
                    {/* Total Balance Section */}
                    <View style={styles.balanceCard}>
                        <View style={styles.balanceHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Ionicons name="cash" size={20} color={PRIMARY_GREEN} />
                                <Text style={styles.balanceLabel}>Total Balance</Text>
                            </View>
                            <Text style={styles.balanceDate}>
                                {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            </Text>
                        </View>
                        <Text style={styles.balanceAmount}>
                            ฿{totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </Text>
                        
                        <View style={styles.separator} />
                        
                        <View style={styles.todayContainer}>
                            <Text style={styles.todayLabel}>Today's Change</Text>
                            <View style={[
                                styles.changeBadge, 
                                { 
                                    backgroundColor: todayChange > 0 ? SUBTLE_GREEN : 
                                                    todayChange < 0 ? '#FFEBEE' : 
                                                    '#F5F5F5' 
                                }
                            ]}>
                                <Ionicons 
                                    name={todayChange > 0 ? "trending-up" : 
                                          todayChange < 0 ? "trending-down" : 
                                          "remove"} 
                                    size={16} 
                                    color={todayChange > 0 ? PRIMARY_GREEN : 
                                           todayChange < 0 ? '#C62828' : 
                                           '#888'} 
                                />
                                <Text style={[
                                    styles.changeAmount, 
                                    { 
                                        color: todayChange > 0 ? PRIMARY_GREEN : 
                                               todayChange < 0 ? '#C62828' : 
                                               '#888' 
                                    }
                                ]}>
                                    {todayChange > 0 ? '+' : todayChange < 0 ? '-' : ''}฿{Math.abs(todayChange).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Wallets Section */}
                    <View style={styles.walletsCard}>
                        <View style={styles.sectionHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Ionicons name="wallet" size={20} color={PRIMARY_GREEN} />
                                <Text style={styles.sectionTitle}>Your Wallets</Text>
                            </View>
                            <TouchableOpacity onPress={() => router.push('/(tabs)/wallet')}>
                                <Text style={styles.viewAllText}>View All</Text>
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.walletsList}>
                            {wallets.length === 0 ? (
                                <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                                    <Ionicons name="card-outline" size={48} color="#EEE" />
                                    <Text style={{ textAlign: 'center', color: '#999', marginTop: 8, marginBottom: 16 }}>
                                        No wallets found
                                    </Text>
                                    <TouchableOpacity 
                                        style={[styles.changeBadge, { backgroundColor: PRIMARY_GREEN, alignSelf: 'center' }]}
                                        onPress={() => router.push('/(tabs)/wallet/add')}
                                    >
                                        <Text style={{ color: '#FFF', fontWeight: '700' }}>Get Started</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View>
                                    {showTopArrow && (
                                        <View style={styles.scrollIndicatorTop}>
                                            <Ionicons name="chevron-up" size={16} color={PRIMARY_GREEN} />
                                        </View>
                                    )}
                                    <ScrollView 
                                        style={{ maxHeight: 200 }} 
                                        showsVerticalScrollIndicator={false}
                                        nestedScrollEnabled={true}
                                        onScroll={handleWalletScroll}
                                        scrollEventThrottle={16}
                                        onContentSizeChange={(w, h) => {
                                            if (h > 200) setShowBottomArrow(true);
                                        }}
                                    >
                                        {wallets
                                            .slice()
                                            .sort((a, b) => {
                                                const deltaA = Math.abs(walletDailyChanges[a.id] || 0);
                                                const deltaB = Math.abs(walletDailyChanges[b.id] || 0);
                                                return deltaB - deltaA;
                                            })
                                            .map((item, index, sortedArr) => (
                                                <React.Fragment key={item.id}>
                                                    <TouchableOpacity 
                                                        style={styles.walletRow}
                                                        onPress={() => {
                                                            router.push({
                                                                pathname: '/(tabs)/wallet',
                                                                params: { search: item.name, ts: Date.now().toString() }
                                                            });
                                                        }}
                                                    >
                                                        <View style={[
                                                            styles.walletIconContainer, 
                                                            { backgroundColor: `${item.color || PRIMARY_GREEN}20` }
                                                        ]}>
                                                            <Ionicons 
                                                                name={(item.icon || 'wallet') as any} 
                                                                size={18} 
                                                                color={item.color || PRIMARY_GREEN} 
                                                            />
                                                        </View>
                                                        <View style={{ flex: 1, justifyContent: 'center' }}>
                                                            <Text style={styles.walletRowName} numberOfLines={1}>
                                                                {item.name}
                                                        </Text>
                                                        {item.detail && (
                                                            <Text style={styles.walletRowDescription} numberOfLines={1}>
                                                                {item.detail}
                                                            </Text>
                                                        )}
                                                    </View>
                                                    <View style={{ alignItems: 'flex-end' }}>
                                                        <Text style={styles.walletRowBalance}>
                                                            ฿{(item.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </Text>
                                                        {walletDailyChanges[item.id] !== undefined && walletDailyChanges[item.id] !== 0 && (
                                                            <Text style={[
                                                                styles.walletRowDelta,
                                                                { color: walletDailyChanges[item.id] > 0 ? PRIMARY_GREEN : '#C62828' }
                                                            ]}>
                                                                {walletDailyChanges[item.id] > 0 ? '+' : '-'}฿{Math.abs(walletDailyChanges[item.id]).toLocaleString(undefined, { minimumFractionDigits: 1 })}
                                                            </Text>
                                                        )}
                                                    </View>
                                                </TouchableOpacity>
                                                {index < sortedArr.length - 1 && (
                                                    <View style={styles.rowDivider} />
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </ScrollView>
                                    {showBottomArrow && (
                                        <View style={styles.scrollIndicatorBottom}>
                                            <Ionicons name="chevron-down" size={16} color={PRIMARY_GREEN} />
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Today's Transactions Section */}
                    <View style={styles.walletsCard}>
                        <View style={styles.sectionHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Ionicons name="time" size={20} color={PRIMARY_GREEN} />
                                <Text style={styles.sectionTitle}>Today's Activity</Text>
                            </View>
                            <TouchableOpacity onPress={() => router.push('/(tabs)/new_transaction')}>
                                <Text style={styles.viewAllText}>View All</Text>
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.walletsList}>
                            <ScrollView 
                                style={{ maxHeight: 250 }} 
                                showsVerticalScrollIndicator={false}
                                nestedScrollEnabled={true}
                            >
                                {todayTransactions.map((item, index) => (
                                    <React.Fragment key={item.id}>
                                        <View style={styles.walletRow}>
                                            <View style={[
                                                styles.walletIconContainer, 
                                                { backgroundColor: item.type === 'income' ? SUBTLE_GREEN : '#FFEBEE' }
                                            ]}>
                                                <Ionicons 
                                                    name={(item.categoryIcon || (item.type === 'income' ? "arrow-up" : "arrow-down")) as any} 
                                                    size={18} 
                                                    color={item.type === 'income' ? PRIMARY_GREEN : '#C62828'} 
                                                />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.walletRowName} numberOfLines={1}>
                                                    {item.category || item.note || 'Transaction'}
                                                </Text>
                                                <Text style={{ fontSize: 12, color: '#999' }}>
                                                    {item.date?.toDate().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                                </Text>
                                            </View>
                                            <Text style={[
                                                styles.walletRowBalance,
                                                { color: item.type === 'income' ? PRIMARY_GREEN : '#C62828' }
                                            ]}>
                                                {item.type === 'income' ? '+' : '-'}฿{(item.amount || 0).toLocaleString()}
                                            </Text>
                                        </View>
                                        {index < todayTransactions.length - 1 && (
                                            <View style={styles.rowDivider} />
                                        )}
                                    </React.Fragment>
                                ))}
                            </ScrollView>
                            {todayTransactions.length === 0 && (
                                <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                                    <Ionicons name="receipt-outline" size={48} color="#EEE" />
                                    <Text style={{ textAlign: 'center', color: '#999', marginTop: 8 }}>
                                        No activity today
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    content: {
        padding: 20,
    },
    balanceCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    balanceHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    balanceLabel: {
        fontSize: 14,
        color: '#666',
        marginLeft: 8,
        fontWeight: '500',
    },
    balanceDate: {
        fontSize: 12,
        color: '#999',
        fontWeight: '500',
    },
    balanceAmount: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 20,
    },
    separator: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginBottom: 16,
    },
    todayContainer: {
        width: '100%',
    },
    walletsCard: {
        backgroundColor: '#fff',
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
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    viewAllText: {
        fontSize: 14,
        color: PRIMARY_GREEN,
        fontWeight: '600',
    },
    walletsList: {
        width: '100%',
    },
    walletRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        gap: 12,
    },
    rowDivider: {
        height: 1,
        backgroundColor: '#F5F5F5',
        marginLeft: 48,
    },
    walletIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    walletRowName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    walletRowDescription: {
        fontSize: 12,
        color: '#999',
        marginTop: 2,
    },
    walletRowBalance: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    walletRowDelta: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 2,
    },
    moreWalletsText: {
        fontSize: 14,
        color: '#999',
        fontWeight: '500',
    },
    todayLabel: {
        fontSize: 12,
        color: '#999',
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: 10,
    },
    changeBadge: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
    },
    changeAmount: {
        fontSize: 16,
        fontWeight: '700',
    },
    scrollIndicatorTop: {
        position: 'absolute',
        top: -12,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 1,
    },
    scrollIndicatorBottom: {
        position: 'absolute',
        bottom: -15,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 1,
    },
});
