import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  MapPin,
  Clock,
  ShieldCheck,
  Camera,
  CheckCircle,
  AlertTriangle,
  User,
  QrCode,
  Navigation,
  X,
  Wifi,
} from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import useUpload from '@/utils/useUpload';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/utils/auth/useAuth';
import { api, type Errand } from '@/utils/api';

const PICKUP = { latitude: -1.2672, longitude: 36.8148 }; // Westlands
const DELIVERY = { latitude: -1.2921, longitude: 36.789 }; // GTC Nairobi

const AGENT_WAYPOINTS = [
  { latitude: -1.2672, longitude: 36.8148 },
  { latitude: -1.271, longitude: 36.811 },
  { latitude: -1.275, longitude: 36.807 },
  { latitude: -1.279, longitude: 36.802 },
  { latitude: -1.284, longitude: 36.797 },
  { latitude: -1.289, longitude: 36.792 },
  { latitude: -1.2921, longitude: 36.789 },
];

const MAP_REGION = {
  latitude: (-1.2672 + -1.2921) / 2,
  longitude: (36.8148 + 36.789) / 2,
  latitudeDelta: 0.06,
  longitudeDelta: 0.06,
};

export default function ErrandDetail() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [upload, { loading: uploading }] = useUpload();
  const queryClient = useQueryClient();
  const { auth } = useAuth();

  const [showQR, setShowQR] = useState(false);
  const [agentPosition, setAgentPosition] = useState(AGENT_WAYPOINTS[0]);
  const waypointIndex = useRef(0);

  const { data: errand, isLoading } = useQuery<Errand>({
    queryKey: ['errand', id],
    queryFn: async () => {
      const list = await api.errands.list();
      const found = list.find((e) => e.id === id);
      if (!found) throw new Error('Errand not found');
      return found;
    },
    enabled: !!id,
  });

  // Derive role from auth
  const role: 'sender' | 'agent' =
    errand?.sender_id === auth?.user?.id ? 'sender' : 'agent';

  // Simulate agent movement on map
  useEffect(() => {
    const interval = setInterval(() => {
      waypointIndex.current = Math.min(waypointIndex.current + 1, AGENT_WAYPOINTS.length - 1);
      setAgentPosition(AGENT_WAYPOINTS[waypointIndex.current]);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      const uploadResult = await upload({ reactNativeAsset: result.assets[0] as any });
      if ('url' in uploadResult && errand) {
        await api.errands.update({
          errandId: errand.id,
          status: 'completed',
          agentId: auth?.user?.id,
          proofImageUrl: uploadResult.url,
        });
        await queryClient.invalidateQueries({ queryKey: ['errand', id] });
        await queryClient.invalidateQueries({ queryKey: ['errands'] });
        Alert.alert('Proof Uploaded ✅', 'Errand marked complete. Waiting for sender to confirm.');
      }
    }
  };

  const handleConfirm = () => {
    Alert.alert(
      'Confirm & Release Payment',
      `Funds of KES ${parseFloat(errand!.fee).toLocaleString()} will be released to the agent. Are you satisfied?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Pay',
          onPress: async () => {
            await api.errands.update({ errandId: errand!.id, status: 'confirmed' });
            await queryClient.invalidateQueries({ queryKey: ['errand', id] });
            await queryClient.invalidateQueries({ queryKey: ['errands'] });
            Alert.alert('Payment Released 🎉', 'Thank you for using ErrandEconomy!');
          },
        },
      ]
    );
  };

  const handleDispute = () => {
    Alert.alert(
      'Raise Dispute',
      'Funds will be held while we review your case. Describe the issue briefly.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Raise Dispute',
          style: 'destructive',
          onPress: async () => {
            await api.errands.update({ errandId: errand!.id, status: 'disputed' });
            await queryClient.invalidateQueries({ queryKey: ['errand', id] });
            await queryClient.invalidateQueries({ queryKey: ['errands'] });
            Alert.alert(
              'Dispute Raised',
              'Our team will review this within 2 hours and reach out to both parties.'
            );
          },
        },
      ]
    );
  };

  const qrData = encodeURIComponent(`ERRAND:${id}:VERIFIED:${errand?.agent_name ?? 'AGENT'}`);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${qrData}&color=111827&bgcolor=FFFFFF&margin=10`;

  const statusColor =
    errand?.status === 'confirmed'
      ? { bg: '#D1FAE5', icon: '#059669', text: '#065F46' }
      : errand?.status === 'completed'
        ? { bg: '#EFF6FF', icon: '#2563EB', text: '#1E40AF' }
        : errand?.status === 'disputed'
          ? { bg: '#FEE2E2', icon: '#DC2626', text: '#7F1D1D' }
          : { bg: '#FEF3C7', icon: '#D97706', text: '#92400E' };

  const statusLabel =
    errand?.status === 'in_progress'
      ? 'In Progress — Agent is en route'
      : errand?.status === 'completed'
        ? 'Awaiting Your Confirmation'
        : errand?.status === 'disputed'
          ? 'Dispute Raised — Under Review'
          : errand?.status === 'confirmed'
            ? 'Completed & Paid ✅'
            : 'Pending — Awaiting Agent';

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (!errand) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <Text style={{ color: '#6B7280', fontSize: 16 }}>Errand not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: '#000', fontWeight: 'bold' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: insets.top }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingVertical: 15,
          flexDirection: 'row',
          alignItems: 'center',
          borderBottomWidth: 1,
          borderColor: '#F3F4F6',
          justifyContent: 'space-between',
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 15 }}>
          <ChevronLeft color="#000" size={24} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: 'bold', flex: 1 }}>Errand Details</Text>
        <View
          style={{
            backgroundColor: '#F3F4F6',
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 8,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#4B5563' }}>
            {role === 'agent' ? '👷 Agent' : '📤 Sender'}
          </Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {/* Status Banner */}
        <View
          style={{
            backgroundColor: statusColor.bg,
            padding: 16,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          {errand.status === 'confirmed' ? (
            <CheckCircle size={22} color={statusColor.icon} />
          ) : (
            <Clock size={22} color={statusColor.icon} />
          )}
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: 'bold', color: statusColor.text }}>
              {statusLabel}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
              <Wifi size={12} color={statusColor.icon} />
              <Text style={{ fontSize: 12, color: statusColor.text, marginLeft: 4, opacity: 0.8 }}>
                {errand.status === 'in_progress' ? 'Live tracking active' : 'Funds held in escrow'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── LIVE MAP TRACKING ── */}
        {(errand.status === 'in_progress' || errand.status === 'completed') && (
          <View
            style={{
              margin: 20,
              borderRadius: 20,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: '#E5E7EB',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 12,
                backgroundColor: '#F9FAFB',
                borderBottomWidth: 1,
                borderColor: '#E5E7EB',
              }}
            >
              <Navigation size={16} color="#10B981" />
              <Text style={{ fontWeight: 'bold', fontSize: 14, marginLeft: 8, color: '#111827' }}>
                Live Agent Tracking
              </Text>
              <View
                style={{
                  marginLeft: 'auto',
                  backgroundColor: '#D1FAE5',
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: '#10B981',
                    marginRight: 4,
                  }}
                />
                <Text style={{ fontSize: 11, color: '#065F46', fontWeight: '600' }}>LIVE</Text>
              </View>
            </View>

            <MapView
              provider={PROVIDER_GOOGLE}
              style={{ width: '100%', height: 220 }}
              initialRegion={MAP_REGION}
              scrollEnabled={false}
              zoomEnabled={false}
            >
              {/* Pickup Marker */}
              <Marker coordinate={PICKUP} title="Pickup" description="Goodlife Pharmacy, Westlands">
                <View
                  style={{
                    backgroundColor: '#10B981',
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 3,
                    borderColor: '#fff',
                  }}
                >
                  <MapPin size={18} color="#fff" />
                </View>
              </Marker>

              {/* Delivery Marker */}
              <Marker
                coordinate={DELIVERY}
                title="Delivery"
                description="Global Trade Center, Kilimani"
              >
                <View
                  style={{
                    backgroundColor: '#EF4444',
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 3,
                    borderColor: '#fff',
                  }}
                >
                  <MapPin size={18} color="#fff" />
                </View>
              </Marker>

              {/* Agent Marker (animated movement) */}
              <Marker coordinate={agentPosition} title="Agent" description={errand.agent_name ?? 'Agent'}>
                <View
                  style={{
                    backgroundColor: '#111827',
                    width: 42,
                    height: 42,
                    borderRadius: 21,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 3,
                    borderColor: '#fff',
                  }}
                >
                  <User size={20} color="#fff" />
                </View>
              </Marker>

              {/* Route polyline */}
              <Polyline
                coordinates={AGENT_WAYPOINTS}
                strokeColor="#10B981"
                strokeWidth={3}
                lineDashPattern={[8, 4]}
              />
            </MapView>

            {/* Map legend */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-around',
                padding: 10,
                backgroundColor: '#F9FAFB',
              }}
            >
              {[
                { color: '#10B981', label: 'Pickup' },
              { color: '#111827', label: errand.agent_name ?? 'Agent' },
                { color: '#EF4444', label: 'Delivery' },
              ].map((item, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: item.color,
                      marginRight: 5,
                    }}
                  />
                  <Text style={{ fontSize: 11, color: '#6B7280' }}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ padding: 20 }}>
          <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 8 }}>
            {errand.title}
          </Text>
          <Text style={{ fontSize: 15, color: '#4B5563', lineHeight: 24, marginBottom: 20 }}>
            {errand.description}
          </Text>

          {/* Details Grid */}
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              marginBottom: 24,
              backgroundColor: '#F9FAFB',
              borderRadius: 16,
              padding: 16,
            }}
          >
            <View style={{ width: '50%', marginBottom: 12 }}>
              <Text
                style={{
                  fontSize: 11,
                  color: '#9CA3AF',
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}
              >
                Item Budget
              </Text>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827' }}>
                KES {parseFloat(errand.budget).toLocaleString()}
              </Text>
            </View>
            <View style={{ width: '50%', marginBottom: 12 }}>
              <Text
                style={{
                  fontSize: 11,
                  color: '#9CA3AF',
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}
              >
                Agent Fee
              </Text>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#10B981' }}>
                KES {parseFloat(errand.fee).toLocaleString()}
              </Text>
            </View>
            <View style={{ width: '100%' }}>
              <Text
                style={{
                  fontSize: 11,
                  color: '#9CA3AF',
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}
              >
                Route
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MapPin size={14} color="#6B7280" />
                <Text style={{ fontSize: 14, color: '#4B5563', marginLeft: 6 }}>
                  {[errand.pickup_location, errand.delivery_location].filter(Boolean).join(' → ') || 'No location set'}
                </Text>
              </View>
            </View>
          </View>

          {/* ── QR CODE — Secure Drop-off Pass ── */}
          <View
            style={{
              backgroundColor: '#111827',
              borderRadius: 20,
              padding: 20,
              marginBottom: 24,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <QrCode size={18} color="#10B981" />
                <Text style={{ color: '#10B981', fontWeight: 'bold', fontSize: 14, marginLeft: 8 }}>
                  Secure Drop-off Pass
                </Text>
              </View>
              <Text style={{ color: '#9CA3AF', fontSize: 12, lineHeight: 18 }}>
                Agent shows this QR at your door. Scan to confirm safe delivery — NFC-ready Phase 2.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowQR(true)}
              style={{
                backgroundColor: '#10B981',
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 12,
                marginLeft: 12,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>Show QR</Text>
            </TouchableOpacity>
          </View>

          {/* Trust / Agent Card */}
          <View
            style={{ backgroundColor: '#F9FAFB', borderRadius: 20, padding: 16, marginBottom: 24 }}
          >
            <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#111827', marginBottom: 12 }}>
              🛡️ Trust Layer — Vetted Agent
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: '#111827',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#fff' }}>
                  {(errand.agent_name ?? 'AG')
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')}
                </Text>
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#111827' }}>
                    {errand.agent_name ?? 'Unassigned'}
                  </Text>
                  {errand.agent_id && (
                    <ShieldCheck size={16} color="#4F46E5" style={{ marginLeft: 6 }} />
                  )}
                </View>
                <Text style={{ color: '#6B7280', fontSize: 13 }}>
                  ⭐ Verified Agent
                </Text>
                <Text style={{ color: '#10B981', fontSize: 12, marginTop: 2 }}>
                  ✅ ID Verified · Background Checked
                </Text>
              </View>
            </View>
          </View>

          {/* Proof of Work */}
          {errand.proof_image_url && (
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
                📸 Proof of Delivery/Purchase
              </Text>
              <Image
                source={{ uri: errand.proof_image_url! }}
                style={{ width: '100%', height: 280, borderRadius: 20 }}
                contentFit="cover"
              />
            </View>
          )}

          {/* Action Buttons */}
          {errand.status === 'in_progress' && role === 'agent' && (
            <TouchableOpacity
              onPress={handlePickImage}
              disabled={uploading}
              style={{
                backgroundColor: '#000',
                height: 56,
                borderRadius: 16,
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {uploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Camera color="#fff" size={20} />
                  <Text style={{ color: '#fff', fontSize: 17, fontWeight: 'bold', marginLeft: 10 }}>
                    Upload Proof & Complete
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {errand.status === 'completed' && role === 'sender' && (
            <View style={{ gap: 12 }}>
              <Text
                style={{ textAlign: 'center', fontSize: 13, color: '#6B7280', marginBottom: 4 }}
              >
                Review proof above before confirming payment
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <TouchableOpacity
                  onPress={handleDispute}
                  style={{
                    backgroundColor: '#FEE2E2',
                    height: 56,
                    borderRadius: 16,
                    width: '48%',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>Raise Dispute</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleConfirm}
                  style={{
                    backgroundColor: '#10B981',
                    height: 56,
                    borderRadius: 16,
                    width: '48%',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Confirm & Pay</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {errand.status === 'confirmed' && (
            <View
              style={{
                backgroundColor: '#D1FAE5',
                borderRadius: 16,
                padding: 20,
                alignItems: 'center',
              }}
            >
              <CheckCircle size={40} color="#059669" />
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#065F46', marginTop: 10 }}>
                Errand Complete!
              </Text>
              <Text style={{ color: '#065F46', opacity: 0.8, marginTop: 4, textAlign: 'center' }}>
              Payment released to {errand.agent_name ?? 'the agent'}
              </Text>
            </View>
          )}

          {errand.status === 'in_progress' && (
            <View style={{ marginTop: 20, alignItems: 'center' }}>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AlertTriangle size={14} color="#9CA3AF" />
                <Text style={{ color: '#9CA3AF', fontSize: 13, marginLeft: 6 }}>
                  Cancel errand? (Cancellation fee may apply)
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* QR Code Modal */}
      <Modal visible={showQR} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: '#fff',
              borderTopLeftRadius: 30,
              borderTopRightRadius: 30,
              padding: 30,
              paddingBottom: insets.bottom + 30,
              alignItems: 'center',
            }}
          >
            <TouchableOpacity
              onPress={() => setShowQR(false)}
              style={{ position: 'absolute', top: 20, right: 20 }}
            >
              <X size={24} color="#9CA3AF" />
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <QrCode size={20} color="#111827" />
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111827', marginLeft: 8 }}>
                Secure Drop-off Pass
              </Text>
            </View>
            <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 24, textAlign: 'center' }}>
              Agent scans or shows this at the delivery point to confirm identity
            </Text>

            {/* QR Code from qrserver.com */}
            <View
              style={{
                padding: 16,
                backgroundColor: '#F9FAFB',
                borderRadius: 20,
                borderWidth: 1,
                borderColor: '#E5E7EB',
                marginBottom: 20,
              }}
            >
              <Image
                source={{ uri: qrUrl }}
                style={{ width: 220, height: 220 }}
                contentFit="contain"
              />
            </View>

            <View
              style={{
                backgroundColor: '#F9FAFB',
                borderRadius: 14,
                padding: 14,
                width: '100%',
                marginBottom: 16,
              }}
            >
              <View
                style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}
              >
                <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Errand ID</Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#111827' }}>
                  #{String(id).slice(0, 8).toUpperCase()}
                </Text>
              </View>
              <View
                style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}
              >
                <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Agent</Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#111827' }}>
                  {errand.agent_name ?? 'Unassigned'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Status</Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#10B981' }}>
                  ✅ Verified & Active
                </Text>
              </View>
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#FFFBEB',
                padding: 12,
                borderRadius: 12,
                width: '100%',
              }}
            >
              <Text style={{ fontSize: 12, color: '#92400E', flex: 1, lineHeight: 18 }}>
                📡 <Text style={{ fontWeight: 'bold' }}>NFC Phase 2:</Text> This QR will be replaced
                by a tap-to-verify NFC tag at your door — no scanning needed.
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
