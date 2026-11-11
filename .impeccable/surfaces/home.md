# Stueradio home

Mode: Operate. Target: `index.html`.

## Direction contract

FORM: Scandinavian radio atelier; seed:860dbd76f5c57388. This is a code-led
redesign, under the user's instruction to preserve retro character and icons.
No approved image comp. The repository's previous full-width radio becomes a
two-column working screen with a separate station selector and living-room rail.

OWN-WORLD: Warm paper (#eee9dc), pine green (#263e34), cream (#efe4c5), walnut
(#674432), and oxide (#a4472c). Georgia headings and familiar sans-serif controls.
Use the existing station marks, Unicode function icons, weather icons, and PWA
icon: the user's preservation request takes precedence over icon replacement.
Speaker perforation and tuning marks refer directly to the preserved radio.

FIRST VIEWPORT: Radio controls lead at left. Real stations sit in a legible
icon-only button grid below without a section heading. Aakirkeby weather occupies
the right column. Photos open through Se diashow in navigation, with no inline
preview. The slideshow supports horizontal swipes, tap-to-close, and a fifteen
second inactivity trigger. On portrait tablets and phones, weather follows radio.

SIGNATURE: Selecting a station moves the amber tuner needle and updates the
large station name, selected button, and track information. Play, connecting,
pause, and failure states are visible. Large controls work by touch and keyboard.

CONTINUITY: Preserve all 11 stations, streams, APIs, local photos, weather,
fullscreen, installation, clock, and offline shell. Add useful inline preferences
for slideshow speed and weather visibility; keep those preferences locally.

## Validation

Screenshots in `.impeccable/review/` cover 1440px desktop, 1024px landscape
tablet, 768px portrait tablet, 390px mobile, and 320px small mobile. Weather and
media behavior in the automated UI checks use controlled fixtures; screenshots
are test evidence, not example content shipped in the app. Real service-worker
offline loading is checked separately. A separate unmocked playback check
confirmed that the Retro-Radio MP3 stream decodes and advances playback time.
Other live station streams were preserved but not individually verified.

The mechanical detector ran once. Text sizes and low-contrast body/hover text
were corrected. The hidden album image intentionally has no URL until real
artwork loads. Warm cream, preserved icons, and functional tuner tick marks
are deliberate consequences of the user's retro brief.
