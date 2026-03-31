import React, { useState, useEffect } from 'react';
import { Text, StyleSheet, View, FlatList, TextInput, TouchableOpacity, Modal, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../../../firebaseConfig'; // Adjust path if necessary
import { getAuth, onAuthStateChanged } from 'firebase/auth';

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
      <View style={styles.headerBackground}>
        <SafeAreaView edges={['top']} style={styles.headerSafe}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.push('/')} style={styles.headerHomeButton}>
              <Ionicons name="home" size={26} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.header}>My Wallets</Text>
            <TouchableOpacity onPress={openAddPage} style={styles.headerAddButton}>
              <Ionicons name="add" size={34} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
      <View style={styles.content}>
        <FlatList
          data={wallets}
          renderItem={renderWalletItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="wallet-outline" size={80} color="#D1D1D1" />
              <Text style={styles.emptyListText}>No wallets found.</Text>
              <TouchableOpacity onPress={openAddPage}>
                <Text style={styles.addOneText}>Add your first wallet!</Text>
              </TouchableOpacity>
            </View>
          }
          ListFooterComponent={
            wallets.length > 0 ? (
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
  headerBackground: {
    backgroundColor: WHITE_GREEN,
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  headerSafe: {
    width: '100%',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    position: 'relative',
    height: 40,
  },
  headerHomeButton: {
    position: 'absolute',
    left: 0,
    padding: 4,
  },
  headerAddButton: {
    position: 'absolute',
    right: 0,
    padding: 4,
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

