---
name: Stueradio
description: A warm Scandinavian living-room radio with tactile controls.
colors:
  paper: "#eee9dc"
  surface: "#f8f5ec"
  ink: "#30382c"
  muted: "#5d6152"
  line: "#d4d1c1"
  green: "#263e34"
  cream: "#efe4c5"
  accent: "#a4472c"
  wood: "#674432"
  play-ink: "#fff3dc"
  play-hover: "#853720"
  station: "#f4f0e5"
  station-hover: "#e2e2d3"
  station-selected: "#dfe4d6"
  weather: "#e0e4d5"
  controls: "#e8dfc9"
typography:
  display:
    fontFamily: "Georgia, serif"
    fontSize: "3.25rem"
    fontWeight: 400
    lineHeight: 1.03
    letterSpacing: "-.035em"
  headline:
    fontFamily: "Georgia, serif"
    fontSize: "2.4rem"
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: "-.035em"
  title:
    fontFamily: "Georgia, serif"
    fontSize: "1.4rem"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-.025em"
  body:
    fontFamily: '"Segoe UI", sans-serif'
    fontSize: ".88rem"
  label:
    fontFamily: '"Segoe UI", sans-serif'
    fontSize: ".75rem"
rounded:
  frame: "3px"
  control: "6px"
  station: "7px"
  panel: "10px"
  radio: "15px"
  round: "50%"
spacing:
  compact: "8px"
  regular: "16px"
  section: "24px"
  columns: "32px"
components:
  button-play:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.play-ink}"
    rounded: "{rounded.round}"
    size: "58px"
  button-play-hover:
    backgroundColor: "{colors.play-hover}"
  button-icon:
    rounded: "{rounded.control}"
    size: "44px"
  button-station:
    backgroundColor: "{colors.station}"
    rounded: "{rounded.station}"
    padding: "11px 4px 9px"
  button-station-hover:
    backgroundColor: "{colors.station-hover}"
  button-station-selected:
    backgroundColor: "{colors.station-selected}"
  navigation-link:
    textColor: "{colors.muted}"
    rounded: "{rounded.control}"
    padding: "8px 15px"
  weather-panel:
    backgroundColor: "{colors.weather}"
    rounded: "{rounded.panel}"
    padding: "21px 20px 16px"
  settings-select:
    backgroundColor: "{colors.paper}"
    padding: "6px"
---

# Design System: Stueradio

## Overview

**Creative North Star: "Scandinavian radio atelier"**

A quiet, tactile radio for a tablet in the living room. Warm paper surrounds a pine-green display, walnut enclosure, cream controls, and restrained oxide accents. Serif headings carry the retro character; familiar sans-serif controls support everyday use.

**Key Characteristics:**

- Material depth concentrated in the radio and photo frame.
- Large station names, direct station selection, and visible playback feedback.
- Preserved station identities, Unicode function icons, weather icons, and PWA icon.

This records the implemented system. `src/styles.css` remains authoritative for exact selectors, one-off treatments, and responsive overrides.

## Colors

### Primary

Pine green anchors the display, selected controls, and volume input. Oxide identifies the main play action, keyboard focus, and small brand details. Cream supplies readable display text.

### Neutral

Warm paper is the page and installed PWA background/theme color. Surface supports secondary areas; ink and muted support text; line separates sections. Walnut encloses the receiver. Weather uses a soft sage fill; the controls use warmer cream.

Station-brand colors remain attached to their existing identities.

**The Continuity Rule.** Preserve existing station identities and icons when extending the interface.

## Typography

Georgia supplies station names, page headings, section headings, and the wordmark. Segoe UI with a sans-serif fallback supplies controls and information. The root size is (16px); no font download is required.

The frontmatter records the default display, headline, title, body, and label roles. Responsive rules adjust the large headings. Metadata uses (.95rem) for the track title; the clock uses (1.7rem) with tabular numbers. Small supporting labels stay at (.75rem).

## Layout

The page has a maximum width of (1480px) and horizontal padding of (4%). The header reaches (1600px). The default home grid is `minmax(0, 1fr) minmax(285px, .43fr)` with a (32px) gap. Station buttons use six equal columns.

- At widths up to (1150px), page padding becomes (3%), the right column becomes (285px), and the column gap becomes (24px).
- At widths up to (850px), the main layout stacks and weather/photos form two columns.
- At widths up to (580px), navigation wraps, weather/photos stack, the decorative speaker hides, controls wrap, and stations use four columns. Page padding becomes (5%).
- At widths up to (360px), stations use three columns.
- At widths from (1500px), display and photo minimum heights increase.
- At widths from (851px) with height up to (850px), a compact landscape treatment reduces vertical padding, radio display height, and photo height.

Keep grid children shrinkable and long station names wrappable. Radio controls lead the reading and keyboard order.

## Elevation & Depth

Depth expresses physical objects: the walnut radio casts a soft shadow, the speaker uses inset shading and a fine perforation pattern, and the photo has a shallow paper-frame shadow. Station buttons and weather rely primarily on borders and tonal fills. Exact shadows live in the sidecar.

## Shapes

The enclosure is gently rounded; its display/control insert shares smaller joined corners. Station buttons are softly rectangular. Album art and photo frames have tighter corners. The play control, live indicator, and selected-station dot are circular. Preserve the tuner scale and speaker perforations as radio-specific details.

## Components

- **Playback controls:** oxide circular play control (58px), reduced to (52px) in mobile and compact landscape layouts. Hover darkens the fill; press moves it down (1px). Previous/next and mute use transparent backgrounds with warm hover fills.
- **Station buttons:** bordered cream buttons with a (91px) default minimum height. Hover changes fill and border; selection adds a green border, sage fill, and corner dot. Keep each station's existing mark.
- **Navigation and icon buttons:** navigation has a tonal active state. Default icon buttons are (44px) square; mobile header buttons are (38px) wide and (44px) high. Preserve Unicode glyphs and accessible Danish names.
- **Weather:** a horizontally scrollable hourly forecast for the next 24 hours, with current conditions first, arrow navigation, rain probabilities, and a compact tomorrow summary. Keep the sage panel, divided footer, and inline retry state.
- **Photo frame:** pale paper mat around a cropped image. The empty state is an actionable upload button; separate add and previous/next controls remain available. Disabled navigation is dimmed.
- **Inputs:** settings use a native select with a bordered paper background; volume uses a slim track and green thumb. Settings expand inline.
- **Keyboard and motion:** buttons, links, inputs, and selects receive an oxide outline (3px) offset (5px). A skip link appears on focus. Reduced motion disables transitions/animations and smooth scrolling. Default station/play transitions last (160ms); the tuner needle moves over (220ms) with ease-out.

## Do's and Don'ts

- Do preserve the retro materials, existing Unicode/weather icons, station identities, and app icon as requested by the user.
- Do keep interface copy and accessible action names in Danish.
- Do keep playback state and station selection visible alongside the tuner movement.
- Do retain visible keyboard focus and the reduced-motion override.
- Don't replace the radio, weather, or photo functions with decorative placeholders.
