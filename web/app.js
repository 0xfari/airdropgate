// AirdropGate frontend — static, no backend. Reads the chain directly and asks
// the user's own wallet to sign every transaction. No server, no sessions,
// no seed phrases, private keys, or API secrets are ever collected.

const NETWORKS = {
  56: {
    label: "Chain ID 56 (mainnet)",
    agentId: "0x60b9262456de011f7d15a54cdd8c48baaa8b022f",
    contract: null, // mainnet deployment pending; set after the mainnet deploy
    explorer: "https://bscscan.com",
    rpc: "https://bsc-dataseed.binance.org/",
  },
  97: {
    label: "Chain ID 97 (testnet)",
    agentId: "0x0B66E14D886630f5190280FCd2e40007a26Ee7CC", // MockAgentId, deployed 2026-11-19
    contract: "0xBe253998add7366A0099E2b4fd22d02026a74D56", // AirdropGate, deployed 2026-11-19
    explorer: "https://testnet.bscscan.com",
    rpc: "https://data-seed-prebsc-1-s1.binance.org:8545/",
  },
};

const GATE_ABI = [
  "function agentId() view returns (address)",
  "function campaignCount() view returns (uint256)",
  "function campaigns(uint256) view returns (address creator, address token, bytes32 merkleRoot, uint256 amountPerClaim, uint256 deadline, uint256 maxClaims, uint256 claimedCount, uint256 funded, bool cancelled)",
  "function claimed(uint256, address) view returns (bool)",
  "function hasClaimed(uint256, address) view returns (bool)",
  "function remaining(uint256) view returns (uint256)",
  "function isAgentIdHolder(address) view returns (bool)",
  "function createCampaign(address token, bytes32 merkleRoot, uint256 amountPerClaim, uint256 deadline, uint256 maxClaims) returns (uint256)",
  "function claim(uint256 campaignId, bytes32[] proof)",
  "function cancelCampaign(uint256 campaignId)",
  "function reclaim(uint256 campaignId)",
  "event CampaignCreated(uint256 indexed campaignId, address indexed creator, address indexed token, bytes32 merkleRoot, uint256 amountPerClaim, uint256 deadline, uint256 maxClaims)",
  "event Claimed(uint256 indexed campaignId, address indexed claimer, uint256 amount)",
  "event CampaignCancelled(uint256 indexed campaignId, address indexed creator)",
  "event Reclaimed(uint256 indexed campaignId, address indexed creator, uint256 amount)",
];

const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
];

const $ = (id) => document.getElementById(id);
let provider = null;
let signer = null;
let account = null;
let chainId = null;
let selectedId = null;
let selectedProof = [];
let pendingCreate = null;

function setStatus(msg, cls) {
  const el = $("status");
  el.textContent = msg;
  el.className = cls || "";
}

function setDetailStatus(msg, cls) {
  const el = $("detailStatus");
  el.textContent = msg;
  el.className = cls || "";
}

function shortAddr(a) {
  return a ? a.slice(0, 6) + "…" + a.slice(-4) : "";
}

function explorerTx(hash) {
  const net = NETWORKS[chainId];
  return net ? net.explorer + "/tx/" + hash : "#";
}

function explorerAddr(addr) {
  const net = NETWORKS[chainId];
  return net ? net.explorer + "/address/" + addr : "#";
}

function timeLeft(deadline) {
  const now = Math.floor(Date.now() / 1000);
  const diff = deadline - now;
  if (diff <= 0) return "ended";
  const d = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  const m = Math.floor((diff % 3600) / 60);
  if (d > 0) return `ends in ${d}d ${h}h`;
  if (h > 0) return `ends in ${h}h ${m}m`;
  return `ends in ${m}m`;
}

