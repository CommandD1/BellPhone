/**
 * Klingeltöne
 * ===========
 * Neuen Klingelton hinzufügen:
 *   1. Datei (.mp3, .ogg oder .wav) nach  modules/doorbell/android/src/main/res/raw/  kopieren.
 *      Der Dateiname darf nur Kleinbuchstaben, Ziffern und _ enthalten, z. B. "westminster_gong.mp3".
 *   2. Optional hier unten einen schönen Anzeigenamen eintragen (sonst wird er aus dem Dateinamen gebildet).
 *   3. App neu bauen (eas build), denn Klingeltöne sind Teil der nativen App.
 *
 * Die App findet alle Dateien in diesem Ordner automatisch. Der erste (alphabetisch) ist der Standard.
 */
const NAMES: Record<string, string> = {
  ding_dong: "Ding-Dong",
  brass: "Bronze",
  drei_klang: "Drei Klang",
  big_ben: "Big Ben",
  kuckuck: "Kuckuck",
  fahrrad: "Fahrrad",
};

export function ringtoneName(id: string): string {
  return (
    NAMES[id] ??
    id
      .split("_")
      .filter(Boolean)
      .map((word) => word[0].toUpperCase() + word.slice(1))
      .join(" ")
  );
}
