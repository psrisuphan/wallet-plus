import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Text, StyleSheet, View, FlatList, TextInput, TouchableOpacity, Modal, Alert, ActivityIndicator, StatusBar, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { collection, query, where, onSnapshot, addDoc, updateDoc, getDoc, deleteDoc, doc, writeBatch, getDocs, or, arrayRemove } from 'firebase/firestore';
import { db, auth } from '../../../firebaseConfig';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import Header from '../../../components/Header';
import { PRIMARY as WHITE_GREEN, EXPENSE_COLOR, INCOME_COLOR } from '../../../constants/Colors';
import { Wallet, Transaction } from '../../../types';
import { HapticFeedback } from '../../../utils/haptics';

const WalletScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ search?: string, ts?: string }>();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortType, setSortType] = useState<'name' | 'balanceAsc' | 'balanceDesc'>('name');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedWalletForTransactions, setSelectedWalletForTransactions] = useState<Wallet | null>(null);
  const [isTransactionsModalVisible, setIsTransactionsModalVisible] = useState(false);
  const [walletTransactions, setWalletTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [transactionSort, setTransactionSort] = useState<'newest' | 'oldest'>('newest');
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'day' | 'week' | 'month'>('all');
  
  // Shared Wallet States
  const [isJoinModalVisible, setIsJoinModalVisible] = useState(false);
  const [walletIdToJoin, setWalletIdToJoin] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
        setWallets([]); // Clear wallets if no user is logged in
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Handle incoming search from deep linking
  useEffect(() => {
    if (params.search) {
      setSearchQuery(params.search);
    }
  }, [params.search, params.ts]);

  // Clear search whenever the screen loses focus (user navigates to another tab)
  useFocusEffect(
    useCallback(() => {
      // Component is focused
      return () => {
        // Component is blurred
        setSearchQuery('');
      };
    }, [])
  );

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    // Fetch wallets where user is OWNER OR a shared member
    const q = query(
      collection(db, 'wallets'),
      or(
        where('userId', '==', userId),
        where('sharedWith', 'array-contains', userId)
      )
    );

    const unsubscribeFirestore = onSnapshot(q, (snapshot) => {
      const walletsData: Wallet[] = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Wallet[];

      setWallets(walletsData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching wallets:', error);
      Alert.alert('Error', 'Failed to load wallets.');
      setLoading(false);
    });

    return () => unsubscribeFirestore();
  }, [userId]);

  useEffect(() => {
    if (!selectedWalletForTransactions) {
      setWalletTransactions([]);
      return;
    }

    setLoadingTransactions(true);
    const q = query(
      collection(db, 'transactions'),
      where('walletId', '==', selectedWalletForTransactions.id)
    );

    const unsubscribeTransactions = onSnapshot(q, (snapshot) => {
      const transactionsData: Transaction[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Transaction[];
      
      // Sort based on transactionSort state
      transactionsData.sort((a, b) => {
        const dateA = a.date?.seconds || 0;
        const dateB = b.date?.seconds || 0;
        return transactionSort === 'newest' ? dateB - dateA : dateA - dateB;
      });
      
      setWalletTransactions(transactionsData);
      setLoadingTransactions(false);
    }, (error) => {
      console.error('Error fetching transactions:', error);
      setLoadingTransactions(false);
    });

    return () => unsubscribeTransactions();
  }, [selectedWalletForTransactions, userId, transactionSort]);

  // Handle transaction filtering based on selected date range
  const filteredTransactions = useMemo(() => {
    if (transactionFilter === 'all') return walletTransactions;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    // Calculate start of week (Monday)
    const dayOfWeek = now.getDay(); // 0 is Sunday
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); 
    const startOfWeek = new Date(now.setDate(diff)).setHours(0, 0, 0, 0);
    
    // Reset date for month calculation
    const currentNow = new Date();
    const startOfMonth = new Date(currentNow.getFullYear(), currentNow.getMonth(), 1).getTime();

    return walletTransactions.filter(item => {
      if (!item.date?.seconds) return false;
      const transTime = item.date.seconds * 1000;

      if (transactionFilter === 'day') return transTime >= startOfToday;
      if (transactionFilter === 'week') return transTime >= startOfWeek;
      if (transactionFilter === 'month') return transTime >= startOfMonth;
      return true;
    });
  }, [walletTransactions, transactionFilter]);

  // Handle Search and Sorting
  const filteredAndSortedWallets = useMemo(() => {
    let result = [...wallets];
    
    // Search filter
    if (searchQuery.trim() !== '') {
      result = result.filter(wallet => 
        wallet.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort logic
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

  const handleJoinWallet = async () => {
    if (!walletIdToJoin.trim()) {
      Alert.alert('Error', 'Please enter a Wallet ID.');
      return;
    }

    if (!userId) return;

    setJoining(true);
    try {
      const walletRef = doc(db, 'wallets', walletIdToJoin.trim());
      const walletSnap = await getDoc(walletRef);

      if (!walletSnap.exists()) {
        HapticFeedback.error();
        Alert.alert('Error', 'Wallet not found. Please check the ID.');
        setJoining(false);
        return;
      }

      const wallet = walletSnap.data() as Wallet;
      
      // Check if already a member or owner
      if (wallet.userId === userId || wallet.sharedWith?.includes(userId)) {
        HapticFeedback.warning();
        Alert.alert('Info', 'You are already a member of this wallet!');
        setIsJoinModalVisible(false);
        setWalletIdToJoin('');
        setJoining(false);
        return;
      }

      // Add user to sharedWith
      const currentShared = wallet.sharedWith || [];
      await updateDoc(walletRef, {
        sharedWith: [...currentShared, userId]
      } as any);

      Alert.alert('Success', `Joined "${wallet.name}" successfully!`);
      HapticFeedback.success();
      setIsJoinModalVisible(false);
      setWalletIdToJoin('');
    } catch (error) {
      console.error('Error joining wallet:', error);
      HapticFeedback.error();
      Alert.alert('Error', 'Failed to join wallet. Please try again.');
    } finally {
      setJoining(false);
    }
  };
  const handleDeleteWallet = (walletId: string) => {
    HapticFeedback.warning();
    Alert.alert(
      'Delete Wallet',
      'Are you sure you want to delete this wallet? All related transactions will also be permanently deleted.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const batch = writeBatch(db);

              // 1. Query all transactions associated with this wallet
              const transactionsQuery = query(
                collection(db, 'transactions'), 
                where('walletId', '==', walletId)
              );
              const transactionsSnapshot = await getDocs(transactionsQuery);

              // 2. Add each transaction deletion to the batch
              transactionsSnapshot.forEach((transactionDoc) => {
                batch.delete(transactionDoc.ref);
              });

              // 3. Add the wallet deletion to the batch
              batch.delete(doc(db, 'wallets', walletId));

              // 4. Commit all deletions atomically
              await batch.commit();

              HapticFeedback.success();
              Alert.alert('Success', 'Wallet and its transactions deleted successfully!');
            } catch (error) {
              console.error('Error deleting wallet:', error);
              Alert.alert('Error', 'Failed to delete wallet and associated transactions.');
            } finally {
              setLoading(false);
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  const handleLeaveWallet = (walletId: string) => {
    HapticFeedback.warning();
    Alert.alert(
      "Leave Wallet",
      "Are you sure you want to leave this shared wallet? The wallet will still exist for other members, but you will no longer have access to its history.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Leave", 
          style: "destructive", 
          onPress: async () => {
            try {
              if (!userId) return;
              const walletRef = doc(db, 'wallets', walletId);
              await updateDoc(walletRef, {
                sharedWith: arrayRemove(userId)
              });
              HapticFeedback.success();
              Alert.alert("Success", "You have left the wallet.");
            } catch (error) {
              console.error('Error leaving wallet:', error);
              HapticFeedback.error();
              Alert.alert('Error', 'Could not leave the wallet.');
            }
          } 
        }
      ]
    );
  };

  const openEditPage = (walletId: string) => {
    router.push({ pathname: '/(tabs)/wallet/add', params: { id: walletId } });
  };

  const openAddPage = () => {
    router.push('/(tabs)/wallet/add');
  };

  const openTransactions = (wallet: Wallet) => {
    HapticFeedback.selection();
    setSelectedWalletForTransactions(wallet);
    setIsTransactionsModalVisible(true);
  };

  const renderTransactionItem = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionItem}>
      <View style={[styles.transactionIcon, { backgroundColor: item.type === 'expense' ? EXPENSE_COLOR + '15' : WHITE_GREEN + '15' }]}>
        <Ionicons name={item.categoryIcon as any} size={20} color={item.type === 'expense' ? EXPENSE_COLOR : WHITE_GREEN} />
      </View>
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionCategory}>{item.categoryName}</Text>
        {item.note ? <Text style={styles.transactionNote} numberOfLines={1}>{item.note}</Text> : null}
      </View>
      <View style={styles.transactionAmountContainer}>
        <Text style={[styles.transactionAmount, { color: item.type === 'expense' ? EXPENSE_COLOR : WHITE_GREEN }]}>
          {item.type === 'expense' ? '-' : '+'}฿{item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </Text>
        <Text style={styles.transactionDate}>
          {item.userName && ((selectedWalletForTransactions?.sharedWith?.length || 0) > 0 || item.userId !== selectedWalletForTransactions?.userId) ? (
            <Text style={{ fontWeight: '600', color: WHITE_GREEN }}>{item.userName} • </Text>
          ) : null}
          {item.date?.seconds ? (
            `${new Date(item.date.seconds * 1000).toLocaleDateString('en-US', { 
              day: 'numeric', 
              month: 'short' 
            })} ${new Date(item.date.seconds * 1000).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            })}`
          ) : 'Pending'}
        </Text>
      </View>
    </View>
  );

  const renderWalletItem = ({ item }: { item: Wallet }) => (
    <TouchableOpacity 
      style={styles.walletItem}
      onPress={() => openTransactions(item)}
      activeOpacity={0.7}
    >
      <View style={styles.walletHeader}>
        <View style={[styles.iconContainer, { backgroundColor: `${item.color?.length === 9 ? item.color.slice(0, 7) : (item.color || WHITE_GREEN)}15` }]}>
          <Ionicons name={item.icon as any || 'wallet'} size={24} color={item.color || WHITE_GREEN} />
        </View>
        <View style={styles.walletInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.walletName}>{item.name}</Text>
            {item.sharedWith && item.sharedWith.length > 0 && (
              <View style={styles.sharedBadge}>
                <Ionicons name="people" size={10} color={WHITE_GREEN} />
                <Text style={styles.sharedBadgeText}>Shared</Text>
              </View>
            )}
          </View>
          {item.detail ? <Text style={styles.walletDetail} numberOfLines={1}>{item.detail}</Text> : null}
        </View>
        {item.userId === userId ? (
          <View style={styles.actionButtons}>
            <TouchableOpacity onPress={() => openEditPage(item.id)} style={styles.actionIconButton}>
              <Ionicons name="create" size={20} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteWallet(item.id)} style={[styles.actionIconButton, { marginLeft: 8 }]}>
              <Ionicons name="trash" size={20} color="#DC3545" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.actionButtons}>
            <TouchableOpacity onPress={() => handleLeaveWallet(item.id)} style={styles.actionIconButton}>
              <Ionicons name="log-out" size={20} color="#DC3545" />
            </TouchableOpacity>
          </View>
        )}
      </View>
      <View style={styles.walletBody}>
        <Text style={styles.balanceLabel}>Balance</Text>
        <Text style={[styles.walletBalance, { color: item.color }]}>฿{item.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={WHITE_GREEN} />
        <Text style={{ color: WHITE_GREEN, marginTop: 10 }}>Loading wallets...</Text>
      </View>
    );
  }

  if (!userId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.noUserText}>Please log in to view your wallets.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Header 
        title="My Wallets" 
        showHome={true} 
        showAdd={true} 
        onAddPress={openAddPage} 
      />
      <View style={styles.content}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <View style={[styles.searchContainer, { marginBottom: 0, flex: 1 }]}>
            <Ionicons name="search-outline" size={20} color="#888" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search wallets..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#AAA"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#AAA" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity 
            style={styles.joinButton} 
            onPress={() => {
              setIsJoinModalVisible(true);
              HapticFeedback.selection();
            }}
          >
            <Ionicons name="people-outline" size={22} color={WHITE_GREEN} />
            <Text style={styles.joinButtonText}>Join</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sortContainer}>
          <Text style={styles.sortLabel}>Sort by:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortScroll}>
            <TouchableOpacity 
              style={[styles.sortButton, sortType === 'name' && styles.sortButtonActive]}
              onPress={() => {
                setSortType('name');
                HapticFeedback.light();
              }}
            >
              <Text style={[styles.sortButtonText, sortType === 'name' && styles.sortButtonTextActive]}>Name</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.sortButton, sortType === 'balanceDesc' && styles.sortButtonActive]}
              onPress={() => {
                setSortType('balanceDesc');
                HapticFeedback.light();
              }}
            >
              <Ionicons name="arrow-down" size={12} color={sortType === 'balanceDesc' ? WHITE_GREEN : '#888'} />
              <Text style={[styles.sortButtonText, sortType === 'balanceDesc' && styles.sortButtonTextActive]}>Highest Balance</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.sortButton, sortType === 'balanceAsc' && styles.sortButtonActive]}
              onPress={() => {
                setSortType('balanceAsc');
                HapticFeedback.light();
              }}
            >
              <Ionicons name="arrow-up" size={12} color={sortType === 'balanceAsc' ? WHITE_GREEN : '#888'} />
              <Text style={[styles.sortButtonText, sortType === 'balanceAsc' && styles.sortButtonTextActive]}>Lowest Balance</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <FlatList
          data={filteredAndSortedWallets}
          renderItem={renderWalletItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            filteredAndSortedWallets.length > 0 ? (
              <View style={styles.listHeader}>
                <Text style={styles.walletCountText}>
                  {searchQuery 
                    ? `Searching: ${filteredAndSortedWallets.length} found` 
                    : `${wallets.length} ${wallets.length === 1 ? 'wallet' : 'wallets'} found`}
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name={searchQuery ? "search-outline" : "wallet-outline"} size={80} color="#D1D1D1" />
              <Text style={styles.emptyListText}>
                {searchQuery ? `No wallets matching "${searchQuery}"` : "No wallets found."}
              </Text>
              {!searchQuery && (
                <TouchableOpacity onPress={openAddPage}>
                  <Text style={styles.addOneText}>Add your first wallet!</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          ListFooterComponent={
            filteredAndSortedWallets.length > 0 && !searchQuery ? (
              <TouchableOpacity style={styles.footerAddLink} onPress={openAddPage}>
                <Text style={styles.footerAddTitle}>Want to add a new wallet?</Text>
                <Text style={styles.footerAddSubtitle}>Click here!</Text>
              </TouchableOpacity>
            ) : null
          }
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Transactions Modal */}
      <Modal
        visible={isTransactionsModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsTransactionsModalVisible(false)}
      >
        <View style={styles.modalFullContent}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderTop}>
              <View style={[styles.modalWalletBadge, { backgroundColor: selectedWalletForTransactions?.color + '15' }]}>
                <Ionicons name={selectedWalletForTransactions?.icon as any} size={20} color={selectedWalletForTransactions?.color} />
                <Text style={[styles.modalWalletName, { color: selectedWalletForTransactions?.color }]}>
                  {selectedWalletForTransactions?.name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsTransactionsModalVisible(false)} style={styles.modalCloseButton}>
                <Ionicons name="close-circle" size={28} color="#CCC" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBalanceSection}>
              <Text style={styles.modalBalanceLabel}>Current Balance</Text>
              <Text style={[styles.modalBalanceAmount, { color: selectedWalletForTransactions?.color }]}>
                ฿{selectedWalletForTransactions?.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Text>
            </View>

            {/* Share Wallet ID Section (Only for Owner) */}
            {selectedWalletForTransactions?.userId === userId && (
              <View style={styles.shareSection}>
                <Text style={styles.shareLabel}>Wallet ID (Share to invite others)</Text>
                <View style={styles.idContainer}>
                  <Text style={styles.walletIdText} numberOfLines={1} ellipsizeMode="middle">
                    {selectedWalletForTransactions?.id}
                  </Text>
                  <TouchableOpacity 
                    style={[styles.copyButton, { backgroundColor: selectedWalletForTransactions?.color }]}
                    onPress={() => {
                      const Clipboard = require('react-native').Clipboard;
                      Clipboard.setString(selectedWalletForTransactions?.id || '');
                      Alert.alert('Copied', 'Wallet ID copied to clipboard!');
                    }}
                  >
                    <Ionicons name="copy-outline" size={16} color="#FFF" />
                    <Text style={styles.copyButtonText}>Copy</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          <View style={styles.modalBody}>
            <View style={styles.modalFilterContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {(['all', 'day', 'week', 'month'] as const).map((filter) => (
                  <TouchableOpacity
                    key={filter}
                    style={[
                      styles.modalFilterButton,
                      transactionFilter === filter && styles.modalFilterButtonActive
                    ]}
                    onPress={() => {
                      setTransactionFilter(filter);
                      HapticFeedback.light();
                    }}
                  >
                    <Text style={[
                      styles.modalFilterButtonText,
                      transactionFilter === filter && styles.modalFilterButtonTextActive
                    ]}>
                      {filter === 'all' ? 'All Time' : filter === 'day' ? 'Today' : filter === 'week' ? 'This Week' : 'This Month'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.modalBodyHeader}>
              <View>
                <Text style={styles.modalSectionTitle}>Transactions</Text>
                {!loadingTransactions && (
                  <Text style={styles.modalSubTitle}>
                    {filteredTransactions.length} {filteredTransactions.length === 1 ? 'transaction' : 'transactions'} found
                  </Text>
                )}
              </View>
              <TouchableOpacity 
                style={styles.modalSortToggle} 
                onPress={() => {
                  setTransactionSort(prev => prev === 'newest' ? 'oldest' : 'newest');
                  HapticFeedback.light();
                }}
              >
                <Ionicons 
                  name={transactionSort === 'newest' ? "arrow-down" : "arrow-up"} 
                  size={14} 
                  color={WHITE_GREEN} 
                />
                <Text style={styles.modalSortToggleText}>
                  {transactionSort === 'newest' ? 'Newest' : 'Oldest'}
                </Text>
              </TouchableOpacity>
            </View>
            {loadingTransactions ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="small" color={WHITE_GREEN} />
                <Text style={styles.modalLoadingText}>Loading transactions...</Text>
              </View>
            ) : filteredTransactions.length > 0 ? (
              <FlatList
                data={filteredTransactions}
                renderItem={renderTransactionItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
              />
            ) : (
              <View style={styles.modalEmpty}>
                <Ionicons name="receipt-outline" size={60} color="#EEE" />
                <Text style={styles.modalEmptyText}>
                  {transactionFilter === 'all' 
                    ? 'No transactions for this wallet yet.' 
                    : `No transactions found for this ${transactionFilter === 'day' ? 'day' : transactionFilter}.`}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Join Wallet Modal */}
      <Modal
        visible={isJoinModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsJoinModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { padding: 30 }]}>
            <View style={styles.joinHeaderIcon}>
              <Ionicons name="people-circle" size={60} color={WHITE_GREEN} />
            </View>
            <Text style={styles.modalTitle}>Join Shared Wallet</Text>
            <Text style={styles.modalSubMessage}>
              Enter the unique Wallet ID shared by the owner to gain access.
            </Text>
            
            <TextInput
              style={styles.joinInput}
              placeholder="Paste Wallet ID here..."
              value={walletIdToJoin}
              onChangeText={setWalletIdToJoin}
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor="#AAA"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => {
                  setIsJoinModalVisible(false);
                  setWalletIdToJoin('');
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: WHITE_GREEN }]} 
                onPress={handleJoinWallet}
                disabled={joining}
              >
                {joining ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.buttonText}>Join Now</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // White background
  },
  content: {
    flex: 1,
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F3F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    padding: 0, // Remove default padding on Android
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sortLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginRight: 10,
  },
  sortScroll: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  sortButtonActive: {
    backgroundColor: WHITE_GREEN + '10',
    borderColor: WHITE_GREEN,
  },
  sortButtonText: {
    fontSize: 12,
    color: '#888',
    marginLeft: 4,
    fontWeight: '500',
  },
  sortButtonTextActive: {
    color: WHITE_GREEN,
    fontWeight: '700',
  },
  noUserText: {
    fontSize: 18,
    color: '#555',
    textAlign: 'center',
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  walletItem: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletInfo: {
    flex: 1,
    marginLeft: 15,
  },
  walletName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  walletDetail: {
    fontSize: 13,
    color: '#777',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconButton: {
    padding: 8,
  },
  walletBody: {
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  walletBalance: {
    fontSize: 20,
    fontWeight: '700',
  },
  listHeader: {
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  walletCountText: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
  },
  footerAddLink: {
    marginVertical: 20,
    padding: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CCC',
    borderRadius: 15,
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  footerAddTitle: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  footerAddSubtitle: {
    fontSize: 15,
    color: WHITE_GREEN,
    fontWeight: 'bold',
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
  },
  emptyListText: {
    fontSize: 18,
    color: '#888',
    marginTop: 15,
  },
  addOneText: {
    fontSize: 16,
    color: WHITE_GREEN,
    fontWeight: 'bold',
    marginTop: 8,
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#F9F9F9',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
  },
  cancelButton: {
    backgroundColor: '#6C757D', // Grey for cancel
  },
  saveButton: {
    backgroundColor: WHITE_GREEN,
  },
  // Modal Styles
  modalFullContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    padding: 24,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalWalletBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  modalWalletName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBalanceSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  shareSection: {
    marginTop: 10,
    backgroundColor: '#F1F3F5',
    padding: 12,
    borderRadius: 12,
  },
  shareLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  idContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  walletIdText: {
    flex: 1,
    fontSize: 13,
    color: '#333',
    fontFamily: 'monospace',
    backgroundColor: '#E9ECEF',
    padding: 6,
    borderRadius: 6,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  copyButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE_GREEN + '15',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: WHITE_GREEN + '30',
  },
  joinButtonText: {
    color: WHITE_GREEN,
    fontWeight: 'bold',
    fontSize: 16,
  },
  sharedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE_GREEN + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  sharedBadgeText: {
    fontSize: 10,
    color: WHITE_GREEN,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  joinHeaderIcon: {
    alignItems: 'center',
    marginBottom: 10,
  },
  modalSubMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  joinInput: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 10,
    padding: 15,
    fontSize: 14,
    color: '#333',
    fontFamily: 'monospace',
    marginBottom: 25,
    textAlign: 'center',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalBalanceLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
    fontWeight: '500',
  },
  modalBalanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  modalSubTitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
    fontStyle: 'italic',
  },
  modalFilterContainer: {
    marginBottom: 20,
    backgroundColor: '#F8F9FA',
    padding: 8,
    borderRadius: 12,
  },
  modalFilterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 8,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  modalFilterButtonActive: {
    backgroundColor: WHITE_GREEN,
  },
  modalFilterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  modalFilterButtonTextActive: {
    color: 'white',
  },
  modalBodyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalSortToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE_GREEN + '10',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: WHITE_GREEN + '30',
  },
  modalSortToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: WHITE_GREEN,
    marginLeft: 4,
  },
  modalLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalLoadingText: {
    marginTop: 10,
    color: '#999',
    fontSize: 14,
  },
  modalEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 60,
  },
  modalEmptyText: {
    marginTop: 10,
    color: '#CCC',
    fontSize: 16,
  },
  // Transaction Item Styles
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
    marginLeft: 15,
  },
  transactionCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  transactionNote: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  transactionAmountContainer: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  transactionDate: {
    fontSize: 11,
    color: '#BBB',
    marginTop: 2,
  },
});

export default WalletScreen;

