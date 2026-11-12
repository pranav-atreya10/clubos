# ClubOS demo video

43-second, 16:9, dark-mode product video made with [Remotion](https://remotion.dev).

```bash
npm install
npm run studio   # preview and scrub in the browser
npm run render   # writes out/clubos-demo.mp4
```

- Screenshots live in `public/shots/` (taken from the app in dark mode).
- **Music:** drop a song you're allowed to use at `public/music.mp3` and re-render. It fades in and out automatically.
- Scenes are timed to the song's beats (`src/beats.ts`, ~99 BPM). Every cut is on a bar, and the end card lands on the chorus (beat 62, ~37.8s). Edit `CUTS` in `src/ClubOSDemo.tsx` to retime.
