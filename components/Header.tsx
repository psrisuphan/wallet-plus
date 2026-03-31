import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const WHITE_GREEN = '#699e8aff';

interface HeaderProps {
  title?: string;
  showHome?: boolean;
  showBack?: boolean;
  onBackPress?: () => void;
  showAdd?: boolean;
  onAddPress?: () => void;
  showLogo?: boolean;
}

const Header: React.FC<HeaderProps> = ({ 
  title, 
  showHome = false, 
  showBack = false,
  onBackPress,
  showAdd = false, 
  onAddPress,
  showLogo = false 
}) => {
  const router = useRouter();

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  return (
    <View style={styles.headerBackground}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.headerContent}>
          {showBack ? (
            <TouchableOpacity onPress={handleBack} style={styles.headerLeftButton}>
              <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          ) : showHome ? (
            <TouchableOpacity onPress={() => router.push('/')} style={styles.headerLeftButton}>
              <Ionicons name="home" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          ) : showLogo ? (
             <View style={styles.headerLeftButton}>
               <Ionicons name="wallet" size={24} color="#FFFFFF" />
             </View>
          ) : null}

          <Text style={styles.header}>{title}</Text>

          {showAdd && (
            <TouchableOpacity onPress={onAddPress} style={styles.headerAddButton}>
              <Ionicons name="add" size={34} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
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
  headerLeftButton: {
    position: 'absolute',
    left: 0,
    padding: 4,
  },
  headerAddButton: {
    position: 'absolute',
    right: 0,
    padding: 4,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

export default Header;
