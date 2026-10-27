# Quantify product spec

Last updated: October 27, 2026

## Overview

Quantify is a web and mobile app, launching in India only for version 1, that turns everyday receipts into a clear picture of what people spend, item by item, and predicts what they will buy next. It serves two groups: buyers who want to understand and plan their spending, and sellers who want to bring those buyers back into their shops with timely offers.

**The problem.** People buy the same everyday goods again and again but have no easy record of what they spend on each item or when they will run out. Local shops have no way to reach a buyer at the moment a purchase is due.

**Goals for version 1**

- A buyer can sign up with only a phone number and scan a receipt in one tap.
- Every scanned item is sorted into a category, and the buyer sees spend and trends by item and by category.
- After a few weeks of data, the app predicts when the buyer will next need an item.
- A seller can see anonymous buying patterns from buyers who opted in, and send an offer when a purchase is due or the buyer is nearby.
- The app connects to at least one point-of-sale (POS) system, so purchases can arrive without a paper receipt.

## Users and key flows

Buyers come first, because sellers only get value once buyers are scanning receipts.

**Buyer.** Someone who shops for everyday goods (groceries, household items, personal care) and wants to know where the money goes and avoid running out of things.

1. Sign up: enter a phone number, type the code sent by SMS, done.
2. Scan: tap the camera button, point at the receipt, and the app reads the shop, date, items, prices and currency.
3. Review: check the items the app could not read clearly and fix them if needed.
4. Understand: see spend by item, by category and over time, with month-to-month trends.
5. Plan: get a reminder when an item is likely due, with any matching offer from a nearby shop.
6. Control: choose which shops can see their buying patterns and whether location alerts are on.

**Seller.** A shop owner or chain that sells everyday goods and wants more repeat visits.

1. Sign up as a business, verify the shop and its location.
2. Optionally connect their POS system so sales flow in automatically.
3. See buying patterns of opted-in buyers: what they buy, how often, and when they are due.
4. Create an offer for an item, a group of buyers, or a trigger (purchase due, or buyer within a set distance).
5. Track results: offers sent, opened, and redeemed in the shop.

## Features and scope

Version 1 ships the buyer app plus a basic seller side; richer seller tools and more POS systems follow. Edit the Release column to move anything.

| Feature | For | What it must do | Release |
| --- | --- | --- | --- |
| Phone sign-up | Both | OTP login on Indian (+91) mobile numbers, no password or email | v1 |
| One-tap receipt scan | Buyer | Read shop, date, line items, prices, GST and totals from a photo; flag low-confidence lines | v1 |
| Item categorization | Buyer | Sort each item into a category (e.g. dairy, staples, cleaning); learn from user corrections | v1 |
| Spend dashboard | Buyer | Spend by item, category, shop and period in rupees; trend lines | v1 |
| Web and mobile | Both | Same features on phone browsers, desktop browsers, Android and iOS | v1 |
| Purchase prediction | Buyer | Estimate the next purchase date per item from past intervals; improve as data grows | v1 (basic) |
| Due reminders | Buyer | Notify when an item is likely due | v1 |
| Nearby-shop alerts | Both | Trigger an offer when an opted-in buyer is within a set distance of the shop | v1 |
| Seller dashboard | Seller | Aggregate buying patterns of opted-in buyers | v1 (basic) |
| Targeted offers | Seller | Create offers by item, buyer group, due date, or nearby trigger | v1 (basic) |
| POS integration | Seller | Pull purchases from a shop's POS so no receipt scan is needed | v1: one POS; v2: more |
| Offer analytics | Seller | Sent, opened, redeemed, and foot traffic lift | v2 |

## India requirements

Version 1 is limited to India, so these rules apply to every feature. Other countries come later and are out of scope for now.

| Area | Requirement |
| --- | --- |
| Currency | Rupees only, shown with Indian digit grouping (1,00,000) |
| Language | Launch in English and Hindi; interface built so regional languages (Tamil, Telugu, Kannada, Marathi, Bengali and others) can be added later |
| Receipts | Read printed thermal bills from kirana stores and supermarkets, GST invoices (GSTIN, CGST/SGST/IGST lines), and item names mixing English and Hindi; flag handwritten bills for manual review |
| Phone login | +91 numbers with SMS OTP. Bulk SMS in India needs DLT registration of the sender ID and message templates, so allow lead time; WhatsApp OTP as a fallback |
| Data residency | Host all data in an Indian cloud region (for example Mumbai or Hyderabad) |
| Devices and network | Work well on low-cost Android phones and patchy mobile data; small app size; queue scans offline and upload later |
| POS systems | Pilot with one Indian POS used by everyday-goods shops. Candidates to check for open APIs: GoFrugal, Petpooja, Pine Labs, Razorpay POS, Ginesys |

## Privacy and consent

Sellers never see a buyer's data unless that buyer has opted in, and location is used only while the buyer allows it. This is both a legal requirement in India and the basis of buyer trust.

- **Opt-in per seller.** Buyers choose which shops can see their buying patterns. The default is none.
- **Aggregate first.** Sellers see patterns across groups of buyers, not named individuals, unless a buyer chooses to share more for better offers.
- **Location.** Nearby-shop alerts need a separate, explicit permission. The app uses geofences around shops rather than tracking a buyer's full movement, and the setting can be turned off at any time.
- **Receipt images.** Stored encrypted, and deletable by the buyer along with all extracted data.
- **User rights.** Buyers can export or delete all their data from inside the app.
- **Indian law.** The design must meet India's Digital Personal Data Protection (DPDP) Act 2023 and its rules: clear consent notices (in English or an Indian language the user picks), purpose-limited use, easy withdrawal of consent, and breach reporting. A legal review is needed before launch.

These points are based on general knowledge of the laws named, not a legal review.

## Success metrics and open questions

Targets below are placeholders to set once a launch market is chosen.

| Metric | What it shows |
| --- | --- |
| Receipts scanned per active buyer per month | Whether buyers keep using the core feature |
| Scan accuracy (items read correctly without edits) | Whether one-tap scanning really works |
| Prediction hit rate (purchase within a few days of the predicted date) | Whether predictions are useful |
| Buyer opt-in rate to share with sellers | Whether the seller side has data to work with |
| Offer redemption rate and shop visits from offers | Whether sellers get foot traffic |
| Sellers active per month | Whether sellers find it worth paying for |

**Open questions**

- [x] Which country launches first? India, and version 1 is India only.
- [x] Should nearby-shop alerts be in version 1? Yes.
- [x] Where will the code live? github.com/kreatesol/quantify.
- [ ] Who pays: sellers by subscription, a fee per redeemed offer, or both? Is the buyer app free?
- [ ] Which POS system do target sellers in India use most, and which offers an open API?
- [ ] Which city or cities to pilot in first?
- [ ] What budget, timeline, and team (if any) are available?
