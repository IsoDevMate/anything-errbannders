import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Share, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ShieldCheck,
  Star,
  Bell,
  ChevronRight,
  LogOut,
  Share2,
  HelpCircle,
  QrCode,
} from 'lucide-react-native';
import { useAuth } from '@/utils/auth/useAuth';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [isAgentMode, setIsAgentMode] = useState(false);
  const { auth, signOut } = useAuth();
  const router = useRouter();

  const userName = auth?.user?.name ?? 'User';
  const userEmail = auth?.user?.email ?? '';
  const initials = userName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = async () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => {
          signOut();
        },
      },
    ]);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: 'Join me on ErrandEconomy - the trusted errand platform in Nairobi!',
      });
    } catch (error) {
      console.error(error);
    }
  };

  const MenuItem = ({ icon: Icon, title, subtitle, onPress, color = '#111827' }: any) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F3F4F6',
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          backgroundColor: '#F9FAFB',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Icon size={20} color={color} />
      </View>
      <View style={{ marginLeft: 15, flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>{title}</Text>
        {subtitle && <Text style={{ fontSize: 12, color: '#6B7280' }}>{subtitle}</Text>}
      </View>
      <ChevronRight size={18} color="#D1D5DB" />
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB', paddingTop: insets.top }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
        {/* Profile Header */}
        <View style={{ alignItems: 'center', paddingVertical: 30 }}>
          <View
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: '#111827',
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 10,
              elevation: 5,
              marginBottom: 15,
            }}
          >
            <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#fff' }}>
              {initials || '?'}
            </Text>
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                backgroundColor: '#10B981',
                width: 30,
                height: 30,
                borderRadius: 15,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 3,
                borderColor: '#F9FAFB',
              }}
            >
              <ShieldCheck size={16} color="#fff" />
            </View>
          </View>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>{userName}</Text>
          <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 5 }}>{userEmail}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: '#10B981',
                marginRight: 6,
              }}
            />
            <Text style={{ fontSize: 13, color: '#10B981', fontWeight: '600' }}>
              Verified Sender
            </Text>
          </View>

          {/* Stats */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              width: '85%',
              backgroundColor: '#fff',
              borderRadius: 20,
              padding: 16,
              borderWidth: 1,
              borderColor: '#F3F4F6',
            }}
          >
            {[
              { label: 'Errands', value: '24' },
              { label: 'Spent', value: 'KES 12k' },
              { label: 'Rating', value: '4.9 ★' },
            ].map((stat, i) => (
              <View key={i} style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827' }}>
                  {stat.value}
                </Text>
                <Text style={{ fontSize: 12, color: '#6B7280' }}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Agent Mode Toggle */}
        <View
          style={{
            backgroundColor: '#fff',
            marginHorizontal: 20,
            padding: 20,
            borderRadius: 24,
            marginBottom: 30,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderWidth: 1,
            borderColor: '#F3F4F6',
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#111827' }}>
              Become an Agent
            </Text>
            <Text style={{ fontSize: 12, color: '#6B7280' }}>
              Earn money doing errands for others
            </Text>
          </View>
          <Switch
            value={isAgentMode}
            onValueChange={(val) => {
              setIsAgentMode(val);
              if (val) router.push('/errand/agent-apply' as any);
            }}
            trackColor={{ false: '#D1D5DB', true: '#10B981' }}
          />
        </View>

        {/* Settings */}
        <View style={{ paddingHorizontal: 20 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: 'bold',
              color: '#9CA3AF',
              textTransform: 'uppercase',
              marginBottom: 15,
              marginLeft: 5,
            }}
          >
            Account
          </Text>
          <MenuItem icon={Bell} title="Notifications" subtitle="Alerts for active errands" />
          <MenuItem icon={Star} title="My Reviews" subtitle="4.9 (24 reviews)" />
          <MenuItem icon={ShieldCheck} title="Identity Verification" subtitle="Status: Verified" />
          <MenuItem icon={QrCode} title="My QR Pass" subtitle="Show at errand drop-off points" />

          <Text
            style={{
              fontSize: 14,
              fontWeight: 'bold',
              color: '#9CA3AF',
              textTransform: 'uppercase',
              marginTop: 20,
              marginBottom: 15,
              marginLeft: 5,
            }}
          >
            Support
          </Text>
          <MenuItem icon={HelpCircle} title="Help Center" />
          <MenuItem icon={Share2} title="Invite Friends" onPress={handleShare} />
          <MenuItem icon={LogOut} title="Log Out" color="#EF4444" onPress={handleLogout} />
        </View>

        <View style={{ alignItems: 'center', marginTop: 30 }}>
          <Text style={{ fontSize: 12, color: '#9CA3AF' }}>ErrandEconomy v1.0.0</Text>
          <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Made with ❤️ in Nairobi</Text>
        </View>
      </ScrollView>
    </View>
  );
}
