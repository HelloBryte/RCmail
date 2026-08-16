# Lakewood Fish & Chips — online ordering site

Online ordering for Lakewood Fish & Chips, Shop 1/300 Heatherhill Road, Frankston VIC 3199.

**Status:** pre-build. Menu transcribed from the printed takeaway menu; waiting on the
answers in [`INFORMATION-NEEDED.md`](INFORMATION-NEEDED.md) before construction starts.

## What's here

| Path | What it is |
|---|---|
| `data/menu.json` | Full menu transcribed from the two menu photos, with uncertain prices flagged `"verify": true` |
| `data/shop.json` | Address, phone, trading hours, GST and promo policy |
| `INFORMATION-NEEDED.md` | The open questions, tiered by how much they block the build |

## Verify before go-live

`data/menu.json` was read off photographs. Seven values were obscured by glare or
folds and are flagged in the file. **Nothing ships until those are confirmed against
the paper menu** — a wrong price on a live ordering site loses money on every order.

## Intended stack

Not locked in until the Tier 1 answers land, but the likely shape:

- **Next.js + TypeScript** on Vercel — fast, cheap, good mobile performance
- **Stripe** for card payments, if online payment is wanted
- **Postgres** for orders and menu, so prices are editable without a deploy
- Order routing to the shop by receipt printer, tablet dashboard, or SMS — to be decided

Running cost target: under $25/month plus the domain, versus ~$120/month for a
hosted platform like the one the neighbouring shop uses.

## This folder is temporary

It's staged inside the RCmail repository because this session's GitHub access is
scoped to that one repo and couldn't create a new one. It belongs in its own
repository — the folder is self-contained and moves cleanly once that exists.
