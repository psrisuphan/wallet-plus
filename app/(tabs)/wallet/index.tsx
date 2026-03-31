import React, { useState, useEffect, useMemo } from 'react';
import { Text, StyleSheet, View, FlatList, TextInput, TouchableOpacity, Modal, Alert, ActivityIndicator, StatusBar, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../../../firebaseConfig';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import Header from '../../../components/Header';

const WHITE_GREEN = '#699e8aff';
interface Wallet {
  id: string;
  name: string;
  balance: number;
  icon: string;
  color: string;
  detail?: string;
  userId: string;
}

const WalletScreen = () => {
  const router = useRouter();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortType, setSortType] = useState<'name' | 'balanceAsc' | 'balanceDesc'>('name');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

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

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, 'wallets'), where('userId', '==', userId));
    const unsubscribeFirestore = onSnapshot(q, (snapshot) => {
      const walletsData: Wallet[] = snapshot.docs.map((doc) => ({
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

  // Handle Search and Sorting
  const filteredAndSortedWallets = useMemo(() => {
    let result = [...wallets];
    
    // Search filter
    if (searchQuery.trim() !== '') {
      result = result.filter(wallet => 
        wallet.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (wallet.detail && wallet.detail.toLowerCase().includes(searchQuery.toLowerCase()))
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

  const handleDeleteWallet = (walletId: string) => {
    Alert.alert(
      'Delete Wallet',
      'Are you sure you want to delete this wallet?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            setLoading(true);
            try {
              await deleteDoc(doc(db, 'wallets', walletId));
              Alert.alert('Success', 'Wallet deleted successfully!');
            } catch (error) {
              console.error('Error deleting wallet:', error);
              Alert.alert('Error', 'Failed to delete wallet.');
            } finally {
              setLoading(false);
            }
          },
          style: 'destructive',
        },
      ],
      { cancelable: false }
    );
  };

  const openEditPage = (walletId: string) => {
    router.push({ pathname: '/wallet_add', params: { id: walletId } });
  };

  const openAddPage = () => {
    router.push('/wallet_add');
  };

  const renderWalletItem = ({ item }: { item: Wallet }) => (
    <TouchableOpacity 
      style={styles.walletItem}
      onPress={() => openEditPage(item.id)}
    >
      <View style={styles.walletHeader}>
        <View style={[styles.iconContainer, { backgroundColor: item.color + '15' }]}>
          <Ionicons name={item.icon as any || 'wallet'} size={24} color={item.color || '#333'} />
        </View>
        <View style={styles.walletInfo}>
          <Text style={styles.walletName}>{item.name}</Text>
          {item.detail ? <Text style={styles.walletDetail} numberOfLines={1}>{item.detail}</Text> : null}
        </View>
        <TouchableOpacity onPress={() => handleDeleteWallet(item.id)} style={styles.deleteIconButton}>
          <Ionicons name="trash-outline" size={20} color="#DC3545" />
        </TouchableOpacity>
      </View>
      <View style={styles.walletBody}>
        <Text style={styles.balanceLabel}>Balance</Text>
        <Text style={[styles.walletBalance, { color: item.color }]}>฿{item.balance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</Text>
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
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#888" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search wallets by name..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#AAA"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#AAA" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.sortContainer}>
          <Text style={styles.sortLabel}>Sort by:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortScroll}>
            <TouchableOpacity 
              style={[styles.sortButton, sortType === 'name' && styles.sortButtonActive]}
              onPress={() => setSortType('name')}
            >
              <Text style={[styles.sortButtonText, sortType === 'name' && styles.sortButtonTextActive]}>Name</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.sortButton, sortType === 'balanceDesc' && styles.sortButtonActive]}
              onPress={() => setSortType('balanceDesc')}
            >
              <Ionicons name="arrow-down" size={12} color={sortType === 'balanceDesc' ? WHITE_GREEN : '#888'} />
              <Text style={[styles.sortButtonText, sortType === 'balanceDesc' && styles.sortButtonTextActive]}>Highest Balance</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.sortButton, sortType === 'balanceAsc' && styles.sortButtonActive]}
              onPress={() => setSortType('balanceAsc')}
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
                  {searchQuery ? `Searching: ${filteredAndSortedWallets.length} found` : `${wallets.length} total wallets`}
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
  deleteIconButton: {
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
});

export default WalletScreen;

