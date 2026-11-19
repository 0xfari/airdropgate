# AirdropGate — Agent ID Hackathon build brief

## Status
- Concept chosen by Fari 2026-11-19 12:21 WIB (picked over allowlist mint gate).
- Hackathon: Binance Wallet + BNB Chain, Agent ID Hackathon, 60,000 USDC.
- Submission period: 2026-11-18 08:00 UTC → **2026-12-09 08:00 UTC**. Internal review 9–17 Dec, public review 17–20 Dec.
- Target: submit by **2026-12-05** (buffer). Build 19–21 Nov, testnet 21 Nov, mainnet 22–23 Nov, demo + promotion 23 Nov–9 Dec.
- Workspace: `~/workspace/hackathon/airdropgate/`
- GitHub: `0xfari/airdropgate` (public repo; site via GitHub Pages). GitHub account 0xfari, gh CLI logged in.
- Name check 19 Nov: no BSC dApp named AirdropGate exists. One unrelated namesake: `@orangecheck/airdrop-gate` npm SDK (Bitcoin-stake Sybil filter, not a dApp, not on BNB) — no conflict, no rename.

## Concept (one line)
Airdrop claims gated by Agent ID: a project funds a campaign, and only wallets holding an Agent ID can claim — one claim per Agent ID, non-transferable ID = Sybil-resistant distribution.

## Why it can win
- Innovation Award (judged): Agent ID depth 30% (the gate IS the core function), practicality 25% (airdrops are Sybil-farmed constantly — every project wants this), completion 25% (live product + working claim flow), innovation 20% (Agent ID as Sybil-resistance primitive for distribution).
- Eligibility bar: live product + **≥30 Agent ID addresses interacting** with the contract during the submission period. Traction plan: an OPEN demo campaign any Agent ID holder can claim from (see below) + X promotion via @0xfariii + agent communities.
- Growth Award (on-chain metrics) is a stretch from zero; Innovation Award is the real target.

## Contract spec — `AirdropGate.sol` (Solidity ^0.8.20, OpenZeppelin, Foundry)
- Chain: BNB Smart Chain mainnet (56). Test on BSC testnet (97) first.
- Agent ID contract (mainnet, immutable at deploy, constructor param so testnet can use a mock):
  `0x60b9262456de011f7d15a54cdd8c48baaa8b022f` (SPACE ID Agent ID, ERC-721, non-transferable).
  Gate check: `IERC721(agentId).balanceOf(user) > 0`. Never resolve a name to a wallet; the caller is always `msg.sender` (their own connected wallet).
- Campaign struct: `creator, token, merkleRoot (bytes32, zero for open campaigns), amountPerClaim, deadline (unix), maxClaims, claimedCount, funded, cancelled`.
- `createCampaign(address token, bytes32 merkleRoot, uint256 amountPerClaim, uint256 deadline, uint256 maxClaims)` — pulls `amountPerClaim * maxClaims` from creator via `transferFrom` (creator approves first). `merkleRoot == bytes32(0)` means OPEN campaign (any Agent ID holder may claim). Requires: amountPerClaim > 0, maxClaims > 0, deadline in future. Emits `CampaignCreated(id, creator, token, merkleRoot, amountPerClaim, deadline, maxClaims)`.
- `claim(uint256 campaignId, bytes32[] calldata proof)` — requires: campaign exists, not cancelled, `block.timestamp <= deadline`, `claimedCount < maxClaims`, `!claimed[campaignId][msg.sender]`, `balanceOf(msg.sender) > 0` on Agent ID, and for allowlist campaigns `MerkleProof.verify(proof, merkleRoot, keccak256(abi.encodePacked(msg.sender)))`. Effects before interaction: mark claimed, increment count, then `SafeERC20.safeTransfer`. Emits `Claimed(campaignId, claimer, amount)`. `ReentrancyGuard` on claim/reclaim.
- `cancelCampaign(uint256 campaignId)` — creator only, before deadline, sets cancelled. Emits `CampaignCancelled`.
- `reclaim(uint256 campaignId)` — creator only, only after deadline passed OR cancelled; transfers `funded - claimedCount * amountPerClaim` back to creator. Emits `Reclaimed`.
- Views: `campaignCount()`, `campaigns(id)`, `hasClaimed(id, addr)`, `remaining(id)`, `isAgentIdHolder(addr)`.
- NO owner/admin role over anyone else's campaign; no pause that traps funds; no upgrade proxy. Owner permissions disclosure in README: "contract is ownerless; each campaign's creator can only cancel/reclaim their own campaign's unclaimed funds after deadline/cancel."
- Custom errors (not revert strings). Events for everything.

