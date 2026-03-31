import React, { useState, useEffect, useRef } from 'react';
import {
  Text,
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { collection, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';

const COLORS = [
  '#699e8aff', // Theme Green
  '#4A90E2', // Blue
  '#E24A4A', // Red
  '#F5A623', // Orange
  '#7ED321', // Light Green
  '#9013FE', // Purple
  '#50E3C2', // Teal
  '#4A4A4A', // Dark Grey
];

const ICONS = [
  'wallet',
  'cash',
  'card',
  'book',
  'business',
  'gift',
  'home',
  'car',
  'airplane',
  'cart',
  'restaurant',
  'fitness',
];

const AddWalletScreen = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!id);

  const [name, setName] = useState('');
  const [icon, setIcon] = useState(ICONS[0]);
  const [color, setColor] = useState(COLORS[0]);
  const [detail, setDetail] = useState('');
  const [balance, setBalance] = useState('');
  
  const scrollViewRef = useRef<ScrollView>(null);
  const [iconSectionY, setIconSectionY] = useState(0);

  useEffect(() => {
    if (id) {
      loadWalletData(id);
    }
  }, [id]);

  const loadWalletData = async (walletId: string) => {
    try {
      const docRef = doc(db, 'wallets', walletId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setName(data.name || '');
        setIcon(data.icon || ICONS[0]);
        setColor(data.color || COLORS[0]);
        setDetail(data.detail || '');
        setBalance(data.balance?.toString() || '');
      }
    } catch (error) {
      console.error('Error loading wallet:', error);
      Alert.alert('Error', 'Failed to load wallet data.');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'You must be logged in.');
      return;
    }

    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a wallet name.');
      return;
    }

    const startingBalance = parseFloat(balance) || 0;

    setLoading(true);
    try {
      const walletData = {
        name: name.trim(),
        icon,
        color,
        detail: detail.trim(),
        balance: startingBalance,
        userId: user.uid,
        updatedAt: new Date(),
      };

      if (id) {
        // Update
        await updateDoc(doc(db, 'wallets', id), walletData);
        Alert.alert('Success', 'Wallet updated successfully!');
      } else {
        // Create
        await addDoc(collection(db, 'wallets'), {
          ...walletData,
          createdAt: new Date(),
        });
        Alert.alert('Success', 'Wallet created successfully!');
      }
      router.back();
    } catch (error) {
      console.error('Error saving wallet:', error);
      Alert.alert('Error', 'Failed to save wallet.');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#699e8aff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerBackground}>
        <SafeAreaView edges={['top']} style={styles.headerSafe}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{id ? 'Edit Wallet' : 'Add New Wallet'}</Text>
            <View style={{ width: 28 }} />
          </View>
        </SafeAreaView>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.content} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <TouchableOpacity 
            activeOpacity={0.8} 
            style={[styles.mainIconContainer, { backgroundColor: color + '15', borderColor: color + '33' }]}
            onPress={() => scrollViewRef.current?.scrollTo({ y: iconSectionY - 20, animated: true })}
          >
            <Ionicons name={icon as any} size={64} color={color} />
            <View style={[styles.editBadge, { backgroundColor: color }]}>
              <Ionicons name="pencil" size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <Text style={styles.heroSubText}>Preview</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Wallet Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. My Savings"
            value={name}
            onChangeText={setName}
            placeholderTextColor="#AAA"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Starting Balance (฿THB)</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            keyboardType="numeric"
            value={balance}
            onChangeText={setBalance}
            placeholderTextColor="#AAA"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Wallet Detail</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Optional description"
            multiline
            numberOfLines={4}
            value={detail}
            onChangeText={setDetail}
            placeholderTextColor="#AAA"
          />
        </View>

        <View 
          style={styles.section}
          onLayout={(event) => setIconSectionY(event.nativeEvent.layout.y)}
        >
          <Text style={styles.label}>Select Icon</Text>
          <View style={styles.iconGrid}>
            {ICONS.map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.iconItem,
                  icon === item && { backgroundColor: color + '22', borderColor: color },
                ]}
                onPress={() => setIcon(item)}
              >
                <Ionicons name={item as any} size={24} color={icon === item ? color : '#555'} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Select Color</Text>
          <View style={styles.colorGrid}>
            {COLORS.map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.colorItem,
                  { backgroundColor: item },
                  color === item && styles.selectedColor,
                ]}
                onPress={() => setColor(item)}
              />
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: color }]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>{id ? 'Save Changes' : 'Create Wallet'}</Text>
          )}
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerBackground: {
    backgroundColor: '#699e8aff',
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  headerSafe: {
    width: '100%',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  backButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  mainIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  editBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  heroSubText: {
    marginTop: 10,
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#EEE',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  iconItem: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorItem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: '#00000033',
  },
  saveButton: {
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});

export default AddWalletScreen;
