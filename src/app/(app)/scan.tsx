import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useIsFocused } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Btn, H, P, Screen, T, Toggle, TopBar } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { checkIn, parseCheckin } from '@/lib/checkin';
import { fetchEvent } from '@/lib/events';
import type { EventRow } from '@/lib/types';
import { C } from '@/lib/theme';

/** Check-in scanner: guests scan the organiser's QR code at the entrance. */
export default function Scan() {
  const { profile, updateProfile } = useAuth();
  const [perm, requestPerm] = useCameraPermissions();
  const focused = useIsFocused();
  const [state, setState] = useState<'scan' | 'busy' | 'done' | 'error'>('scan');
  const [msg, setMsg] = useState('');
  const [event, setEvent] = useState<EventRow | null>(null);

  const onScan = async (data: string) => {
    if (state !== 'scan') return;
    const c = parseCheckin(data);
    if (!c) { setState('error'); setMsg('Das ist kein Mosh-Check-in-Code.'); return; }
    setState('busy');
    const e = await checkIn(c.event, c.secret);
    if (e) { setState('error'); setMsg(e); return; }
    setEvent(await fetchEvent(c.event));
    setState('done');
  };

  if (!perm) return null;
  return (
    <>
      <TopBar back title="Einchecken" />
      {state === 'done' && event ? (
        <Screen>
          <View style={{ alignItems: 'center', gap: 12, paddingTop: 20 }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: C.green, borderWidth: 3, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' }}><Text style={T.display(36)}>✓</Text></View>
            <H size={34} style={{ textAlign: 'center' }}>Du bist eingecheckt</H>
            <P style={{ textAlign: 'center' }}>{event.title}. {profile?.live_visible ? 'Andere sehen dich jetzt als „gerade hier“.' : 'Du bist für andere unsichtbar.'}</P>
          </View>
          <Toggle value={!!profile?.live_visible} onChange={(v) => updateProfile({ live_visible: v })} title="Für andere sichtbar" sub="Nur „gerade hier“, nie dein genauer Standort" />
          <Btn solid title="Leute hier treffen" onPress={() => router.replace({ pathname: '/swipe', params: { id: event.id } })} style={{ flex: 0 }} />
        </Screen>
      ) : !perm.granted ? (
        <Screen>
          <H size={30}>Kamera erlauben</H>
          <P>Zum Einchecken scannst du den QR-Code am Einlass. Dafür braucht Mosh einmalig Zugriff auf die Kamera.</P>
          {perm.canAskAgain ? <Btn solid title="Zugriff erlauben" onPress={requestPerm} style={{ flex: 0 }} />
            : <Btn solid title="Einstellungen öffnen" onPress={() => Linking.openSettings()} style={{ flex: 0 }} />}
        </Screen>
      ) : (
        <View style={{ flex: 1, backgroundColor: C.ink }}>
          {focused && (
            <CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={state === 'scan' ? ({ data }) => onScan(data) : undefined} />
          )}
          <View style={{ position: 'absolute', top: '22%', alignSelf: 'center', width: 250, height: 250, borderWidth: 4, borderColor: C.green, borderRadius: 24 }} />
          <View style={{ position: 'absolute', left: 16, right: 16, bottom: 40, backgroundColor: C.paper, borderRadius: 22, borderWidth: 2.5, borderColor: C.ink, padding: 16, gap: 10 }}>
            <Text style={T.semi(16)}>{state === 'busy' ? 'Prüfe Code …' : state === 'error' ? msg : 'Halte die Kamera auf den QR-Code am Einlass.'}</Text>
            {state === 'error' && <Btn solid title="Nochmal scannen" onPress={() => { setState('scan'); setMsg(''); }} style={{ flex: 0 }} />}
          </View>
        </View>
      )}
    </>
  );
}
