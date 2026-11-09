import { Redirect } from 'expo-router';
import type { ComponentType } from 'react';
import { FEATURES, type Feature } from '@/lib/features';

/** Wraps a screen so it is only reachable while its feature is switched on. */
export function featureGate<P extends object>(feature: Feature, Screen: ComponentType<P>) {
  function Gated(props: P) {
    if (!FEATURES[feature]) return <Redirect href="/events" />;
    return <Screen {...props} />;
  }
  Gated.displayName = `FeatureGate(${feature})`;
  return Gated;
}
