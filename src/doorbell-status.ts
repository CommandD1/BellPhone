import { useEventListener } from "expo";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { AppState, PermissionsAndroid, Platform } from "react-native";

import Doorbell from "../modules/doorbell";

export const UDP_PORT = 4444;
export const UDP_MESSAGE = "ESP32_ALERT";

export type DoorbellStatus = {
  listening: boolean;
  ringing: boolean;
  notificationsOk: boolean;
  batteryOk: boolean;
  fullScreenOk: boolean;
};

export async function hasNotificationPermission() {
  if (Number(Platform.Version) < 33) return true;
  return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
}

export async function readStatus(): Promise<DoorbellStatus> {
  return {
    listening: Doorbell.isListening(),
    ringing: Doorbell.isRinging(),
    notificationsOk: await hasNotificationPermission(),
    batteryOk: Doorbell.isIgnoringBatteryOptimizations(),
    fullScreenOk: Doorbell.canUseFullScreenIntent(),
  };
}

export function allPermissionsOk(s: DoorbellStatus) {
  return s.notificationsOk && s.batteryOk && s.fullScreenOk;
}

export function startDoorbell() {
  return Doorbell.startListening(UDP_PORT, UDP_MESSAGE);
}

/** Live status; refreshes on focus, on return from system settings and on ring events. */
export function useDoorbellStatus() {
  const [status, setStatus] = useState<DoorbellStatus | null>(null);

  const refresh = useCallback(() => {
    readStatus().then(setStatus);
  }, []);

  useFocusEffect(refresh);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  useEventListener(Doorbell, "onRing", refresh);
  useEventListener(Doorbell, "onRingStop", refresh);

  // The service starts/stops asynchronously, so check again shortly after.
  const refreshSoon = useCallback(() => {
    refresh();
    setTimeout(refresh, 700);
  }, [refresh]);

  return { status, refresh: refreshSoon };
}
