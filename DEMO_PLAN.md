# AirdropGate — demo campaign + promotion plan (draft 2026-11-19)

Goal: ≥30 distinct Agent ID addresses interacting with the deployed
AirdropGate during the submission period (18 Nov – 9 Dec 2026), required
for Innovation Award eligibility. Growth Award is judged on the same
on-chain metrics, so every interaction also helps there.

## Demo campaign design (runs on the deployed contract)

- **Type: open campaign** (no allowlist — any Agent ID holder can claim,
  lowest friction for reaching 30 addresses).
- **Token: DemoToken** (deployed by `script/Deploy.s.sol` alongside the
  contract; testnet only, no value). Amount per claim + max claims set at
  campaign creation — suggested: **100 claims × 10 DEMO** (1,000 DEMO
  total), so the campaign does not run dry before hitting 30 claimants.
- **Deadline:** set ~7 days out from creation, then renew/re-create if
  needed; a live campaign must exist for the whole promotion window.
- **Creator funds it** via `createCampaign` (transferFrom pulls
  amountPerClaim × maxClaims from the creator — deployer or Fari's wallet).
- **Frontend:** the live site lists the campaign and shows eligibility
  live; claim is one click + wallet signature. No registration, no login.

## Promotion channels (free, no paid ads)

1. **X post from @0xfariii** — demo link + "claim free DEMO if you hold
   an Agent ID" + hackathon hashtag. Pin it. One repost mid-campaign.
2. **Binance Square** — same post, Agent ID / BNB Chain topics.
3. **BNB Chain Discord / Telegram community** — post in the
   hackathon / developer channels (follow each server's promo rules).
4. **Agent ID holder communities** — SPACE ID / Agent ID related groups;
   the gate itself is the hook: only Agent ID holders can claim.
5. **Repo README + site banner** — "Live demo on BSC Testnet" with the
   campaign link, so anyone landing from the hackathon announcement can
   try it immediately.

## What still needs Fari's decision (at deploy time)

- Demo token amounts (suggested above: 100 × 10 DEMO) — confirm or change.
- Whether the demo campaign is funded from the deployer wallet or his own.
- Whether he posts the X/Square promos himself or wants the text drafted
  for him (drafts can be prepared once the campaign address exists).

## Execution order (after testnet deploy succeeds)

1. Deploy → record AirdropGate + DemoToken addresses.
2. Create the open demo campaign on testnet; verify claim works via the
   live site.
3. Update README + site with the live demo link.
4. Publish the X post (Fari) + Square + Discord/Telegram.
5. Track interacting Agent ID addresses (claim events on-chain); report
   count to Fari. Re-promote if count stalls below 30.
6. Same flow repeats on mainnet after the mainnet deploy is approved.

## Promo drafts (fill in the live demo link once the campaign exists)

**X post (EN):**
> Live demo: AirdropGate — anti-Sybil airdrop claims gated by Agent ID.
> Hold an Agent ID? Claim free DEMO on BSC Testnet, one click, no signup.
> Try it: <demo link>
> Built for the Binance Wallet × BNB Chain Agent ID Hackathon. #BNBChain #AgentID

**X post (ID):**
> Demo live: AirdropGate — klaim airdrop anti-Sybil, khusus pemegang
> Agent ID. Punya Agent ID? Klaim DEMO gratis di BSC Testnet, sekali klik,
> tanpa daftar. Coba di sini: <demo link>

**Binance Square:** same as the X post (EN), posted under BNB Chain /
Agent ID topics.