// -- Merkle tree (matches OpenZeppelin MerkleProof.verify: sorted pairs) ----
function leafOf(addr) {
  return ethers.keccak256(ethers.solidityPacked(["address"], [addr]));
}
function hashPair(a, b) {
  const [x, y] = BigInt(a) < BigInt(b) ? [a, b] : [b, a];
  return ethers.keccak256(ethers.solidityPacked(["bytes32", "bytes32"], [x, y]));
}
function buildTree(addresses) {
  const uniq = [...new Set(addresses.map((a) => a.toLowerCase()))];
  const leaves = uniq.map(leafOf).sort((a, b) => (BigInt(a) < BigInt(b) ? -1 : 1));
  const layers = [leaves];
  while (layers[layers.length - 1].length > 1) {
    const cur = layers[layers.length - 1];
    const next = [];
    for (let i = 0; i < cur.length; i += 2) {
      if (i + 1 < cur.length) next.push(hashPair(cur[i], cur[i + 1]));
      else next.push(cur[i]); // odd leaf is promoted unchanged
    }
    layers.push(next);
  }
  return { root: layers[layers.length - 1][0], layers };
}
function proofFor(address, tree) {
  const leaf = leafOf(address);
  let idx = tree.layers[0].indexOf(leaf);
  if (idx === -1) return null;
  const proof = [];
  for (let level = 0; level < tree.layers.length - 1; level++) {
    const layer = tree.layers[level];
    const sibling = idx % 2 === 0 ? idx + 1 : idx - 1;
    if (sibling < layer.length) proof.push(layer[sibling]);
    idx = Math.floor(idx / 2);
  }
  return proof;
}
function parseAddressList(text) {
  const out = [];
  const seen = new Set();
  for (const line of text.split(/\r?\n/)) {
    const a = line.trim();
    if (!a) continue;
    if (!ethers.isAddress(a)) throw new Error("Invalid address in list: " + a);
    const lower = a.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      out.push(ethers.getAddress(a));
    }
  }
  return out;
}

// -- Wallet / network ------------------------------------------------------
function currentNet() {
  return NETWORKS[chainId] || null;
}

async function connect() {
  if (!window.ethereum) {
    setStatus("No wallet found in this browser. Install a wallet extension that injects window.ethereum, then reload.", "err");
    return;
  }
  try {
    provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    account = accounts[0];
    signer = await provider.getSigner();
    chainId = Number((await provider.getNetwork()).chainId);
    $("connectBtn").textContent = shortAddr(account);
    updateNetworkUI();
    await loadCampaigns();
    if (selectedId !== null) await selectCampaign(selectedId);
  } catch (e) {
    setStatus("Connection failed: " + (e?.shortMessage || e?.message || e), "err");
  }
}

async function updateNetworkUI() {
  const net = currentNet();
  const pill = $("networkPill");
  if (!net) {
    pill.textContent = "chain " + chainId + " — unsupported";
    pill.className = "pill red";
    setStatus("This page supports chain ID 56 (mainnet) and chain ID 97 (testnet). Switch networks in your wallet.", "warn");
    return;
  }
  pill.textContent = net.label;
  pill.className = "pill green";
  $("agentContractAddr").textContent = net.agentId;
  // Live Agent ID check for the connected wallet.
  try {
    const agent = new ethers.Contract(net.agentId, ["function balanceOf(address) view returns (uint256)"], provider);
    const bal = await agent.balanceOf(account);
    const pillA = $("agentPill");
    if (bal > 0n) {
      pillA.textContent = "Agent ID: held";
      pillA.className = "pill green";
    } else {
      pillA.textContent = "Agent ID: not held";
      pillA.className = "pill red";
    }
  } catch (e) {
    $("agentPill").textContent = "Agent ID: ?";
    $("agentPill").className = "pill";
  }
}

async function switchNetwork(target) {
  if (!window.ethereum) return;
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x" + target.toString(16) }],
    });
  } catch (e) {
    if (e?.code === 4902) {
      const net = NETWORKS[target];
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: "0x" + target.toString(16),
          chainName: target === 56 ? "Smart Chain Mainnet" : "Smart Chain Testnet",
          rpcUrls: [net.rpc],
          nativeCurrency: { name: "Smart Chain Token", symbol: "BNB", decimals: 18 },
          blockExplorerUrls: [net.explorer],
        }],
      });
    } else {
      throw e;
    }
  }
}

