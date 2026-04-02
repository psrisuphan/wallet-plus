import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { PRIMARY as ACCENT } from '../constants/Colors';

interface HeaderProps {
  title?: string;
  showHome?: boolean;
  showBack?: boolean;
  onBackPress?: () => void;
  showAdd?: boolean;
  onAddPress?: () => void;
  showLogo?: boolean;
  profileImage?: string | null;
  onProfilePress?: () => void;
  leftIconName?: keyof typeof Ionicons.glyphMap;
  onLeftButtonPress?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  title, 
  showHome = false, 
  showBack = false,
  onBackPress,
  showAdd = false, 
  onAddPress,
  showLogo = false,
  profileImage,
  onProfilePress,
  leftIconName,
  onLeftButtonPress,
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
          ) : leftIconName ? (
            <TouchableOpacity onPress={onLeftButtonPress} style={styles.headerLeftButton}>
              <Ionicons name={leftIconName} size={28} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}

          <Text style={styles.header}>{title}</Text>

          {showAdd ? (
            <TouchableOpacity onPress={onAddPress} style={styles.headerRightButton}>
              <Ionicons name="add" size={34} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (onProfilePress || profileImage !== undefined) ? (
            <TouchableOpacity onPress={onProfilePress} style={styles.headerRightButton}>
              {profileImage ? (
                <Image 
                  source={{ uri: `data:image/jpeg;base64,${profileImage}` }} 
                  style={styles.profileAvatar} 
                />
              ) : (
                <View style={styles.profilePlaceholder}>
                  <Ionicons name="person" size={20} color={ACCENT} />
                </View>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  headerBackground: {
    backgroundColor: ACCENT,
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
  headerRightButton: {
    position: 'absolute',
    right: 0,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  profilePlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

export default Header;
