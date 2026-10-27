# Quantify technical architecture

Last updated: October 27, 2026

One TypeScript codebase builds the buyer app for Android, iOS and the web, with a separate seller website and one backend hosted in India.

**Development environment.** While the app is being built, it runs in AWS US East (us-east-1) and accepts both Indian and US mobile numbers. Production moves to Mumbai and accepts Indian numbers only.

## At a glance

```
   +---------------------------+        +---------------------------+
   | Buyer app                 |        | Seller website            |
   | Android, iOS, web (Expo)  |        | Next.js, desktop first    |
   +-------------+-------------+        +-------------+-------------+
                 |                                    |
 +---------------v------------------------------------v--------------+
 | AWS Mumbai region: all data stays in India                        |
 |  +-------------------------------------------------------------+  |
 |  | API (Node.js, Fastify)                                      |  |
 |  | Login, receipts, spend, predictions, offers, POS adapters   |  |
 |  +------+-----------------------+-----------------------+------+  |
 |         |                       |                       |         |
 |  +------v---------+   +---------v----------+   +--------v------+  |
 |  | Job workers    |   | PostgreSQL+PostGIS |   | Receipt images|  |
 |  | OCR, predict   |   | spend, shops       |   | S3, encrypted |  |
 |  +----------------+   +--------------------+   +---------------+  |
 +--------------------------------+----------------------------------+
                                  | calls out to
      +---------------+-----------+----+----------------+
      |               |                |                |
  SMS OTP          OCR              Push            Shop POS
  MSG91, DLT       Google Vision    FCM, APNs       one pilot provider
```

The buyer app is built first. Nearby alerts run on the phone itself, and the server only sends the offer once the phone reports a shop visit.

## Recommended stack

Everything is TypeScript so one small team can work across the apps and the backend.

| Layer | Choice | Why |
| --- | --- | --- |
| Buyer app | React Native with Expo (Android, iOS and web from one codebase) | Nearby alerts need background location, which only a native app can do; Expo also builds a web version |
| Seller website | Next.js | Sellers work on desktop dashboards; fast to build and host |
| Backend API | Node.js with Fastify | Same language as the apps; fast and simple |
| Database | PostgreSQL with PostGIS | Spend data is relational; PostGIS handles shop locations and distance queries |
| Background jobs | Queue (Redis with BullMQ) | Receipt reading and predictions run outside the request so the app stays fast |
| Receipt reading | Google Cloud Vision OCR (Mumbai region), then a parser that turns text into line items | Reads English and Hindi; can run in India |
| Phone OTP | Indian SMS provider such as MSG91, with WhatsApp OTP fallback | Handles DLT registration and Indian delivery |
| Push notifications | Expo push (Firebase Cloud Messaging and Apple Push underneath) | One service for Android and iOS |
| Hosting | AWS Mumbai region (ap-south-1): containers, managed PostgreSQL, encrypted S3 for receipt images | Keeps all data in India |
| Predictions (v1) | Statistics on each buyer's purchase intervals per item, run nightly | Works with little data; a learned model can replace it later |

## Key decisions

**Nearby alerts run on the phone, not the server.** The app registers geofences around opted-in shops and the phone wakes the app on entry. This saves battery and means the server never tracks a buyer's movement. iOS lets an app watch about 20 areas at a time, so the app keeps the 20 nearest shops loaded and refreshes the list as the buyer moves.

**The web version is for viewing, not alerts.** Browsers cannot watch location in the background, so nearby alerts work only in the Android and iOS apps. Scanning and the dashboard work everywhere.

**Receipt reading has two stages.** OCR turns the photo into text; a parser then finds the shop, date, items, quantities, prices and GST. Low-confidence lines go to the buyer to confirm, and corrections improve categorization. A vision language model is a fallback to test for hard receipts.

**OTP needs DLT setup before launch.** Indian telecom rules require the sender ID and SMS template to be registered on a DLT platform. This takes days to weeks, so it should start early.

**All data stays in India.** Database, receipt images, backups and OCR processing all run in Indian cloud regions to fit the DPDP Act and buyer expectations.

**POS through adapters.** Each POS provider gets its own small adapter that converts its sales into Quantify purchases, so adding a second provider does not touch the rest of the system.

## Repository layout and build order

One repository (kreatesol/quantify) holds everything, so shared types and rules are written once.

```
quantify/
  apps/buyer      Expo app: Android, iOS, web
  apps/seller     Next.js seller website
  services/api    Fastify API and background jobs
  packages/shared Types, categories, validation shared by all
  infra/          Cloud setup for the Mumbai region
```

The buyer app is built in this order, each piece usable before the next starts:

1. Project setup: repository layout, database, local development, automated tests and checks.
2. Phone OTP sign-up and login.
3. Receipt capture and upload, then OCR and line-item parsing.
4. Review screen for unclear lines, and item categorization.
5. Spend dashboard with trends by item, category and shop.
6. Basic purchase prediction and due reminders.
7. Nearby-shop alerts (geofences and push), ready for the seller side.

## Decisions for the owner

- [ ] Cloud provider: AWS Mumbai by default.
- [ ] SMS provider: MSG91 by default. DLT registration needs company details.
- [ ] Accounts and keys for the cloud, SMS, Google Cloud Vision, Apple Developer and Google Play. Development uses test modes until then.
- [ ] Final app and company name on the stores.