// -- Campaigns ---------------------------------------------------------------
function gateContract(withSigner) {
  const net = currentNet();
  if (!net || !net.contract || net.contract === "0x0000000000000000000000000000000000000000") return null;
  return new ethers.Contract(net.contract, GATE_ABI, withSigner ? signer : provider);
}

async function tokenMeta(tokenAddr) {
  const t = new ethers.Contract(tokenAddr, ERC20_ABI, provider);
  let decimals = 18;
  let symbol = "";
  try { decimals = Number(await t.decimals()); } catch (e) { /* keep 18 */ }
  try { symbol = await t.symbol(); } catch (e) { /* keep blank */ }
  return { decimals, symbol };
}

async function loadCampaigns() {
  const list = $("campaignList");
  const gate = gateContract(false);
  if (!gate) {
    const net = currentNet();
    list.innerHTML = `<p class="muted">${net ? "The contract is not deployed on " + net.label + " yet." : "Connect a wallet on a supported network to load campaigns."}</p>`;
    $("campaignCount").textContent = "";
    return;
  }
  list.innerHTML = "<p class='muted'>Loading campaigns from the chain…</p>";
  try {
    const count = Number(await gate.campaignCount());
    $("campaignCount").textContent = `(${count})`;
    if (count === 0) {
      list.innerHTML = "<p class='muted'>No campaigns yet. Create the first one above.</p>";
      return;
    }
    list.innerHTML = "";
    for (let i = count - 1; i >= 0; i--) {
      const c = await gate.campaigns(i);
      const meta = await tokenMeta(c.token);
      const now = Math.floor(Date.now() / 1000);
      const status = c.cancelled
        ? `<span class="pill red">cancelled</span>`
        : now > Number(c.deadline)
          ? `<span class="pill yellow">ended</span>`
          : Number(c.claimedCount) >= Number(c.maxClaims)
            ? `<span class="pill yellow">full</span>`
            : `<span class="pill green">active</span>`;
      const kind = c.merkleRoot === ethers.ZeroHash
        ? `<span class="pill">open</span>`
        : `<span class="pill">allowlist</span>`;
      const div = document.createElement("div");
      div.className = "campaign";
      div.innerHTML = `
        <div class="row"><b>Campaign #${i}</b> ${status} ${kind}</div>
        <div class="muted" style="margin-top:6px">
          Token: <a href="${explorerAddr(c.token)}" target="_blank" rel="noopener">${shortAddr(c.token)}</a>${meta.symbol ? " (" + meta.symbol + ")" : ""}<br>
          Per claim: ${ethers.formatUnits(c.amountPerClaim, meta.decimals)}${meta.symbol ? " " + meta.symbol : ""} &nbsp;·&nbsp;
          Claimed: ${c.claimedCount} / ${c.maxClaims} &nbsp;·&nbsp;
          ${timeLeft(Number(c.deadline))} &nbsp;·&nbsp;
          Creator: ${shortAddr(c.creator)}
        </div>
        <div class="row" style="margin-top:10px"><button class="secondary" data-id="${i}">View &amp; claim</button></div>`;
      div.querySelector("button").addEventListener("click", () => selectCampaign(i));
      list.appendChild(div);
    }
  } catch (e) {
    list.innerHTML = `<p class="err">Failed to load campaigns: ${e?.shortMessage || e?.message || e}</p>`;
  }
}

