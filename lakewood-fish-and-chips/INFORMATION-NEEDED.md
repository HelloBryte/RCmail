# What I need from you before building

Answer the **Tier 1** items and I can build. Tier 2 shapes the design. Tier 3 is
what turns a working site into one that actually grows the business.

---

## Tier 1 — Blocking

### 1. Verify the menu I transcribed

I read both photos into [`data/menu.json`](data/menu.json). Glare and folds hid a few
things. Please confirm:

| # | Item | I read | Why I'm unsure |
|---|---|---|---|
| 1 | Whiting | $9.50 | Price column is offset from the names; whiting is usually dearer than flake |
| 2 | Barramundi | $10.00 | Same offset |
| 3 | Seafood Pack | **unreadable** | Completely lost to glare |
| 4 | Chicken Schnitzel Burger | $12.00 | Whole panel washed out |
| 5 | Plain Chicken Schnitzel | $9.00 | Whole panel washed out |
| 6 | Free drink threshold | over $55 | Digit partly obscured — $55, $35 or $50? |
| 7 | "Near Shaxton Circle Lake" | as written | Confirm spelling |

Everything else I'm confident about, but a quick read-through of `menu.json` is worth
five minutes — **a wrong price on a live ordering site costs you real money on every
order until someone notices.**

### 2. Drinks

There are **no drinks on the printed menu**, yet a 1.25L drink appears in the Large
Family Pack and in the $55 promo. I need the full list: cans, 600ml, 1.25L, water,
flavours, and prices. Drinks are high-margin and easy to upsell at checkout — leaving
them off is money left on the counter.

### 3. How does an order actually reach the shop?

This is the most important question on the page. A website that takes orders nobody
sees is worse than no website. Pick one:

- **Receipt printer** — order prints automatically at the counter. Best during a rush.
  Needs a network-capable printer (do you have one? make/model?).
- **Tablet/phone dashboard** — new order makes a loud noise until acknowledged.
  Cheapest. Needs a device that stays awake and on wifi at the counter.
- **SMS or email** — simplest, but easiest to miss on a Friday night.

Tell me: what devices and internet are at the counter right now?

### 4. Payment

- **Pay online by card** (Stripe) — you get the money up front, no-shows disappear.
  Requires an ABN, a business bank account and ID verification. Stripe takes ~1.75% + 30c.
  Do you want to pass that on as a card surcharge?
- **Pay on pickup** — launches faster, zero fees, but you will cook food that
  occasionally never gets collected.
- **Both** — most common.

Which? And do you have an ABN and business bank account ready?

### 5. Pickup only, or delivery too?

If delivery: what radius or suburb list, what fee, what minimum order, and **who drives**?

### 6. Timing — the thing that protects your kitchen

- How long does a typical order take from order to ready? (15 min? 25?)
- Can people schedule for later, or is it ASAP only? How far ahead?
- **How many orders can you physically handle per 15 minutes at peak?**
  I can cap slots so the site refuses a 16th order at 6:15pm instead of taking it.
  Without this, the website can accept 30 orders in two minutes and wreck your night.
- What time do online orders stop before closing? (e.g. last order 20 min before close)

### 7. Domain name

Do you own one? `lakewoodfishandchips.com.au` needs an ABN. A `.com` doesn't.
If you don't have one yet I'll suggest options — budget roughly $15–25/yr.

---

## Tier 2 — Shapes the build

### 8. What can customers customise?

For every item, what choices should they get? Examples:
- Fish: grilled or fried (menu says grilled +$0.50)
- Chips: salt / no salt / chicken salt
- Burgers: remove any ingredient? add extras at $0.60?
- Do the $0.60 extras apply to **all** burgers and souvlakis, or only schnitzels?
- Gluten-free batter available?

### 9. Sizes the printed menu doesn't show

Chips is listed only as "Minimum". Do you actually sell small / large / family?
Same question for anything else where the paper menu is simpler than reality.

### 10. Value pack substitutions

Can a customer swap flake for blue grenadier in Meal For Two? Free, or price difference?
Same for the family packs. This is a very common counter request and I need to decide
whether the site allows it or tells people to phone.

### 11. Live controls you'll want on your phone

- "Pause online orders" button for when you're slammed
- Mark an item **sold out** (barramundi's gone at 7pm — the site should stop selling it)
- Change today's hours

Confirm you want these — they're the difference between a site that helps and one that
creates problems.

### 12. Can you edit prices yourself?

**Important architectural fork.** Two options:

- **Prices in code** — cheapest and fastest, but every price change needs a developer.
- **Admin panel** — you log in and change prices, hours, and sold-out status yourself.
  More work up front, but you're independent. Your menu literally says
  "Price, Packs & Times are Subject to Change without notice."

I'd recommend the admin panel given that disclaimer. Your call.

### 13. Photos

Real photos of your own food outperform stock images by a wide margin. Ten decent
phone photos in daylight — flake and chips, a burger, a souvlaki, the family pack,
the shopfront — would lift this site more than any amount of styling.

Do you have any? Can you take some?

### 14. Branding

- The shark logo — do you have the original file (AI, EPS, SVG, or a high-res PNG)?
  I can trace it from the menu photo, but the original is much better.
- Any colours you want? Default would be a deep navy/sea blue with warm accents.

---

## Tier 3 — Makes it actually grow the business

### 15. Google Business Profile

Honestly, this may matter more than the website. When someone searches
"fish and chips Frankston", a claimed profile with photos, correct hours and an
**Order Online** button pointing at your site captures more customers than anything
on the site itself. Do you have access to your listing?

### 16. Reviews

You're sitting on 4.3/5 and comments like *"real potato cakes, not processed rubbish"*.
Worth putting on the homepage. Do you want a review section?

### 17. Repeat ordering

Save a customer's last order and let them reorder in one tap. For a suburban chip shop
where the same families order every Friday, this is the highest-value feature after
ordering itself.

### 18. Order-ready SMS

Text the customer when the order's ready so they stop crowding your counter.
Small cost per message (~5c). Want it?

### 19. Legal pages

Refund policy, privacy policy, allergen disclaimer. Needed if you take card payments.
I'll draft them; you review.

---

## Business decisions

**Budget and hosting.** Your neighbour pays yumbojumbo ~$120/month. A custom site on
Vercel + Stripe runs roughly **$0–25/month** plus the domain — but you own the
maintenance. If something breaks at 6pm Friday, there's no support line. Worth knowing
before we start.

**Who maintains it long term?** If it's you, item 12 (admin panel) becomes essential.

---

## Fastest path

If you want to move quickly, answer these six and I'll build a working v1:

1. Confirm the 7 uncertain prices above
2. Send me the drinks list
3. How orders reach the counter (printer / tablet / SMS)
4. Pay online, pay at pickup, or both
5. Pickup only, or delivery too
6. Typical order time + max orders per 15 min at peak

Everything else can be layered on afterwards.
