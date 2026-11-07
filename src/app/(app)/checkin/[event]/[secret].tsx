import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Btn, H, P, Screen, TopBar } from '@/components/ui';
import { checkIn } from '@/lib/checkin';

/** Opened when someone scans the entrance code with the phone's camera app (mosh://checkin/...). */
export default function CheckinLink() {
  const { event, secret } = useLocalSearchParams<{ event: string; secret: string }>();
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  useEffect(() => {
    checkIn(event, secret).then((e) => { if (e) setErr(e); else setDone(true); });
  }, [event, secret]);
  return (
    <>
      <TopBar back title="Einchecken" />
      <Screen>
        <H size={34}>{err ? 'Check-in nicht möglich' : done ? 'Du bist eingecheckt' : 'Einen Moment …'}</H>
        {err ? <P>{err}</P> : null}
        {done && <Btn solid title="Leute hier treffen" onPress={() => router.replace({ pathname: '/swipe', params: { id: event } })} style={{ flex: 0 }} />}
      </Screen>
    </>
  );
}
