---
title: "Rescue Flight privacy policy"
description: "How Rescue Flight saves progress, uses optional analytics, and handles privacy requests."
date: 2026-11-18T00:00:00-08:00
layout: "app-info"
disableAnalytics: true
outputs: ["html"]
build:
  list: never
---

Last updated: November 25, 2026.

Rescue Flight is made by Jesse Bounds. This policy covers the iPhone and iPad app, including the iPad version on Macs with Apple silicon. It also covers testing of the upcoming native Apple Vision Pro game. For a privacy question, email [bounds@mail.grokbot.com](mailto:bounds@mail.grokbot.com).

## Saved progress and iCloud

The game saves progress and settings on your device. When iCloud is available, it also uses your private iCloud database to share progress between your devices. This includes flight results, earned tokens, items bought with those tokens, equipment, rewards, selected loadouts and supported settings. Tokens are earned in play. There are no real-money in-app purchases.

Random account, installation and device identifiers keep records separate and prevent duplicate rewards. Apple's iCloud account identifiers are also used to address your private database. These records go to Apple through CloudKit. They are not sent to TelemetryDeck, and the developer has no service that reads your private saved games.

The game uses the iCloud account already on your device. It does not ask you to create a Rescue Flight account. Cloud saves use your iCloud storage. A local copy lets you play offline and send pending progress when a connection returns. Spending shared tokens and resetting shared progress require a connection.

Without an available iCloud account, the game uses a separate local profile. It does not merge that profile into an iCloud profile. Changing iCloud accounts keeps their local files separate. Usage-sharing consent and developer options stay on each device. The Vision Pro test version also keeps seat calibration on the headset.

## Optional usage data

**Share usage data** in Settings → Privacy is off until you enable it on that device. Earlier releases used a default-on setting; the App Store release described by this policy requires a new opt-in. You can turn it off at any time. This stops new usage signals and cancels pending network requests. Cached events that were not sent can be retried if you later enable sharing again. Turning sharing off does not remove signals already received by the analytics service, and it does not turn off iCloud progress.

If you enable sharing, the game sends usage events to [TelemetryDeck](https://telemetrydeck.com/privacy/). These include game and session counts, flight outcomes, ranges of round and rescue totals, training steps, and use of the Supply shop and rewards. Supply events include the game item identifier and its price in earned tokens. The Apple Vision Pro test version also sends counts of received crash, hang, CPU and disk-write diagnostic reports. The full diagnostic reports remain on the device in a limited local history.

TelemetryDeck adds app and system versions, device model, screen details, language, region, time zone, accessibility settings and session statistics. An app-specific salted hash of Apple's vendor identifier helps count repeat use. The raw vendor identifier, your iCloud account identifiers and your saved-game records are not sent to TelemetryDeck. The identifier can persist while other apps from the same developer remain installed.

TelemetryDeck states that it does not store app users' IP addresses. Network services must still handle connection information to receive a request. See its [privacy FAQ](https://telemetrydeck.com/docs/guides/privacy-faq/) for the data it receives and its retention practices. Analytics events do not have a fixed automatic deletion period; older events can remain in cold storage.

## Data controls and deletion

**Reset progress is not data deletion.** It starts a new progress period. Earlier cloud records and local account copies can remain so devices can reconcile their state.

Use Apple's iCloud storage controls to manage or delete the game's cloud data. Removing cloud data can pause sync on devices that still have a cached copy. Removing the app deletes its local app data, but does not by itself remove iCloud data or analytics already received. Apple backups are managed separately through your Apple account.

For a question or deletion request, email [bounds@mail.grokbot.com](mailto:bounds@mail.grokbot.com). Do not send your Apple Account password. The developer cannot identify an analytics record from your name or email address, so it may not be possible to find a particular person's past signals. Private iCloud records are controlled through your Apple account.

## Support and this website

If you email for help, the developer receives your email address and the information you choose to send. This information is used to answer your request and is retained for support follow-up. You can ask for it to be deleted.

The support and privacy pages do not load website analytics. This site is hosted by GitHub Pages, whose service processes web requests under the [GitHub Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement). The site stores your theme and motion preferences in your browser. Other pages on bounds.dev have separate website analytics.

## Advertising and tracking

The game has no advertising and does not sell your data or use it for cross-app advertising tracking. It does not request contacts, a microphone, a camera or location access. In the Apple Vision Pro test version, head position is used on the device to display the cockpit and world; the game does not send head-position data to the developer or TelemetryDeck.
