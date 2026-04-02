import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Haptic feedback utility to provide a premium UX feel consistently throughout the app.
 * Each method maps to specific UI interactions based on the intensity and meaning of the action.
 */
export const HapticFeedback = {
    /**
     * Light impact for small UI actions like toggling filters, tapping icons, 
     * or selecting items in a menu. Very subtle 'click'.
     */
    light: () => {
        if (Platform.OS === 'web') return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },

    /**
    * Medium impact for primary UI actions like opening modals, 
    * tab switching, or non-destructive state changes.
    */
    medium: () => {
        if (Platform.OS === 'web') return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },

    /**
     * Heavy impact for significant actions like entering a critical flow 
     * or large layout shifts. Use sparingly.
     */
    heavy: () => {
        if (Platform.OS === 'web') return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    },

    /**
     * Physical confirmation of a successful background task or database save.
     * (e.g., Transaction Saved, Wallet Updated).
     */
    success: () => {
        if (Platform.OS === 'web') return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },

    /**
     * Warning haptic for destructive actions or confirmation modals (e.g., Delete prompt).
     */
    warning: () => {
        if (Platform.OS === 'web') return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    },

    /**
     * Error haptic for failed operations, invalid inputs, or denied access.
     */
    error: () => {
        if (Platform.OS === 'web') return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },

    /**
     * Selection feedback for scrolling pickers or scrubbers.
     * Often used in native wheels or scroll-snapping components.
     */
    selection: () => {
        if (Platform.OS === 'web') return;
        Haptics.selectionAsync();
    }
};
