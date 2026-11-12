# ClubOS demo video

30-second, 16:9, dark-mode product video made with [Remotion](https://remotion.dev).

```bash
npm install
npm run studio   # preview and scrub in the browser
npm run render   # writes out/clubos-demo.mp4
```

- Screenshots live in `public/shots/` (taken from the app in dark mode).
- **Music:** drop a song you're allowed to use at `public/music.mp3` and re-render. It fades in and out automatically.
- Scene timing is at the top of `src/ClubOSDemo.tsx`.
