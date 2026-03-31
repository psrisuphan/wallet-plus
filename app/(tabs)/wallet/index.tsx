import React, { useState, useEffect } from 'react';
import { Text, StyleSheet, View, FlatList, TextInput, TouchableOpacity, Modal, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../../../firebaseConfig'; // Adjust path if necessary
import { getAuth, onAuthStateChanged } from 'firebase/auth';

const WHITE_GREEN = '#699e8aff';

interface Wallet {
  id: string;
  name: string;
  balance: number;
  userId: string;
}

const WalletScreen = () => {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentWallet, setCurrentWallet] = useState<Wallet | null>(null);
  const [walletName, setWalletName] = useState('');
  const [walletBalance, setWalletBalance] = useState('');
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

  const handleAddEditWallet = async () => {
    if (!userId) {
      Alert.alert('Error', 'You must be logged in to add/edit wallets.');
      return;
    }

    if (!walletName || isNaN(parseFloat(walletBalance))) {
      Alert.alert('Error', 'Please enter a valid wallet name and balance.');
      return;
    }

    setLoading(true);
    try {
      if (currentWallet) {
        // Edit existing wallet
        await updateDoc(doc(db, 'wallets', currentWallet.id), {
          name: walletName,
          balance: parseFloat(walletBalance),
        });
        Alert.alert('Success', 'Wallet updated successfully!');
      } else {
        // Add new wallet
        await addDoc(collection(db, 'wallets'), {
          name: walletName,
          balance: parseFloat(walletBalance),
          userId: userId,
        });
        Alert.alert('Success', 'Wallet added successfully!');
      }
      setModalVisible(false);
      resetForm();
    } catch (error) {
      console.error('Error adding/editing wallet:', error);
      Alert.alert('Error', 'Failed to save wallet.');
    } finally {
      setLoading(false);
    }
  };

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

  const openEditModal = (wallet: Wallet) => {
    setCurrentWallet(wallet);
    setWalletName(wallet.name);
    setWalletBalance(wallet.balance.toString());
    setModalVisible(true);
  };

  const openAddModal = () => {
    setCurrentWallet(null);
    resetForm();
    setModalVisible(true);
  };

  const resetForm = () => {
    setWalletName('');
    setWalletBalance('');
    setCurrentWallet(null);
  };

  const renderWalletItem = ({ item }: { item: Wallet }) => (
    <View style={styles.walletItem}>
      <View>
        <Text style={styles.walletName}>{item.name}</Text>
        <Text style={styles.walletBalance}>Balance: ${item.balance.toFixed(2)}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={() => openEditModal(item)} style={[styles.button, styles.editButton]}>
          <Text style={styles.buttonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDeleteWallet(item.id)} style={[styles.button, styles.deleteButton]}>
          <Text style={styles.buttonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
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
        <SafeAreaView edges={['top']}>
          <Text style={styles.header}>My Wallets</Text>
        </SafeAreaView>
      </View>
      <View style={styles.content}>
        <FlatList
          data={wallets}
          renderItem={renderWalletItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.emptyListText}>No wallets found. Add one!</Text>}
        />

        <TouchableOpacity onPress={openAddModal} style={styles.addButton}>
          <Text style={styles.addButtonText}>Add New Wallet</Text>
        </TouchableOpacity>
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(!modalVisible);
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{currentWallet ? 'Edit Wallet' : 'Add New Wallet'}</Text>
            <TextInput
              style={styles.input}
              placeholder="Wallet Name"
              value={walletName}
              onChangeText={setWalletName}
              placeholderTextColor="#ccc"
            />
            <TextInput
              style={styles.input}
              placeholder="Balance"
              keyboardType="numeric"
              value={walletBalance}
              onChangeText={setWalletBalance}
              placeholderTextColor="#ccc"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  resetForm();
                }}
                style={[styles.button, styles.cancelButton]}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddEditWallet}
                style={[styles.button, styles.saveButton]}
              >
                <Text style={styles.buttonText}>{currentWallet ? 'Save Changes' : 'Add Wallet'}</Text>
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
  headerBackground: {
    backgroundColor: WHITE_GREEN,
    paddingHorizontal: 20,
    paddingBottom: 20,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF', // White text for green background
    textAlign: 'center',
    marginTop: 10,
  },
  walletItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  walletName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  walletBalance: {
    fontSize: 16,
    color: '#555',
    marginTop: 5,
  },
  actions: {
    flexDirection: 'row',
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    marginLeft: 10,
    minWidth: 70,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  editButton: {
    backgroundColor: WHITE_GREEN,
  },
  deleteButton: {
    backgroundColor: '#DC3545', // Red for delete
  },
  addButton: {
    backgroundColor: WHITE_GREEN,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: 30,
    fontSize: 16,
    color: '#777',
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

