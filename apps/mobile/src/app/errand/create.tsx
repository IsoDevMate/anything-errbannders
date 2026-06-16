import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Info, DollarSign, MapPin, Tag } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import KeyboardAvoidingAnimatedView from '@/components/KeyboardAvoidingAnimatedView';
import { useAuth } from '@/utils/auth/useAuth';
import { api } from '@/utils/api';

export default function CreateErrand() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { auth } = useAuth();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    budget: '',
    fee: '',
    pickup: '',
    delivery: '',
    category: 'Shopping',
  });

  const categories = ['Shopping', 'Logistics', 'Queuing', 'Personal'];

  const focusedPadding = 20;
  const paddingAnimation = useRef(new Animated.Value(insets.bottom + focusedPadding)).current;

  const animateTo = (value: number) => {
    Animated.timing(paddingAnimation, { toValue: value, duration: 200, useNativeDriver: false }).start();
  };

  const handleFocus = () => { if (Platform.OS !== 'web') animateTo(focusedPadding); };
  const handleBlur  = () => { if (Platform.OS !== 'web') animateTo(insets.bottom + focusedPadding); };

  const handleCreate = async () => {
    if (!formData.title || !formData.budget || !formData.fee) {
      Alert.alert('Error', 'Please fill in title, budget and fee');
      return;
    }
    if (!auth?.user?.id) {
      Alert.alert('Error', 'You must be signed in to create an errand');
      return;
    }

    setLoading(true);
    try {
      await api.errands.create({
        title: formData.title,
        description: formData.description || undefined,
        budget: formData.budget,
        fee: formData.fee,
        sender_id: auth.user.id,
        pickup_location: formData.pickup || undefined,
        delivery_location: formData.delivery || undefined,
        category: formData.category,
      });

      await queryClient.invalidateQueries({ queryKey: ['errands'] });
      Alert.alert('Success 🎉', 'Errand created and funds held in escrow.');
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to create errand');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top }}>
      <View
        style={{
          paddingHorizontal: 20,
          paddingVertical: 15,
          flexDirection: 'row',
          alignItems: 'center',
          borderBottomWidth: 1,
          borderColor: '#F3F4F6',
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 15 }}>
          <ChevronLeft color="#000" size={24} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Create Errand</Text>
      </View>

      <KeyboardAvoidingAnimatedView style={{ flex: 1 }} behavior="padding">
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          {/* Category Selector */}
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 10 }}>
            Select Category
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 25, flexGrow: 0 }}
          >
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setFormData({ ...formData, category: cat })}
                style={{
                  backgroundColor: formData.category === cat ? '#000' : '#F3F4F6',
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 20,
                  marginRight: 10,
                  borderWidth: 1,
                  borderColor: formData.category === cat ? '#000' : '#E5E7EB',
                }}
              >
                <Text style={{ color: formData.category === cat ? '#fff' : '#4B5563', fontWeight: '600' }}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Title */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 8 }}>Task Title</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 15, borderWidth: 1, borderColor: '#E5E7EB' }}>
              <Tag size={18} color="#9CA3AF" />
              <TextInput
                style={{ flex: 1, height: 50, marginLeft: 10, fontSize: 16 }}
                placeholder="e.g. Buy groceries from Naivas"
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </View>
          </View>

          {/* Description */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 8 }}>Description</Text>
            <View style={{ backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 10, borderWidth: 1, borderColor: '#E5E7EB' }}>
              <TextInput
                style={{ height: 100, fontSize: 16, textAlignVertical: 'top' }}
                placeholder="Describe exactly what needs to be done..."
                multiline
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </View>
          </View>

          {/* Budget + Fee */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
            <View style={{ width: '48%' }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 8 }}>Item Budget</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 15, borderWidth: 1, borderColor: '#E5E7EB' }}>
                <DollarSign size={18} color="#9CA3AF" />
                <TextInput
                  style={{ flex: 1, height: 50, marginLeft: 5, fontSize: 16 }}
                  placeholder="KES"
                  keyboardType="numeric"
                  value={formData.budget}
                  onChangeText={(text) => setFormData({ ...formData, budget: text })}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </View>
            </View>
            <View style={{ width: '48%' }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 8 }}>Agent Fee</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 15, borderWidth: 1, borderColor: '#E5E7EB' }}>
                <DollarSign size={18} color="#9CA3AF" />
                <TextInput
                  style={{ flex: 1, height: 50, marginLeft: 5, fontSize: 16 }}
                  placeholder="KES"
                  keyboardType="numeric"
                  value={formData.fee}
                  onChangeText={(text) => setFormData({ ...formData, fee: text })}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </View>
            </View>
          </View>

          {/* Locations */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 8 }}>Location (Optional)</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 15, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 10 }}>
              <MapPin size={18} color="#9CA3AF" />
              <TextInput
                style={{ flex: 1, height: 50, marginLeft: 10, fontSize: 16 }}
                placeholder="Pickup location"
                value={formData.pickup}
                onChangeText={(text) => setFormData({ ...formData, pickup: text })}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 15, borderWidth: 1, borderColor: '#E5E7EB' }}>
              <MapPin size={18} color="#9CA3AF" />
              <TextInput
                style={{ flex: 1, height: 50, marginLeft: 10, fontSize: 16 }}
                placeholder="Delivery location"
                value={formData.delivery}
                onChangeText={(text) => setFormData({ ...formData, delivery: text })}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </View>
          </View>

          <View style={{ backgroundColor: '#EEF2FF', padding: 15, borderRadius: 12, flexDirection: 'row', marginBottom: 30 }}>
            <Info size={20} color="#4F46E5" />
            <Text style={{ flex: 1, marginLeft: 10, color: '#4338CA', fontSize: 13 }}>
              The total amount (Budget + Fee) will be held in escrow. Released only when you confirm the errand is done.
            </Text>
          </View>

          <Animated.View style={{ paddingBottom: paddingAnimation }}>
            <TouchableOpacity
              onPress={handleCreate}
              disabled={loading}
              style={{
                backgroundColor: loading ? '#9CA3AF' : '#000',
                height: 56,
                borderRadius: 16,
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 5,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
                {loading ? 'Creating...' : 'Launch Errand'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingAnimatedView>
    </View>
  );
}
