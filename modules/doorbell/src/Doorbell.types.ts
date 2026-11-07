export type RingEventPayload = {
  /** IP address of the sender, or "test" for a test ring. */
  source: string;
};

export type DoorbellModuleEvents = {
  onRing: (params: RingEventPayload) => void;
  onRingStop: () => void;
  onPreviewEnd: () => void;
};
