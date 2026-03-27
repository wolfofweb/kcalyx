import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';

const COLORS = {
  bg: '#0A0B0D',
  surface: '#13151A',
  border: '#242830',
  accent: '#6EE7B7',
  text: '#F1F5F9',
  textMuted: '#64748B',
  textSubtle: '#94A3B8',
  danger: '#F87171',
  surfaceElevated: '#1C1F27',
};

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string;
  isLoading?: boolean;
}

export default function CustomAlert({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmColor = COLORS.danger,
  isLoading = false,
}: CustomAlertProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable 
        style={styles.modalOverlay} 
        onPress={() => !isLoading && onCancel?.()}
      >
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            {onCancel && (
              <TouchableOpacity 
                onPress={onCancel}
                disabled={isLoading}
              >
                <Text style={styles.modalClose}>×</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.modalMessage}>
            {message}
          </Text>

          <View style={styles.modalFooter}>
            {onCancel && (
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={onCancel}
                disabled={isLoading}
              >
                <Text style={styles.modalCancelText}>{cancelText}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.modalConfirmBtn,
                { backgroundColor: confirmColor },
                isLoading && styles.modalBtnDisabled,
                !onCancel && { flex: 1 } // Full width if no cancel button
              ]}
              onPress={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.modalConfirmText}>{confirmText}</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: Platform.OS === 'web' ? 400 : '100%',
    maxWidth: 450,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
  },
  modalClose: {
    fontSize: 28,
    color: COLORS.textMuted,
    lineHeight: 28,
  },
  modalMessage: {
    fontSize: 16,
    color: COLORS.textSubtle,
    lineHeight: 24,
    marginBottom: 24,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 14,
    height: 54,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalConfirmBtn: {
    borderRadius: 14,
    height: 54,
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnDisabled: {
    opacity: 0.5,
  },
  modalConfirmText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modalCancelText: {
    color: COLORS.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
});
