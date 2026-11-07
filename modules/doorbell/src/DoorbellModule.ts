import { NativeModule, requireNativeModule } from 'expo';

import { DoorbellModuleEvents } from './Doorbell.types';

declare class DoorbellModule extends NativeModule<DoorbellModuleEvents> {
  /** Starts the native foreground service that listens for the UDP packet (survives standby and reboots). */
  startListening(port: number, message: string): Promise<void>;
  stopListening(): Promise<void>;
  isListening(): boolean;
  /** Whether the listener is switched on (also restarted after reboot). */
  isEnabled(): boolean;
  isRinging(): boolean;
  testRing(): Promise<void>;
  stopRinging(): Promise<void>;
  /** IDs of all bundled ringtones (file names in android/src/main/res/raw without extension). */
  getRingtones(): string[];
  getSelectedRingtone(): string | null;
  setSelectedRingtone(id: string): void;
  /** Plays the ringtone once, as loud as a real ring. Fires onPreviewEnd when done. */
  previewRingtone(id: string): Promise<void>;
  stopPreview(): Promise<void>;
  /** Whether the first-start setup was completed. */
  isOnboarded(): boolean;
  setOnboarded(done: boolean): void;
  isIgnoringBatteryOptimizations(): boolean;
  requestIgnoreBatteryOptimizations(): Promise<void>;
  /** Android 14+: whether the ring screen may pop up above the lock screen. */
  canUseFullScreenIntent(): boolean;
  openFullScreenIntentSettings(): Promise<void>;
}

export default requireNativeModule<DoorbellModule>('Doorbell');
