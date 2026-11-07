import { useState } from 'react';
import { Text, View } from 'react-native';
import { useMe } from '@/lib/auth';
import { REPORT_REASONS } from '@/lib/constants';
import { errorText, supabase } from '@/lib/supabase';
import { C } from '@/lib/theme';
import { Btn, Field, P, Pill, Row, Sheet, T } from './ui';

export type ReportTarget = { user?: string; post?: string; comment?: string; event?: string };

/** Reporting flow used for people, posts, comments and events. */
export function ReportSheet({ target, visible, onClose, onDone, blockToo }: {
  target: ReportTarget; visible: boolean; onClose: () => void; onDone: (msg: string) => void; blockToo?: boolean;
}) {
  const me = useMe();
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const send = async () => {
    setBusy(true); setErr('');
    const { error } = await supabase.from('reports').insert({
      reporter_id: me.id, reason, details, target_user: target.user ?? null, target_post: target.post ?? null,
      target_comment: target.comment ?? null, target_event: target.event ?? null,
    });
    if (!error && blockToo && target.user) await supabase.rpc('block_user', { p_user: target.user });
    setBusy(false);
    if (error) return setErr(errorText(error));
    setReason(''); setDetails('');
    onDone(blockToo && target.user ? 'Gemeldet und blockiert. Danke, wir prüfen das.' : 'Danke. Wir prüfen die Meldung.');
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Melden">
      <P>Was ist passiert? Die Meldung ist vertraulich.</P>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {REPORT_REASONS.map((r) => <Pill key={r} label={r} color={C.date} active={reason === r} onPress={() => setReason(r)} />)}
      </View>
      <Field label="Details (optional)" value={details} onChangeText={setDetails} multiline maxLength={500} />
      {err ? <Text style={[T.semi(14), { color: C.danger }]}>{err}</Text> : null}
      <Row>
        <Btn title="Abbrechen" onPress={onClose} />
        <Btn solid title={blockToo && target.user ? 'Melden und blockieren' : 'Melden'} disabled={!reason} loading={busy} onPress={send} />
      </Row>
    </Sheet>
  );
}

/** Small transient message. */
export function useToast() {
  const [msg, setMsg] = useState('');
  const show = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 2600); };
  const node = msg ? (
    <View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, bottom: 30, alignItems: 'center' }}>
      <Text style={[T.semi(15), { backgroundColor: C.ink, color: C.white, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 4, overflow: 'hidden', textAlign: 'center' }]}>{msg}</Text>
    </View>
  ) : null;
  return { show, node };
}
