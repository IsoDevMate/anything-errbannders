import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Plus, Clock, MapPin } from 'lucide-react-native';
import { Link, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useRequireAuth, useAuth } from '@/utils/auth/useAuth';
import { api, type Errand } from '@/utils/api';

const STATUS_COLOR: Record<string, string> = {
  pending: '#FBBF24',
  accepted: '#3B82F6',
  in_progress: '#8B5CF6',
  completed: '#10B981',
  confirmed: '#10B981',
  disputed: '#EF4444',
};

export default function HomeDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('browse');
  useRequireAuth();
  const { auth } = useAuth();

  const firstName = auth?.user?.name?.split(' ')[0] ?? 'there';

  const { data: errands = [], isLoading, refetch, isRefetching } = useQuery<Errand[]>({
    queryKey: ['errands'],
    queryFn: () => api.errands.list(),
    enabled: !!auth,
  });

  const myErrands = errands.filter(
    (e) => e.sender_id === auth?.user?.id || e.agent_id === auth?.user?.id
  );
  const displayed = activeTab === 'browse' ? errands : myErrands;

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB', paddingTop: insets.top }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingVertical: 15,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <View>
          <Text style={{ fontSize: 14, color: '#6B7280' }}>Good morning,</Text>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111827' }}>{firstName}</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/errand/create' as any)}
          style={{
            backgroundColor: '#000',
            width: 44,
            height: 44,
            borderRadius: 22,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Plus color="#fff" size={24} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
        <View
          style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            paddingHorizontal: 15,
            height: 50,
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#E5E7EB',
          }}
        >
          <Search size={20} color="#9CA3AF" />
          <Text style={{ marginLeft: 10, color: '#9CA3AF', fontSize: 16 }}>
            Search errands near you...
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20 }}>
        {['browse', 'my-errands'].map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={{
              marginRight: 20,
              paddingBottom: 8,
              borderBottomWidth: activeTab === tab ? 2 : 0,
              borderColor: '#000',
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: activeTab === tab ? 'bold' : 'normal',
                color: activeTab === tab ? '#000' : '#6B7280',
              }}
            >
              {tab === 'browse' ? 'Browse' : 'My Errands'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        {/* Categories */}
        {activeTab === 'browse' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 25, paddingLeft: 20, flexGrow: 0 }}
          >
            {[
              { name: 'Shopping', icon: '🛒' },
              { name: 'Logistics', icon: '📦' },
              { name: 'Queuing', icon: '⏳' },
              { name: 'Personal', icon: '👤' },
            ].map((cat) => (
              <TouchableOpacity
                key={cat.name}
                style={{
                  backgroundColor: '#fff',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderRadius: 16,
                  marginRight: 12,
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  alignItems: 'center',
                  flexDirection: 'row',
                }}
              >
                <Text style={{ fontSize: 18, marginRight: 6 }}>{cat.icon}</Text>
                <Text style={{ fontWeight: '600' }}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={{ paddingHorizontal: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 15 }}>
            {activeTab === 'browse' ? 'Errands Near You' : 'Your Active Errands'}
          </Text>

          {isLoading && (
            <Text style={{ color: '#6B7280', textAlign: 'center', marginTop: 40 }}>
              Loading errands...
            </Text>
          )}

          {!isLoading && displayed.length === 0 && (
            <Text style={{ color: '#9CA3AF', textAlign: 'center', marginTop: 40 }}>
              {activeTab === 'browse' ? 'No errands yet.' : 'You have no active errands.'}
            </Text>
          )}

          {displayed.map((errand) => (
            <Link key={errand.id} href={`/errand/${errand.id}` as any} asChild>
              <TouchableOpacity
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 20,
                  padding: 16,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 10,
                  elevation: 2,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginBottom: 10,
                  }}
                >
                  <View
                    style={{
                      backgroundColor: '#F3F4F6',
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: '#4B5563', fontWeight: '600' }}>
                      {errand.category}
                    </Text>
                  </View>
                  <Text style={{ color: '#10B981', fontWeight: 'bold' }}>
                    KES {parseFloat(errand.fee).toLocaleString()}
                  </Text>
                </View>
                <Text
                  style={{ fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 8 }}
                >
                  {errand.title}
                </Text>
                {errand.pickup_location && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <MapPin size={14} color="#6B7280" />
                    <Text style={{ fontSize: 14, color: '#6B7280', marginLeft: 4 }}>
                      {errand.pickup_location}
                    </Text>
                  </View>
                )}
                <View style={{ height: 1, backgroundColor: '#F3F4F6', marginBottom: 12 }} />
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Clock size={14} color="#9CA3AF" />
                    <Text style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 4 }}>
                      {new Date(errand.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: STATUS_COLOR[errand.status] ?? '#9CA3AF',
                        marginRight: 6,
                      }}
                    />
                    <Text
                      style={{
                        fontSize: 12,
                        color: '#4B5563',
                        fontWeight: '500',
                        textTransform: 'capitalize',
                      }}
                    >
                      {errand.status.replace('_', ' ')}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </Link>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
