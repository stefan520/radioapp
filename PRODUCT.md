# Stueradio

<!-- impeccable:product-schema 1 -->

## Platform

web

## Product Purpose

A Danish radio PWA with station playback, now-playing metadata, album artwork,
Aakirkeby weather, a clock, and a private photo frame.

## Operating Context

The user confirms the primary context: a tablet in the living room, combining
radio, weather, and photos. Mobile and desktop layouts must also work.

## Capabilities and Constraints

Vanilla JavaScript and CSS, with a Bun server and Docker packaging. Photos stay
in browser IndexedDB. Streams, weather, metadata, and artwork need network
access; the installed shell supports offline loading. Users can save up to
three shared Google Photos album links in browser localStorage. The server
reads public album pages without Google login; it keeps only a short-lived
in-memory cache. The frame mixes still photos, checks for updates every ten
minutes while visible, and preserves the last successful slideshow on refresh
errors. Local photos remain a separate source and stay in IndexedDB. Shared
albums require network access; their unofficial integration can change when
Google changes its pages. The navigation button Se diashow starts an immersive
slideshow; there is no photo preview on the home screen. It also starts after
fifteen seconds of inactivity with images available. Horizontal swipes move
between photos; a tap returns to the app. Radio playback continues. Activation waits while
settings are open. Screen Wake Lock is enabled by default with a saved opt-out
and a visible status, subject to browser and device support. Preserve existing
stations and features. Interface copy is Danish.

## Brand Commitments

The user requests a complete redesign while preserving the retro character and
existing icons. Keep the Stueradio name, station identities, and app icon.
