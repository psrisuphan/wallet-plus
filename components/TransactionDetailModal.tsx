import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Modal, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PRIMARY as PRIMARY_GREEN, PRIMARY_LIGHT as SUBTLE_GREEN } from '../constants/Colors';

import { Transaction } from '../types';

interface TransactionDetailModalProps {
    visible: boolean;
    transaction: Transaction | null;
    walletName: string;
    onClose: () => void;
    onEdit: () => void;
}

const TransactionDetailModal = ({ visible, transaction, walletName, onClose, onEdit }: TransactionDetailModalProps) => {
    if (!transaction) return null;
    
    const dateObj = transaction.date?.toDate ? transaction.date.toDate() : new Date();
    const dateStr = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    
    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={modalStyles.overlay}>
                <View style={modalStyles.content}>
                    <View style={modalStyles.header}>
                        <Text style={modalStyles.headerTitle}>Transaction Details</Text>
                        <TouchableOpacity onPress={onClose} style={modalStyles.closeButton}>
                            <Ionicons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>
                    
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={modalStyles.scrollBody}>
                        <View style={modalStyles.amountSection}>
                            <View style={[
                                modalStyles.typeBadge, 
                                { backgroundColor: transaction.type === 'income' ? '#E8F5E9' : '#FFEBEE' }
                            ]}>
                                <Text style={[
                                    modalStyles.typeText,
                                    { color: transaction.type === 'income' ? PRIMARY_GREEN : '#C62828' }
                                ]}>
                                    {transaction.type?.toUpperCase()}
                                </Text>
                            </View>
                            <Text style={[
                                modalStyles.amountText,
                                { color: transaction.type === 'income' ? PRIMARY_GREEN : '#C62828' }
                            ]}>
                                {transaction.type === 'income' ? '+' : '-'}฿{(transaction.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </Text>
                        </View>
                        
                        <View style={modalStyles.infoGrid}>
                            <View style={modalStyles.infoItem}>
                                <Text style={modalStyles.infoLabel}>Category</Text>
                                <View style={modalStyles.categoryValue}>
                                    <View style={[
                                        modalStyles.categoryIconSmall,
                                        { backgroundColor: transaction.type === 'income' ? SUBTLE_GREEN : '#FFEBEE' }
                                    ]}>
                                        <Ionicons 
                                            name={(transaction.categoryIcon || (transaction.type === 'income' ? "arrow-up" : "arrow-down")) as any} 
                                            size={16} 
                                            color={transaction.type === 'income' ? PRIMARY_GREEN : '#C62828'} 
                                        />
                                    </View>
                                    <Text style={modalStyles.infoValue}>{transaction.categoryName}</Text>
                                </View>
                            </View>
                            
                            <View style={modalStyles.infoItem}>
                                <Text style={modalStyles.infoLabel}>Wallet</Text>
                                <View style={modalStyles.categoryValue}>
                                    <Ionicons name="wallet-outline" size={16} color="#666" style={{ marginRight: 8 }} />
                                    <Text style={modalStyles.infoValue}>{walletName}</Text>
                                </View>
                            </View>
                            
                            <View style={modalStyles.infoItem}>
                                <Text style={modalStyles.infoLabel}>Date</Text>
                                <Text style={modalStyles.infoValue}>{dateStr}</Text>
                            </View>
                            
                            <View style={modalStyles.infoItem}>
                                <Text style={modalStyles.infoLabel}>Time</Text>
                                <Text style={modalStyles.infoValue}>{timeStr}</Text>
                            </View>

                            {transaction.userName && (
                                <View style={modalStyles.infoItem}>
                                    <Text style={modalStyles.infoLabel}>Added By</Text>
                                    <View style={modalStyles.categoryValue}>
                                        <Ionicons name="person-outline" size={16} color="#666" style={{ marginRight: 8 }} />
                                        <Text style={modalStyles.infoValue}>{transaction.userName}</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                        
                        {transaction.note && (
                            <View style={modalStyles.noteSection}>
                                <Text style={modalStyles.infoLabel}>Note</Text>
                                <Text style={modalStyles.noteContent}>{transaction.note}</Text>
                            </View>
                        )}
                        
                        {transaction.imageBase64 && (
                            <View style={modalStyles.imageSection}>
                                <Text style={modalStyles.infoLabel}>Attachment</Text>
                                <Image 
                                    source={{ uri: `data:image/jpeg;base64,${transaction.imageBase64}` }} 
                                    style={modalStyles.attachmentImage}
                                />
                            </View>
                        )}
                    </ScrollView>
                    
                    <View style={modalStyles.footer}>
                        <TouchableOpacity style={modalStyles.editButton} onPress={onEdit}>
                            <Ionicons name="create-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                            <Text style={modalStyles.editButtonText}>Edit Transaction</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const modalStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    content: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        height: '85%',
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        position: 'relative',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    closeButton: {
        position: 'absolute',
        right: 20,
        padding: 4,
    },
    scrollBody: {
        padding: 24,
    },
    amountSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    typeBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
        marginBottom: 12,
    },
    typeText: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 1,
    },
    amountText: {
        fontSize: 40,
        fontWeight: '800',
    },
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 20,
        marginBottom: 32,
    },
    infoItem: {
        width: '46%',
    },
    infoLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#888',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    infoValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    categoryValue: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    categoryIconSmall: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    noteSection: {
        marginBottom: 32,
        backgroundColor: '#F8F9FA',
        padding: 16,
        borderRadius: 16,
    },
    noteContent: {
        fontSize: 16,
        color: '#444',
        lineHeight: 24,
    },
    imageSection: {
        marginBottom: 32,
    },
    attachmentImage: {
        width: '100%',
        height: 300,
        borderRadius: 20,
        marginTop: 12,
        resizeMode: 'cover',
        backgroundColor: '#F0F0F0',
    },
    footer: {
        paddingHorizontal: 24,
        paddingTop: 16,
    },
    editButton: {
        backgroundColor: PRIMARY_GREEN,
        height: 56,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: PRIMARY_GREEN,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    editButtonText: {
        color: '#FFF',
        fontSize: 17,
        fontWeight: '700',
    },
});

export default TransactionDetailModal;
