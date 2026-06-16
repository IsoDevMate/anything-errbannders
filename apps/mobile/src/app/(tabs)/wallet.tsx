import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowUpRight, ArrowDownLeft, Plus, Wallet as WalletIcon } from 'lucide-react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/utils/auth/useAuth';
import { api, type WalletData } from '@/utils/api';

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const { auth } = useAuth();
  const queryClient = useQueryClient();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [depositing, setDepositing] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery<WalletData>({
    queryKey: ['wallet', auth?.user?.id],
    queryFn: () => api.wallet.get(auth!.user.id),
    enabled: !!auth?.user?.id,
  });

  const balance = data?.wallet ? parseFloat(data.wallet.balance) : 0;
  const transactions = data?.transactions ?? [];

  const handleTopUp = async () => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed < 1) return;
    if (!phone.match(/^0[17]\d{8}$/)) {
      Alert.alert('Invalid number', 'Enter a valid M-Pesa number (07xx or 01xx)');
      return;
    }

    setDepositing(true);
    try {
      await api.wallet.topup(auth!.user.id, phone, parsed);
      setIsModalVisible(false);
      setAmount('');
      setPhone('');
      Alert.alert(
        'Check your phone 📱',
        `An M-Pesa prompt for KES ${parsed.toLocaleString()} has been sent to ${phone}. Enter your PIN to complete.`
      );
      // Poll wallet after 15s to catch the callback credit
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['wallet'] }), 15000);
    } catch (err: any) {
      Alert.alert('Failed', err.message ?? 'Top up failed');
    } finally {
      setDepositing(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB', paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 20, paddingVertical: 15 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>My Wallet</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {/* Balance Card */}
        <View
          style={{
            backgroundColor: '#000',
            borderRadius: 24,
            padding: 25,
            marginBottom: 30,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 20,
            }}
          >
            <View>
              <Text style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 5 }}>
                Available Balance
              </Text>
              {isLoading ? (
                <Text style={{ color: '#fff', fontSize: 28, fontWeight: 'bold' }}>Loading...</Text>
              ) : (
                <Text style={{ color: '#fff', fontSize: 32, fontWeight: 'bold' }}>
                  KES {balance.toLocaleString()}
                </Text>
              )}
            </View>
            <View style={{ backgroundColor: '#ffffff20', padding: 10, borderRadius: 12 }}>
              <WalletIcon color="#fff" size={24} />
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <TouchableOpacity
              onPress={() => setIsModalVisible(true)}
              style={{
                backgroundColor: '#fff',
                flex: 1,
                height: 48,
                borderRadius: 14,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 10,
                flexDirection: 'row',
              }}
            >
              <Plus color="#000" size={18} />
              <Text style={{ color: '#000', fontWeight: 'bold', marginLeft: 6 }}>Top Up</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: '#ffffff20',
                flex: 1,
                height: 48,
                borderRadius: 14,
                justifyContent: 'center',
                alignItems: 'center',
                flexDirection: 'row',
                borderWidth: 1,
                borderColor: '#ffffff30',
              }}
            >
              <ArrowUpRight color="#fff" size={18} />
              <Text style={{ color: '#fff', fontWeight: 'bold', marginLeft: 6 }}>Withdraw</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Transactions */}
        <View>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 15 }}>
            Transactions
          </Text>

          {transactions.length === 0 && !isLoading && (
            <Text style={{ color: '#9CA3AF', textAlign: 'center', marginTop: 20 }}>
              No transactions yet.
            </Text>
          )}

          {transactions.map((tx) => {
            const isIn = parseFloat(tx.amount) > 0;
            return (
              <View
                key={tx.id}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#F3F4F6',
                }}
              >
                <View
                  style={{
                    backgroundColor: isIn ? '#D1FAE5' : '#F3F4F6',
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  {isIn ? (
                    <ArrowDownLeft color="#059669" size={20} />
                  ) : (
                    <ArrowUpRight color="#4B5563" size={20} />
                  )}
                </View>
                <View style={{ marginLeft: 15, flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#111827', textTransform: 'capitalize' }}>
                    {tx.type.replace(/_/g, ' ')}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6B7280' }}>
                    {new Date(tx.created_at).toLocaleString()}
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: isIn ? '#10B981' : '#111827',
                  }}
                >
                  {isIn ? '+' : '-'} KES {Math.abs(parseFloat(tx.amount)).toLocaleString()}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Top Up Modal */}
      <Modal visible={isModalVisible} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: '#fff',
              borderTopLeftRadius: 30,
              borderTopRightRadius: 30,
              padding: 25,
              paddingBottom: insets.bottom + 20,
            }}
          >
            <View
              style={{
                width: 40,
                height: 4,
                backgroundColor: '#E5E7EB',
                borderRadius: 2,
                alignSelf: 'center',
                marginBottom: 20,
              }}
            />
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 20 }}>
              Top Up with M-Pesa
            </Text>
            <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 10 }}>
              M-Pesa number
            </Text>
            <View
              style={{
                backgroundColor: '#F9FAFB',
                borderRadius: 15,
                padding: 15,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: '#E5E7EB',
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 18, marginRight: 8 }}>🇰🇪</Text>
              <TextInput
                style={{ flex: 1, fontSize: 18, fontWeight: '600' }}
                placeholder="07xx xxx xxx"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                maxLength={10}
              />
            </View>
            <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 10 }}>
              Amount (KES)
            </Text>
            <View
              style={{
                backgroundColor: '#F9FAFB',
                borderRadius: 15,
                padding: 15,
                marginBottom: 25,
                borderWidth: 1,
                borderColor: '#E5E7EB',
              }}
            >
              <TextInput
                style={{ fontSize: 24, fontWeight: 'bold' }}
                placeholder="0.00"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />
            </View>
            <TouchableOpacity
              onPress={handleTopUp}
              disabled={depositing}
              style={{
                backgroundColor: depositing ? '#9CA3AF' : '#000',
                height: 56,
                borderRadius: 16,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
                {depositing ? 'Sending prompt...' : 'Send M-Pesa Prompt'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsModalVisible(false)}
              style={{ marginTop: 15, height: 56, justifyContent: 'center', alignItems: 'center' }}
            >
              <Text style={{ color: '#6B7280', fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
