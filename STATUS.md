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

## Blocked — needs the parent agent (browser)
1. **Testnet deploy (chain 97) — faucet captcha.** Fresh deployer
   `0xee33A844fe7cA978D2798a0eaD1C823D61367680` has 0 tBNB. The official faucet
   (https://www.bnbchain.org/en/testnet-faucet) requires hCaptcha in a browser;
   QuickNode's faucet additionally requires a small mainnet balance on the
   claiming wallet, which the fresh deployer does not have. No API-only faucet
   exists. Unblock: browser task claiming tBNB to the deployer address
   (0.1 tBNB is plenty; full deploy ≈ 0.01 tBNB at testnet gas prices).
   Deployer private key: `~/.airdropgate-testnet-key` (0600, outside the repo,
   never committed, never printed).
2. **BscScan verification — no API key.** Checked env + vault paths; none exists.
   After testnet deploy, try Sourcify first (`forge verify-contract --verifier
   sourcify`); if that fails, a BscScan API key is needed (Fari must provide one).

## After the drip arrives (in order)
1. Deploy: `DEPLOYER_PRIVATE_KEY=$(cat ~/.airdropgate-testnet-key) AGENT_ID_ADDRESS=0x0000000000000000000000000000000000000000 forge script script/Deploy.s.sol --rpc-url bsc_testnet --broadcast`
2. Verify: try Sourcify; record addresses + tx + explorer links.
3. Update `web/app.js` NETWORKS[97] (agentId = deployed MockAgentId, contract =
   deployed AirdropGate) + README deployments table; commit + push.
4. Smoke-test a claim on testnet through the live site.
5. Mainnet deploy is NOT done and NOT authorized yet — needs Fari's explicit
   approval + funding decision per BRIEF.md (BAW holds only ~0.00055 BNB).

## Submission
No project submission form is published yet (see SUBMISSION.md — researched
2026-11-19 ~12:40 WIB). Re-check every 2–3 days; 5 Dec + 7 Dec; hard deadline
9 Dec 08:00 UTC / 15:00 WIB. Target submit 5 Dec.
