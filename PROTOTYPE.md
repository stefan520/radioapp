# Retro radio prototype

Throwaway design exploration on branch `prototype/retro-radio`. Production is
unchanged on `main`; these variants are not a replacement implementation.

Run `bun run prototype`, then open <http://localhost:3004/>.

- `?variant=walnut`: horizontal walnut cabinet, speaker beside the display.
- `?variant=transistor`: portable receiver with a vertical channel bank.
- `?variant=hifi`: wide dark deck with integrated channel keys.

The bottom switcher changes the URL. Stations, audio and volume work; metadata
and Aakirkeby weather are read-only live requests. State stays in memory.
No installation, album editing, persistence, or automatic screensaver is added
to this visual exploration. Verdict is pending the user's comparison.

Promote the selected direction deliberately; keep this exploratory code out of
main and the production deployment.
