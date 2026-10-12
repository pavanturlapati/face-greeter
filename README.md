# Face Greeter

Step in front of your camera and a door opens with a spoken greeting matched to your local time: good morning, afternoon, evening or night.

Everything runs in your browser. Free and open source (MIT).

## Privacy

**Saved (in your browser's local storage only):**
- The name you type
- A list of 128 numbers (a "face fingerprint") for each enrollment snapshot

**Not saved:**
- No photos or video are stored
- Nothing is uploaded to any server, and there are no accounts or cookies
- Other visitors and other devices cannot see your data

Use the "Delete all enrolled faces" button to erase everything at any time.

## Limitations

This is a fun demo, not a security system. It uses an ordinary 2D camera, so a photo of you may fool it. Do not use it to protect anything.

## Run locally

```
npm install
npm run dev
```

Open the printed URL (camera access works on `localhost`). Other scripts: `npm test`, `npm run build`.

## Deploy (Cloudflare Pages)

Build command: `npm run build`, output directory: `dist`.

## Credits

Built by [Pavan Turlapati](https://pavanturlapati.com/) ([GitHub](https://github.com/pavanturlapati)). Face detection uses [`@vladmandic/face-api`](https://github.com/vladmandic/face-api). If you like it, a star on GitHub is appreciated.

## License

MIT, see `LICENSE`. Please keep the copyright notice if you reuse the code.