async function selectCampaign(id) {
  selectedId = id;
  selectedProof = [];
  const gate = gateContract(false);
  if (!gate) return;
  $("detailCard").classList.remove("hidden");
  $("detailId").textContent = "#" + id;
  const c = await gate.campaigns(id);
  const meta = await tokenMeta(c.token);
  const now = Math.floor(Date.now() / 1000);
  const isOpen = c.merkleRoot === ethers.ZeroHash;
  $("detailBody").innerHTML = `
    <p>
      Token: <a href="${explorerAddr(c.token)}" target="_blank" rel="noopener">${shortAddr(c.token)}</a>${meta.symbol ? " (" + meta.symbol + ")" : ""}<br>
      Per claim: <b>${ethers.formatUnits(c.amountPerClaim, meta.decimals)}${meta.symbol ? " " + meta.symbol : ""}</b><br>
      Claimed: ${c.claimedCount} / ${c.maxClaims} &nbsp;·&nbsp; ${timeLeft(Number(c.deadline))}<br>
      Type: ${isOpen ? "Open — any Agent ID holder" : "Allowlist — Merkle proof required"}<br>
      Creator: ${shortAddr(c.creator)} &nbsp;·&nbsp;
      Status: ${c.cancelled ? "cancelled" : now > Number(c.deadline) ? "ended" : "active"}
    </p>`;
  $("allowlistBox").classList.toggle("hidden", isOpen);
  $("proofBox").textContent = "";
  // Creator actions.
  const isCreator = account && account.toLowerCase() === c.creator.toLowerCase();
  $("cancelBtn").classList.toggle("hidden", !(isCreator && !c.cancelled && now <= Number(c.deadline)));
  $("reclaimBtn").classList.toggle("hidden", !(isCreator && (c.cancelled || now > Number(c.deadline))));
  await refreshEligibility();
  $("detailCard").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function refreshEligibility() {
  const gate = gateContract(false);
  const el = $("eligibility");
  const claimBtn = $("claimBtn");
  claimBtn.disabled = true;
  if (!gate || selectedId === null) return;
  if (!account) {
    el.innerHTML = `<p class="warn">Connect a wallet to check eligibility.</p>`;
    return;
  }
  try {
    const c = await gate.campaigns(selectedId);
    const isHolder = await gate.isAgentIdHolder(account);
    const already = await gate.hasClaimed(selectedId, account);
    const now = Math.floor(Date.now() / 1000);
    const lines = [];
    lines.push(isHolder
      ? `<span class="ok">✓ You hold an Agent ID.</span>`
      : `<span class="err">✗ This wallet does not hold an Agent ID — it cannot claim.</span>`);
    lines.push(already
      ? `<span class="warn">You have already claimed from this campaign.</span>`
      : `<span class="ok">✓ You have not claimed yet.</span>`);
    if (c.cancelled) lines.push(`<span class="err">This campaign was cancelled.</span>`);
    else if (now > Number(c.deadline)) lines.push(`<span class="err">This campaign has ended.</span>`);
    else if (Number(c.claimedCount) >= Number(c.maxClaims)) lines.push(`<span class="err">This campaign is full.</span>`);
    el.innerHTML = "<p>" + lines.join("<br>") + "</p>";
    const canClaim = isHolder && !already && !c.cancelled && now <= Number(c.deadline) && Number(c.claimedCount) < Number(c.maxClaims);
    if (c.merkleRoot === ethers.ZeroHash) {
      selectedProof = [];
      claimBtn.disabled = !canClaim;
    } else {
      claimBtn.disabled = true; // enabled after the proof check below
      if (canClaim) {
        el.innerHTML += `<p class="muted">Allowlist campaign: paste the allowlist below to build your proof, then claim.</p>`;
      }
    }
  } catch (e) {
    el.innerHTML = `<p class="err">Eligibility check failed: ${e?.shortMessage || e?.message || e}</p>`;
  }
}

async function checkProof() {
  const gate = gateContract(false);
  if (!gate || selectedId === null) return;
  setDetailStatus("", "");
  try {
    const c = await gate.campaigns(selectedId);
    const list = parseAddressList($("dList").value);
    if (list.length === 0) throw new Error("Paste at least one address.");
    const tree = buildTree(list);
    const box = $("proofBox");
    if (tree.root.toLowerCase() !== c.merkleRoot.toLowerCase()) {
      box.textContent = "This list does not match the campaign allowlist (root mismatch). Ask the creator for the exact list.";
      box.className = "mono err";
      $("claimBtn").disabled = true;
      return;
    }
    const proof = proofFor(account, tree);
    if (!proof) {
      box.textContent = "Your address is not in this allowlist.";
      box.className = "mono err";
      $("claimBtn").disabled = true;
      return;
    }
    selectedProof = proof;
    box.textContent = "You are in the allowlist. Proof built (" + proof.length + " element" + (proof.length === 1 ? "" : "s") + ").";
    box.className = "mono ok";
    const already = await gate.hasClaimed(selectedId, account);
    const isHolder = await gate.isAgentIdHolder(account);
    $("claimBtn").disabled = !(isHolder && !already);
  } catch (e) {
    $("proofBox").textContent = "Error: " + (e?.shortMessage || e?.message || e);
    $("proofBox").className = "mono err";
  }
}

async function doClaim() {
  const gate = gateContract(true);
  if (!gate || selectedId === null) return;
  $("claimBtn").disabled = true;
  try {
    setDetailStatus("Confirm the claim in your wallet…", "");
    const tx = await gate.claim(selectedId, selectedProof);
    setDetailStatus("Claim sent. Waiting for confirmation…", "");
    await tx.wait();
    setDetailStatus("Claimed. ", "ok");
    $("detailStatus").innerHTML += `<a href="${explorerTx(tx.hash)}" target="_blank" rel="noopener">View transaction</a>`;
    await loadCampaigns();
    await selectCampaign(selectedId);
  } catch (e) {
    setDetailStatus("Claim failed: " + (e?.shortMessage || e?.message || e), "err");
    $("claimBtn").disabled = false;
  }
}

async function doCancel() {
  const gate = gateContract(true);
  if (!gate || selectedId === null) return;
  try {
    setDetailStatus("Confirm the cancellation in your wallet…", "");
    const tx = await gate.cancelCampaign(selectedId);
    await tx.wait();
    setDetailStatus("Campaign cancelled. ", "ok");
    $("detailStatus").innerHTML += `<a href="${explorerTx(tx.hash)}" target="_blank" rel="noopener">View transaction</a>`;
    await loadCampaigns();
    await selectCampaign(selectedId);
  } catch (e) {
    setDetailStatus("Cancel failed: " + (e?.shortMessage || e?.message || e), "err");
  }
}

async function doReclaim() {
  const gate = gateContract(true);
  if (!gate || selectedId === null) return;
  try {
    setDetailStatus("Confirm the reclaim in your wallet…", "");
    const tx = await gate.reclaim(selectedId);
    await tx.wait();
    setDetailStatus("Unclaimed tokens reclaimed. ", "ok");
    $("detailStatus").innerHTML += `<a href="${explorerTx(tx.hash)}" target="_blank" rel="noopener">View transaction</a>`;
    await loadCampaigns();
    await selectCampaign(selectedId);
  } catch (e) {
    setDetailStatus("Reclaim failed: " + (e?.shortMessage || e?.message || e), "err");
  }
}

// -- Create campaign ---------------------------------------------------------
async function previewCampaign() {
  setStatus("", "");
  $("approveBtn").disabled = true;
  $("createBtn").disabled = true;
  pendingCreate = null;
  try {
    if (!account) throw new Error("Connect a wallet first.");
    const net = currentNet();
    if (!net) throw new Error("Switch to chain ID 56 or 97 first.");
    if (!gateContract(false)) throw new Error("The contract is not deployed on " + net.label + " yet.");
    const tokenAddr = $("fToken").value.trim();
    if (!ethers.isAddress(tokenAddr)) throw new Error("Token address is invalid.");
    const meta = await tokenMeta(ethers.getAddress(tokenAddr));
    const amountStr = $("fAmount").value.trim();
    const amount = ethers.parseUnits(amountStr, meta.decimals);
    if (amount <= 0n) throw new Error("Amount per claim must be greater than 0.");
    const maxClaims = Number($("fMax").value);
    if (!Number.isInteger(maxClaims) || maxClaims <= 0) throw new Error("Max claims must be a whole number greater than 0.");
    const deadlineStr = $("fDeadline").value;
    if (!deadlineStr) throw new Error("Pick a deadline.");
    const deadline = Math.floor(new Date(deadlineStr).getTime() / 1000);
    if (deadline <= Math.floor(Date.now() / 1000)) throw new Error("Deadline must be in the future.");
    let root = ethers.ZeroHash;
    let listCount = 0;
    const listText = $("fList").value.trim();
    if (listText) {
      const list = parseAddressList(listText);
      if (list.length === 0) throw new Error("Allowlist is empty.");
      if (list.length > maxClaims) {
        setStatus("Note: the allowlist has more addresses (" + list.length + ") than max claims (" + maxClaims + ") — only the first " + maxClaims + " claims will succeed.", "warn");
      }
      root = buildTree(list).root;
      listCount = list.length;
    }
    const total = amount * BigInt(maxClaims);
    pendingCreate = { token: ethers.getAddress(tokenAddr), root, amount, deadline, maxClaims, decimals: meta.decimals, symbol: meta.symbol, total };
    $("previewBox").innerHTML =
      `Type: ${root === ethers.ZeroHash ? "Open" : "Allowlist (" + listCount + " addresses)"}<br>` +
      `Merkle root: ${root}<br>` +
      `Total funding pulled from your wallet: ${ethers.formatUnits(total, meta.decimals)}${meta.symbol ? " " + meta.symbol : ""}<br>` +
      `Deadline: ${new Date(deadline * 1000).toLocaleString()}<br>` +
      `Approve the exact total above, then create. Each step is a separate transaction you confirm in your wallet.`;
    $("approveBtn").disabled = false;
  } catch (e) {
    setStatus("Preview failed: " + (e?.shortMessage || e?.message || e), "err");
  }
}

async function approveTokens() {
  if (!pendingCreate) return;
  try {
    setStatus("Confirm the approval in your wallet…", "");
    const t = new ethers.Contract(pendingCreate.token, ERC20_ABI, signer);
    const net = currentNet();
    const tx = await t.approve(net.contract, pendingCreate.total);
    await tx.wait();
    setStatus("Approved. You can now create the campaign.", "ok");
    $("createBtn").disabled = false;
  } catch (e) {
    setStatus("Approval failed: " + (e?.shortMessage || e?.message || e), "err");
  }
}

async function createCampaignTx() {
  if (!pendingCreate) return;
  const gate = gateContract(true);
  if (!gate) return;
  try {
    setStatus("Confirm the creation in your wallet…", "");
    const tx = await gate.createCampaign(
      pendingCreate.token, pendingCreate.root, pendingCreate.amount, pendingCreate.deadline, pendingCreate.maxClaims
    );
    setStatus("Campaign sent. Waiting for confirmation…", "");
    await tx.wait();
    setStatus("Campaign created. ", "ok");
    $("status").innerHTML += `<a href="${explorerTx(tx.hash)}" target="_blank" rel="noopener">View transaction</a>`;
    $("approveBtn").disabled = true;
    $("createBtn").disabled = true;
    pendingCreate = null;
    await loadCampaigns();
  } catch (e) {
    setStatus("Creation failed: " + (e?.shortMessage || e?.message || e), "err");
  }
}

// -- Wire up -------------------------------------------------------------------
$("connectBtn").addEventListener("click", connect);
$("netMainBtn").addEventListener("click", async () => { try { await switchNetwork(56); } catch (e) { setStatus("Network switch failed: " + (e?.shortMessage || e?.message || e), "err"); } });
$("netTestBtn").addEventListener("click", async () => { try { await switchNetwork(97); } catch (e) { setStatus("Network switch failed: " + (e?.shortMessage || e?.message || e), "err"); } });
$("previewBtn").addEventListener("click", previewCampaign);
$("approveBtn").addEventListener("click", approveTokens);
$("createBtn").addEventListener("click", createCampaignTx);
$("claimBtn").addEventListener("click", doClaim);
$("cancelBtn").addEventListener("click", doCancel);
$("reclaimBtn").addEventListener("click", doReclaim);
$("checkProofBtn").addEventListener("click", checkProof);

if (window.ethereum) {
  window.ethereum.on("accountsChanged", () => window.location.reload());
  window.ethereum.on("chainChanged", () => window.location.reload());
}

// Pre-fill the Agent ID contract address for the default network note.
$("agentContractAddr").textContent = NETWORKS[56].agentId;
