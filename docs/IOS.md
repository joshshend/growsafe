# Run GrowSafe on your iPhone (iOS, via Xcode)

This wraps the web app in a native iOS shell using Capacitor. You need a Mac, Xcode, a Lightning/USB-C cable and your iPhone 17 Pro. No paid Apple developer account is needed; your normal Apple ID works.

## One-time setup on your Mac

1. Install **Xcode** from the Mac App Store (it is large, allow time). Open it once and let it install extra components. Accept the license when asked.
2. In Terminal, point the command line tools at Xcode and accept the license:
   `sudo xcode-select -s /Applications/Xcode.app`
   `sudo xcodebuild -license accept`
3. Install CocoaPods (Capacitor uses it): `brew install cocoapods`
4. In the project folder (CAC): `npm install`
5. Create the iOS project. Do this **once only**: `npx cap add ios`
   This makes the `ios/` folder. Commit it (it is meant to be in git; only `ios/App/Pods` and `ios/App/build` are ignored).

## Every time you change the web app

1. `npm run ios:sync` (builds the web app and copies it into the iOS project)
2. `npm run ios:open` (opens the project in Xcode)

Optional: links you share from the native app must point to the public website, because inside the app the address is `capacitor://localhost`. Before syncing, set the site address, for example `VITE_PUBLIC_URL=https://your-site.vercel.app/ npm run ios:sync`. If you skip this, share links will not work for other people.

## Add the permission texts (once, after `cap add ios`)

In Xcode: click **App** (blue icon, top of the left list) > target **App** > **Info** tab. Under "Custom iOS Target Properties" click the **+** and add these two rows (type String). Or edit `ios/App/App/Info.plist` and add inside `<dict>`:

```xml
<key>NSCameraUsageDescription</key>
<string>GrowSafe uses the camera so you can photograph a room and check it for hazards. Photos stay on your phone unless you choose to send one for analysis.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>GrowSafe lets you pick an existing photo of a room to check it for hazards.</string>
```

Without these, the app closes the moment it asks for the camera. Notifications and the share sheet need no extra text.

## Put it on your phone

1. In Xcode, select the **App** project > **App** target > **Signing & Capabilities**.
2. Tick "Automatically manage signing". Under **Team**, choose your personal Apple ID ("Your Name (Personal Team)"). If it is missing: Xcode > Settings > Accounts > + > Apple ID.
3. If Xcode complains the Bundle Identifier is taken, change `com.growsafe.app` to something unique (for example `com.growsafe.joshua`). Use the same value everywhere you see it in Signing.
4. Plug in the iPhone and unlock it. Tap **Trust** on the phone if asked.
5. Turn on Developer Mode on the phone: **Settings > Privacy & Security > Developer Mode**, switch on, restart, confirm. (The option only appears after the phone has been plugged into Xcode once.)
6. At the top of Xcode, pick your iPhone as the run destination (next to the App name).
7. Press the **Run** button (play triangle). The first build takes a few minutes.
8. If the phone says "Untrusted Developer": **Settings > General > VPN & Device Management** > your Apple ID > **Trust**. Then press Run again.

## Important limits

- An app signed with a free Apple ID **expires after 7 days** and will stop opening. Plug in and press Run again to refresh it. For the demo, do a fresh install the morning of.
- Reminders use local notifications; the first time you tap "Remind me" the phone asks permission. In a browser the same button downloads a calendar file instead.

## Troubleshooting

- **`pod: command not found` / pod install fails**: run `brew install cocoapods`, then `cd ios/App && pod install`. If it complains about encoding, add `export LANG=en_US.UTF-8` to your shell.
- **`xcode-select: error` or "requires Xcode"**: re-run step 2 and make sure Xcode was opened once.
- **"Signing requires a development team"**: choose your Team in Signing & Capabilities.
- **"Failed to register bundle identifier"**: change the bundle id (see step 3 above).
- **Phone not listed**: unlock it, tap Trust, try another cable or port, and check Window > Devices and Simulators.
- **"Developer Mode disabled"**: see step 5.
- **App opens then closes on camera**: the Info.plist texts above are missing.
- **White screen**: run `npm run ios:sync` again so the latest build is copied in; then Product > Clean Build Folder and Run.
- **Old version shows**: delete the app from the phone and Run again.
- **Share links look like capacitor://localhost**: set `VITE_PUBLIC_URL` (see above) and sync.
- **`npx cap add ios` says the platform exists**: it is already added; just use `npm run ios:sync`.
