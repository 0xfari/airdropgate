# AirdropGate

Airdrop claims gated by **Agent ID**: a project funds a campaign with tokens, and only wallets holding an Agent ID can claim — one claim per Agent ID. Because each user can hold exactly one Agent ID and it is non-transferable, distribution is Sybil-resistant by construction.

Built for the **Agent ID Hackathon** (Binance Wallet + BNB Chain, submission period 18 Nov – 9 Dec 2026).

## How it works

Two kinds of campaigns, both created with `createCampaign(token, merkleRoot, amountPerClaim, deadline, maxClaims)`:

- **Allowlist** — `merkleRoot != 0`. The creator publishes a list of addresses; a claimer proves membership with a Merkle proof of `keccak256(abi.encodePacked(msg.sender))`, built in the browser from the address list. Nothing is uploaded anywhere.
- **Open** — `merkleRoot == 0`. Any Agent ID holder can claim, first come first served, until `maxClaims` is reached or the deadline passes.

The creator funds the campaign up front: the contract pulls exactly `amountPerClaim × maxClaims` tokens via `transferFrom` (approve first). After the deadline passes — or after the creator cancels — the creator can `reclaim` the unclaimed tokens. Claims are one per wallet per campaign.

## The Agent ID gate

The gate is the core function, not an add-on. Every claim checks the Agent ID contract on-chain:

```solidity
IERC721(agentId).balanceOf(msg.sender) > 0
```

- The Agent ID contract address is immutable, set once in the constructor. Mainnet: `0x60b9262456de011f7d15a54cdd8c48baaa8b022f` (SPACE ID Agent ID, ERC-721, non-transferable).
- The caller is always `msg.sender` — their own connected wallet. This project never resolves a name to a wallet and has no "look up other people's wallets" feature.
- The frontend also shows a live eligibility check (Agent ID held? already claimed? campaign still open?) before any transaction is sent.

## Contract

`src/AirdropGate.sol` — Solidity ^0.8.20, OpenZeppelin, Foundry. No owner/admin role, no pause, no upgrade proxy.

| Function | Who | What |
|---|---|---|
| `createCampaign(token, merkleRoot, amountPerClaim, deadline, maxClaims)` | anyone | Funds a campaign, pulls `amountPerClaim × maxClaims` tokens |
| `claim(campaignId, proof)` | Agent ID holder | Claims once; effects before interaction, `ReentrancyGuard` |
| `cancelCampaign(campaignId)` | creator, before deadline | Stops claims immediately |
| `reclaim(campaignId)` | creator, after deadline or cancel | Returns unclaimed tokens to the creator |
| `campaignCount()`, `campaigns(id)`, `hasClaimed(id, addr)`, `remaining(id)`, `isAgentIdHolder(addr)` | anyone | Views |

Custom errors throughout (no revert strings). Events: `CampaignCreated`, `Claimed`, `CampaignCancelled`, `Reclaimed`.

### Owner-permissions disclosure

The contract is **ownerless**. There is no admin key and no function that moves anyone else's funds. Each campaign's creator can only:

1. cancel **their own** campaign, and only before its deadline; and
2. reclaim **their own** campaign's unclaimed tokens, and only after the deadline passes or after they cancelled it.

The contract can never trap funds: every funded token is either claimed by an Agent ID holder or reclaimable by the campaign creator. No function can change the Agent ID address, the rules, or another campaign's state after deployment.

## Deployments

| Network | AirdropGate | Agent ID | Status |
|---|---|---|---|
| Testnet (chain ID 97) | — | mock (deployed with the gate) | Deployment pending — testnet faucet funding required (see below) |
| Mainnet (chain ID 56) | — | `0x60b9262456de011f7d15a54cdd8c48baaa8b022f` | Planned after testnet verification |

Testnet deployer (fresh key, testnet only): `0xee33A844fe7cA978D2798a0eaD1C823D61367680`. It holds no funds yet; the drip must come from the testnet faucet, which requires solving a captcha in a browser.

Verify on the block explorer after each deploy (`forge verify-contract`; a BscScan API key is required — none is on file yet, Sourcify is the fallback).

## Website

`web/` — a static site, no backend, no server, no sessions. Plain HTML + JS with ethers v6 from a CDN. Connect a wallet, create campaigns, check eligibility live, and claim. Every transaction is confirmed by the user in their own wallet. Live at: **https://0xfari.github.io/airdropgate/web/** (GitHub Pages, served from `web/`).

## Development

```bash
export PATH=$HOME/.foundry/bin:$PATH
forge build
forge test        # 27 tests, Foundry + mock Agent ID ERC-721
```

Testnet deploy (fresh key + faucet tBNB only; never mainnet funds):

```bash
DEPLOYER_PRIVATE_KEY=<key> AGENT_ID_ADDRESS=0x0000000000000000000000000000000000000000 \
  forge script script/Deploy.s.sol --rpc-url bsc_testnet --broadcast
```

`AGENT_ID_ADDRESS=0x0` deploys a mock Agent ID contract for testnet. For mainnet, pass the real Agent ID address above instead (mainnet deploy needs the deployer's explicit approval first).

## Hackathon red lines — checklist

- [x] No web QR-code login for the Agentic Wallet; no pairing codes; no server-side sessions placing orders for users. (Static site; `window.ethereum` only.)
- [x] No prompts or flows that bypass user transaction confirmation; every transaction is confirmed in the user's own wallet.
- [x] No unauthorized transfers; the contract only moves tokens the creator funded, and exactly the claim amount per claim.
- [x] Contracts open-source, verified on the block explorer, owner permissions disclosed above.
- [x] No brand use in the project name, token name, or domain.
- [x] No collection of seed phrases, private keys, API secrets, or pairing codes — the site never asks for them.
- [x] No promised returns ("passive income", "automatic money-making") anywhere in the copy.
- [x] No "look up other people's wallets by name" feature.
- [x] Not a trading product — no risk-warning requirement triggered. (The site still notes that claiming costs gas and that distributed tokens may have no value.)

## Risk note

Claiming costs network gas. Tokens distributed through a campaign may have no value. AirdropGate is a smart contract: read it before interacting, and never share your seed phrase or private key with anyone — this site will never ask for them.
