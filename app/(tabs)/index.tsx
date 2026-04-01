import { StyleSheet, Text, View, StatusBar, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { useEffect, useState } from 'react';
import Header from '../../components/Header';
import { auth, db } from '../../firebaseConfig';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [displayName, setDisplayName] = useState<string | null>(null);
    const [totalBalance, setTotalBalance] = useState(0);
    const [todayChange, setTodayChange] = useState(0);
    const [wallets, setWallets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
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
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const qTransactions = query(
            collection(db, 'transactions'),
            where('userId', '==', user.uid),
            where('date', '>=', startOfDay)
        );

        const unsubscribeTransactions = onSnapshot(qTransactions, (snapshot) => {
            let change = 0;
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (data.type === 'income') change += data.amount || 0;
                else if (data.type === 'expense') change -= data.amount || 0;
            });
            setTodayChange(change);
            setLoading(false);
        });

        fetchUserData();
        return () => {
            unsubscribeWallets();
            unsubscribeTransactions();
        };
    }, []);

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
                                <Ionicons name="wallet" size={20} color="#2E7D32" />
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
                                    backgroundColor: todayChange > 0 ? '#E8F5E9' : 
                                                    todayChange < 0 ? '#FFEBEE' : 
                                                    '#F5F5F5' 
                                }
                            ]}>
                                <Ionicons 
                                    name={todayChange > 0 ? "trending-up" : 
                                          todayChange < 0 ? "trending-down" : 
                                          "remove"} 
                                    size={16} 
                                    color={todayChange > 0 ? '#2E7D32' : 
                                           todayChange < 0 ? '#C62828' : 
                                           '#888'} 
                                />
                                <Text style={[
                                    styles.changeAmount, 
                                    { 
                                        color: todayChange > 0 ? '#2E7D32' : 
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
                    <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Your Wallets</Text>
                            <TouchableOpacity onPress={() => router.push('/(tabs)/wallet')}>
                                <Text style={styles.viewAllText}>View All</Text>
                            </TouchableOpacity>
                        </View>
                        
                        <FlatList
                            data={wallets}
                            keyExtractor={(item) => item.id}
                            scrollEnabled={false}
                            contentContainerStyle={styles.walletsList}
                            renderItem={({ item }) => (
                                <TouchableOpacity 
                                    style={styles.walletCard}
                                    onPress={() => {
                                        // TODO: navigate to wallet transactions view
                                    }}
                                >
                                    <View style={styles.walletCardHeader}>
                                        <View style={styles.walletIconContainer}>
                                            <Ionicons name="card" size={18} color="#2E7D32" />
                                        </View>
                                        <Text style={styles.walletCardName} numberOfLines={1}>
                                            {item.name}
                                        </Text>
                                        <Text style={styles.walletCardBalance}>
                                            ฿{(item.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                        />
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
    scrollContent: {
        paddingBottom: 40,
    },
    content: {
        padding: 20,
    },
    welcomeText: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
        fontWeight: '500',
    },
    balanceCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        marginBottom: 24,
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
    sectionContainer: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    viewAllText: {
        fontSize: 14,
        color: '#2E7D32',
        fontWeight: '600',
    },
    walletsList: {
        paddingHorizontal: 4,
        gap: 12,
    },
    walletCard: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#F0F0F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    walletCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    walletIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#F1F8E9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    walletCardName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        flex: 1,
    },
    walletCardBalance: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a1a',
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
});
