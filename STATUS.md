# AirdropGate — build status (2026-11-19, ~12:55 WIB)

## Done
- **Contract** `src/AirdropGate.sol` (Solidity ^0.8.20, OZ 5.4.0): allowlist (merkle) + open
  campaigns, Agent ID gate (`balanceOf > 0`), claim/cancel/reclaim, ReentrancyGuard,
  custom errors, events, ownerless. Per BRIEF.md exactly.
- **Tests**: `forge test` → **27 passed, 0 failed, 0 skipped** (mock Agent ID ERC-721).
  Covers every case in the brief's test list plus validation, cancel/reclaim edges,
  exact-deadline claim, reclaim math, double-reclaim.
- **Frontend** `web/` (index.html + app.js, ethers v6.13.4 CDN): campaign list from
  chain, detail + live eligibility, in-browser merkle builder, create-campaign
  (approve → create), claim/cancel/reclaim. Merkle root + proofs verified to match
  the Solidity tree exactly (cast vs node/ethers, 2-leaf and 3-leaf cases).
- **Repo**: https://github.com/0xfari/airdropgate (public, main @ 72a0148).
- **Live site**: https://0xfari.github.io/airdropgate/web/ (HTTP 200 verified,
  title + app.js served). Pages uses legacy source `/` with a root redirect —
  the gh token lacks `workflow` scope, so the Actions deploy route was rejected.
- **Deploy script** `script/Deploy.s.sol` validated end-to-end on local anvil:
  deploy (MockAgentId + DemoToken + AirdropGate) → mint Agent ID → create open
  campaign → claim (balance 100, hasClaimed true, remaining 1). ONCHAIN COMPLETE.

## Done — testnet deployed 2026-11-19 ~13:15 WIB
- **Funding:** 0.1 tBNB arrived from the official BNB Chain Telegram faucet
  bot (@bnbchain_official_bot) after Fari sent the deployer address.
  (Web faucet refused: needs ≥0.002 mainnet BNB. QuickNode was dry.)
- **Deploy** (forge script, legacy txs at 1 gwei — BSC testnet rejects
  EIP-1559 tip cap 1 wei; first attempt failed on gas price, second on
  maxFee, third needed `--start-fresh`; working flags:
  `--broadcast --legacy --gas-price 1000000000 --start-fresh`):
  - MockAgentId `0x0B66E14D886630f5190280FCd2e40007a26Ee7CC`
    (tx `0x5a34dae244893f11847f4097ca19ca4b0c15dd5f8bf7a603e0614092082c9745`)
  - DemoToken `0x0bE3914d0d02C81949f8d39948B59AF48ec6582a`
    (tx `0x59e2eddcd43b4aa8975e03ea87ae61d511e1eb5b0ff1eda487ec8ef5c57cef58`)
  - AirdropGate `0xBe253998add7366A0099E2b4fd22d02026a74D56`
    (tx `0x583092c4144865b64b31c9bb8269671d6dbec9a61eb588ced5a2e994cdc5314d`)
  - All 3 receipts status 1, block 0x88efe65; code verified on 2 RPCs.
  - Deploy cost ~0.0005 tBNB; deployer balance now ~0.0995 tBNB.
- **Verification:** all three exact-match on Sourcify (no BscScan key needed).
- **Frontend:** `web/app.js` NETWORKS[97] now points at the deployed mock
  Agent ID + gate; README deployments table updated; committed + pushed.
- **Smoke test:** PENDING — mint mock Agent ID to deployer, create a small
  open campaign, claim once via cast, verify hasClaimed + balance.

## Blocked — needs the parent agent (browser)
1. **BscScan verification — no API key.** Not needed for testnet (Sourcify
   exact match done). For mainnet, try Sourcify first; if that fails, a
   BscScan API key is needed (Fari must provide one).

## After the smoke test (in order)
1. Demo campaign on testnet (see DEMO_PLAN.md) — amounts need Fari's
   decision (suggested: open campaign, 100 claims × 10 DEMO).
2. Mainnet deploy is NOT done and NOT authorized yet — needs Fari's explicit
   approval + funding decision per BRIEF.md (BAW holds only ~0.00055 BNB).

## Submission
No project submission form is published yet (see SUBMISSION.md — researched
2026-11-19 ~12:40 WIB). Re-check every 2–3 days; 5 Dec + 7 Dec; hard deadline
9 Dec 08:00 UTC / 15:00 WIB. Target submit 5 Dec.