## Frontend — static site, no backend (`web/`)
- Plain HTML + JS + ethers v6 via CDN. Wallet connect via `window.ethereum` (MetaMask / Binance Wallet). Network check: BSC mainnet 56 (testnet 97 on the test build).
- Pages: list campaigns (read `campaignCount` + `campaigns(i)` on-chain, no indexer), campaign detail (eligibility check live: Agent ID balance + merkle membership proof generated in-browser from a pasted address list for allowlist campaigns), create-campaign form (token, amount, max claims, deadline, address list → builds merkle root in-browser → approve token → createCampaign; each tx confirmed by the user in their own wallet), claim button.
- No server, no sessions stored, no QR login, no seed/private-key/API-secret collection, no "passive income"/returns promises anywhere in copy. No "Binance"/"BNB" in project name, token name, or domain. Risk note on the page: claiming costs gas; tokens may have no value.
- Host: GitHub Pages from the public repo. README in repo root explains the project, the Agent ID gate, and how to verify the contract on BscScan.

## Toolchain (verified on this machine 19 Nov)
- Foundry at `~/.foundry/bin/forge` (NOT on default PATH — export PATH first). `cast`, `anvil` available.
- Node v24.22.1, git, gh CLI (logged in as 0xfari).
- `baw` CLI at `/home/hatch/.local/bin/baw`. NOTE: the `baw-main` wrapper from the bnb-tx-ops skill does NOT exist on this machine (lost in a VM replacement); bare `baw` was used for all prior mints. Do NOT create a wrapper with a different HOME — it would lose the live session. Check `baw wallet status` with the bare binary first.
- `baw contract-call` has only `preview` / `execute` (calls to an address). Contract CREATION is NOT supported: `--to` is required for EVM (verified 19 Nov via `preview --help`). BAW cannot deploy. Mainnet deploy uses a fresh local deployer key funded by a small BAW BNB transfer (Fari approves the transfer via preview + "gas", per standing rules). Never deploy from Fari's BAW directly without his explicit approval, and never reuse a wallet index across live txs.

## Verification
- Verify source on BscScan after each deploy (`forge verify-contract`). Needs a BscScan API key — check env/vault; if none exists, FLAG IT (do not invent one). Sourcify as fallback.

## Tests (must all pass before any deploy)
Foundry tests with a mock Agent ID ERC721: happy-path allowlist claim; open-campaign claim by any Agent ID holder; non-holder reverts; double-claim reverts; wrong-proof reverts; non-member reverts; after-deadline reverts; cancel blocks claims; reclaim only after deadline/cancel and only creator; reclaim amount math exact; funding pull exact (`transferFrom` amount).

## Submission (channel TBD — research in parallel)
- Announcement says: submit project name, website, contract address(es), Agent ID usage description + materials during the submission period; no registration needed. No form URL is in the announcement text. Find the actual submission channel (Binance hackathon portal / survey / ecosystem page) and record it in `SUBMISSION.md` with the exact link + what was submitted + when.
- Materials to prepare: README, website URL, contract addresses (mainnet), Agent ID usage description, demo campaign live, short demo notes. No demo video required by the announcement.

## Demo campaign + traction (after mainnet deploy; funding decided with Fari)
- One OPEN demo campaign, any Agent ID holder can claim, first-come-first-served up to maxClaims. Funding token + amount decided with Fari at deploy time (small real amount, e.g. a few USDT split across 30–50 claims, OR a demo token with no value — Fari decides).
- Promotion: X post by Fari (@0xfariii), agent communities Fari knows, make.fun-adjacent agent circles. Goal: ≥30 distinct Agent ID holders claiming during the submission period.
- NEVER fake interactions, never mass-register accounts, never wash volume — disqualification risk.

## Hackathon red lines (checklist — verify before submit)
- [ ] No web QR-code login for Agentic Wallet; no pairing codes; no server-side sessions placing orders for users.
- [ ] No prompts/flows that bypass user transaction confirmation; every tx confirmed in the user's own wallet.
- [ ] No unauthorized transfers; contract only moves tokens the creator funded + the exact claim amount.
- [ ] Contracts open-source, verified on BscScan, owner permissions disclosed in README.
- [ ] No "Binance"/"BNB" brand use in project/token/domain names.
- [ ] No collection of seed phrases, private keys, API secrets, pairing codes.
- [ ] No promised returns ("passive income", "automatic money-making") in any copy.
- [ ] No "look up other people's wallets by name" feature.
- [ ] Trading products N/A (not a trading product) — no risk-warning requirement triggered.

## Standing rules that still apply
- Fari's rule: preview every tx + wait for his confirmation (incl. any claim/deploy/funding tx). Paid txs need his explicit "gas" after a preview shown in chat.
- Address-poisoning rule: never copy addresses from tx history — saved/verified addresses only. Agent ID contract address above is from the official Binance announcement (verified 19 Nov).
- After any mainnet deploy: record contract address + tx + BscScan link in this workspace + MEMORY.md.
