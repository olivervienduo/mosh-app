import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Share, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Btn, H, Mono, P, Row, Screen, Sheet, T, TopBar } from '@/components/ui';
import { fetchEvent } from '@/lib/events';
import { longDate } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import type { EventRow } from '@/lib/types';
import { C } from '@/lib/theme';

/** Organiser view: the QR code guests scan at the entrance. */
export default function EventQr() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [code, setCode] = useState<string | null>(null);
  const [e, setE] = useState<EventRow | null>(null);
  const [confirm, setConfirm] = useState(false);
  const load = useCallback(async () => {
    const [{ data }, ev] = await Promise.all([supabase.rpc('event_checkin_code', { p_event: id }), fetchEvent(id)]);
    setCode((data as string) ?? null); setE(ev);
  }, [id]);
  useEffect(() => { load(); }, [load]);
  const rotate = async () => { await supabase.rpc('rotate_checkin_code', { p_event: id }); setConfirm(false); load(); };

  return (
    <>
      <TopBar back title="Check-in-Code" />
      <Screen>
        <H size={34}>Einlass-Code</H>
        <P>Häng diesen Code am Einlass auf oder zeig ihn am Handy. Gäste scannen ihn in MOSHCHAT und sind damit eingecheckt. Nur wer eingecheckt ist, erscheint als „gerade hier“.</P>
        <View style={{ alignItems: 'center', backgroundColor: e?.color ?? C.white, borderRadius: 30, borderWidth: 2.5, borderColor: C.ink, padding: 22, gap: 14 }}>
          <Text style={T.display(26)}>{e?.title ?? ''}</Text>
          <View style={{ backgroundColor: C.white, padding: 16, borderRadius: 16, borderWidth: 2.5, borderColor: C.ink }}>
            {code ? <QRCode value={code} size={230} color={C.ink} backgroundColor={C.white} /> : <View style={{ width: 230, height: 230 }} />}
          </View>
          <Mono>{e ? longDate(e) : ''}</Mono>
          <Text style={T.display(20)}>Mit MOSHCHAT scannen und einchecken</Text>
        </View>
        <Row>
          <Btn title="Teilen" onPress={() => code && Share.share({ message: `Check-in für ${e?.title}: ${code}` })} />
          <Btn title="Neuen Code erzeugen" onPress={() => setConfirm(true)} />
        </Row>
        <P muted style={{ fontSize: 14 }}>Der Code funktioniert nur an den Tagen des Events. Wurde er weitergegeben, erzeugst du einfach einen neuen.</P>
      </Screen>
      <Sheet visible={confirm} onClose={() => setConfirm(false)} title="Neuen Code erzeugen?">
        <P>Der alte Code funktioniert danach nicht mehr. Ausgedruckte Codes musst du ersetzen.</P>
        <Row><Btn title="Abbrechen" onPress={() => setConfirm(false)} /><Btn solid title="Neuer Code" onPress={rotate} /></Row>
      </Sheet>
    </>
  );
}
