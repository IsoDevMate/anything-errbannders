import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ShieldCheck, Camera, Phone, FileText, CheckCircle } from 'lucide-react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import useUpload from '@/utils/useUpload';
import { useAuth } from '@/utils/auth/useAuth';
import { api } from '@/utils/api';

type Step = 'intro' | 'id' | 'selfie' | 'mpesa' | 'done';

export default function AgentApply() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [upload, { loading: uploading }] = useUpload();
  const { auth } = useAuth();

  const [step, setStep] = useState<Step>('intro');
  const [idImage, setIdImage] = useState<string | null>(null);
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [mpesa, setMpesa] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const pickImage = async (type: 'id' | 'selfie') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      aspect: type === 'id' ? [3, 2] : [1, 1],
    });
    if (result.canceled) return;

    const uploadResult = await upload({ reactNativeAsset: result.assets[0] as any });
    if ('url' in uploadResult) {
      if (type === 'id') {
        setIdImage(uploadResult.url);
        setStep('selfie');
      } else {
        setSelfieImage(uploadResult.url);
        setStep('mpesa');
      }
    }
  };

  const handleSubmit = async () => {
    if (!mpesa.match(/^0[17]\d{8}$/)) {
      Alert.alert('Invalid number', 'Enter a valid Safaricom or Airtel M-Pesa number (07xx or 01xx)');
      return;
    }
    if (!auth?.user?.id || !idImage || !selfieImage) return;

    setSubmitting(true);
    try {
      await api.agent.apply({
        userId: auth.user.id,
        idImageUrl: idImage,
        selfieImageUrl: selfieImage,
        mpesaNumber: mpesa,
      });
      setStep('done');
    } catch (err: any) {
      Alert.alert('Submission Failed', err.message ?? 'Please try again');
    } finally {
      setSubmitting(false);
    }
  };

  const STEPS: Record<Step, number> = { intro: 0, id: 1, selfie: 2, mpesa: 3, done: 4 };
  const progress = STEPS[step] / 4;

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
        }}
      >
        <TouchableOpacity onPress={() => (step === 'intro' ? router.back() : setStep('intro'))} style={{ marginRight: 15 }}>
          <ChevronLeft color="#000" size={24} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: 'bold', flex: 1 }}>Become an Agent</Text>
        <Text style={{ fontSize: 13, color: '#9CA3AF' }}>{STEPS[step]}/4</Text>
      </View>

      {/* Progress bar */}
      {step !== 'done' && (
        <View style={{ height: 3, backgroundColor: '#F3F4F6' }}>
          <View style={{ height: 3, backgroundColor: '#10B981', width: `${progress * 100}%` }} />
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 40 }}
      >
        {/* ── INTRO ── */}
        {step === 'intro' && (
          <View>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: '#D1FAE5',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 24,
              }}
            >
              <ShieldCheck size={40} color="#059669" />
            </View>

            <Text style={{ fontSize: 26, fontWeight: 'bold', color: '#111827', marginBottom: 12 }}>
              Earn by doing errands
            </Text>
            <Text style={{ fontSize: 16, color: '#4B5563', lineHeight: 26, marginBottom: 32 }}>
              Help people in your area with small tasks — shopping, queuing, deliveries — and earn KES 150–500 per job.
            </Text>

            {[
              { icon: '🪪', title: 'National ID verification', desc: 'We confirm who you are — builds sender trust.' },
              { icon: '🤳', title: 'Selfie check', desc: 'Matched against your ID to prevent fraud.' },
              { icon: '📱', title: 'M-Pesa number', desc: 'Instant payouts after every confirmed errand.' },
            ].map((item, i) => (
              <View
                key={i}
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  marginBottom: 20,
                  backgroundColor: '#F9FAFB',
                  padding: 16,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                }}
              >
                <Text style={{ fontSize: 28, marginRight: 14 }}>{item.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', fontSize: 15, color: '#111827', marginBottom: 4 }}>
                    {item.title}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#6B7280' }}>{item.desc}</Text>
                </View>
              </View>
            ))}

            <TouchableOpacity
              onPress={() => setStep('id')}
              style={{
                backgroundColor: '#000',
                height: 56,
                borderRadius: 16,
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: 8,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: 'bold' }}>
                Start Verification
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP 1: National ID ── */}
        {step === 'id' && (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <FileText size={24} color="#111827" />
              <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#111827', marginLeft: 10 }}>
                Upload your ID
              </Text>
            </View>
            <Text style={{ color: '#6B7280', fontSize: 14, marginBottom: 32, lineHeight: 22 }}>
              Take a clear photo of your National ID (front side). Make sure all text is readable and not cut off.
            </Text>

            <TouchableOpacity
              onPress={() => pickImage('id')}
              disabled={uploading}
              style={{
                height: 200,
                borderRadius: 20,
                borderWidth: 2,
                borderColor: idImage ? '#10B981' : '#E5E7EB',
                borderStyle: idImage ? 'solid' : 'dashed',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#F9FAFB',
                overflow: 'hidden',
              }}
            >
              {idImage ? (
                <Image source={{ uri: idImage }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              ) : uploading ? (
                <ActivityIndicator size="large" color="#10B981" />
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <Camera size={40} color="#9CA3AF" />
                  <Text style={{ color: '#9CA3AF', marginTop: 10, fontSize: 15 }}>Tap to upload</Text>
                </View>
              )}
            </TouchableOpacity>

            <View
              style={{
                backgroundColor: '#FFFBEB',
                padding: 14,
                borderRadius: 12,
                marginTop: 20,
                flexDirection: 'row',
              }}
            >
              <Text style={{ fontSize: 18, marginRight: 10 }}>💡</Text>
              <Text style={{ fontSize: 13, color: '#92400E', flex: 1, lineHeight: 20 }}>
                Your ID is encrypted and used only for identity verification. It is never shared with senders.
              </Text>
            </View>
          </View>
        )}

        {/* ── STEP 2: Selfie ── */}
        {step === 'selfie' && (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Camera size={24} color="#111827" />
              <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#111827', marginLeft: 10 }}>
                Take a selfie
              </Text>
            </View>
            <Text style={{ color: '#6B7280', fontSize: 14, marginBottom: 32, lineHeight: 22 }}>
              Look directly at the camera in good lighting. We match this against your ID to confirm it's really you.
            </Text>

            <TouchableOpacity
              onPress={() => pickImage('selfie')}
              disabled={uploading}
              style={{
                height: 260,
                borderRadius: 130,
                width: 260,
                alignSelf: 'center',
                borderWidth: 2,
                borderColor: selfieImage ? '#10B981' : '#E5E7EB',
                borderStyle: selfieImage ? 'solid' : 'dashed',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#F9FAFB',
                overflow: 'hidden',
                marginBottom: 32,
              }}
            >
              {selfieImage ? (
                <Image source={{ uri: selfieImage }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              ) : uploading ? (
                <ActivityIndicator size="large" color="#10B981" />
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <Camera size={48} color="#9CA3AF" />
                  <Text style={{ color: '#9CA3AF', marginTop: 10, fontSize: 15 }}>Tap to take selfie</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ── STEP 3: M-Pesa ── */}
        {step === 'mpesa' && (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Phone size={24} color="#111827" />
              <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#111827', marginLeft: 10 }}>
                M-Pesa number
              </Text>
            </View>
            <Text style={{ color: '#6B7280', fontSize: 14, marginBottom: 32, lineHeight: 22 }}>
              Agent fees are paid instantly to this number after each confirmed errand. Must be registered to your name.
            </Text>

            <View
              style={{
                backgroundColor: '#F9FAFB',
                borderRadius: 14,
                paddingHorizontal: 16,
                borderWidth: 1,
                borderColor: '#E5E7EB',
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 24,
              }}
            >
              <Text style={{ fontSize: 18, marginRight: 8 }}>🇰🇪</Text>
              <TextInput
                style={{ flex: 1, height: 56, fontSize: 18, fontWeight: '600' }}
                placeholder="0712 345 678"
                keyboardType="phone-pad"
                value={mpesa}
                onChangeText={setMpesa}
                maxLength={10}
              />
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting || mpesa.length < 10}
              style={{
                backgroundColor: submitting || mpesa.length < 10 ? '#9CA3AF' : '#000',
                height: 56,
                borderRadius: 16,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontSize: 17, fontWeight: 'bold' }}>
                  Submit Application
                </Text>
              )}
            </TouchableOpacity>

            <Text style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: 16 }}>
              By submitting, you agree to our Agent Terms of Service and consent to background screening.
            </Text>
          </View>
        )}

        {/* ── DONE ── */}
        {step === 'done' && (
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <CheckCircle size={80} color="#10B981" />
            <Text style={{ fontSize: 26, fontWeight: 'bold', color: '#111827', marginTop: 24, textAlign: 'center' }}>
              Application Submitted!
            </Text>
            <Text
              style={{
                fontSize: 15,
                color: '#4B5563',
                textAlign: 'center',
                lineHeight: 26,
                marginTop: 12,
                marginBottom: 40,
              }}
            >
              We'll verify your details within 24 hours. You'll get an M-Pesa notification once approved. Meanwhile, you can browse available errands.
            </Text>

            <View
              style={{
                backgroundColor: '#F9FAFB',
                borderRadius: 20,
                padding: 20,
                width: '100%',
                marginBottom: 32,
              }}
            >
              {[
                { label: 'ID Upload', status: '✅ Submitted' },
                { label: 'Selfie Check', status: '✅ Submitted' },
                { label: 'M-Pesa', status: '✅ Linked' },
                { label: 'Background Check', status: '⏳ Pending (24h)' },
              ].map((item, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingVertical: 10,
                    borderBottomWidth: i < 3 ? 1 : 0,
                    borderColor: '#E5E7EB',
                  }}
                >
                  <Text style={{ fontSize: 14, color: '#4B5563' }}>{item.label}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>{item.status}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                backgroundColor: '#000',
                height: 56,
                borderRadius: 16,
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: 'bold' }}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
