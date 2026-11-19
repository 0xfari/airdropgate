# SUBMISSION — Binance Agent ID Hackathon (AirdropGate)

> Status riset: **TIDAK ADA form/portal submit proyek yang dipublikasikan (per 2026-11-19 ~12:40 WIB).**
> File ini harus dicek ulang sebelum submit. Jangan pernah submit lewat link yang
> tidak berasal dari kanal resmi (pengumuman Binance, @BinanceWallet, @BNBCHAIN,
> bnbchain.org) — link dari DM/postingan acak = anggap scam.

## 1. Fakta lomba (dari pengumuman resmi)

- Pengumuman: https://www.binance.com/en/support/announcement/detail/95f5dbe0ea674a48a739b59e046648bf
- Penyelenggara: Binance Wallet + BNB Chain. Total hadiah 60.000 USDC
  (2 award proyek @ 29.000 USDC + kampanye promosi X 2.000 USDC).
- **Submission Period: 2026-11-18 08:00 UTC s.d. 2026-12-09 08:00 UTC**
  (= 9 Des 2026 15:00 WIB).
- Internal Review: 9 Des → 17 Des 2026 (UTC).
- Public Review: 17 Des → 20 Des 2026 (UTC).
- Hadiah dikirim ≤ 14 hari kerja setelah public review, ke "reward receiving
  address provided during project submission" — alamat ini diminta saat submit.
- Satu tim = satu proyek.

## 2. Yang diminta saat submit (kata pengumuman, langkah 3)

> "Submit your project name, website, contract address(es), Agent ID usage
> description, and other required materials during the Submission Period.
> No registration needed."

Artinya yang harus disiapkan:

1. Project name: **AirdropGate**
2. Website: URL frontend yang live (hosting publik).
3. Contract address(es): alamat kontrak AirdropGate di BNB Chain mainnet
   (SEMUA alamat kontrak yang dihitung — termasuk token contract bila ada).
4. Agent ID usage description: penjelasan cara AirdropGate memakai Agent ID
   (gate klaim: `balanceOf` > 0 pada kontrak Agent ID
   `0x60b9262456de011f7d15a54cdd8c48baaa8b022f`).
5. "Other required materials": tidak dirinci di pengumuman — isi form yang
   sebenarnya akan menentukan (kemungkinan: repo GitHub, deskripsi proyek,
   kontak tim, reward receiving address, demo video/link).
6. Reward receiving address (alamat terima USDC bila menang).

## 3. Syarat kelayakan yang harus sudah terpenuhi SEBELUM submit

- Kontrak ter-deploy di BNB Chain mainnet, source code **terverifikasi dan
  open-source di BscScan**.
- Produk live dan bisa dipakai.
- Innovation Award: **minimal 30 alamat pemegang Agent ID sudah berinteraksi**
  dengan kontrak selama Submission Period (18 Nov–9 Des). Interaksi sebelum
  18 Nov tidak dihitung.
- Patuhi red line: tanpa login QR web, tanpa bypass konfirmasi transaksi user,
  tanpa transfer tak sah, tanpa janji return ("passive income" dilarang),
  tanpa kumpul seed phrase/private key/API secret/pairing code, tanpa nama
  "Binance"/"BNB" di nama proyek/token/domain, produk trading harus ada
  risk warning, Agent ID tidak boleh dikemas sebagai alat lookup wallet orang.
- Hanya alamat kontrak yang di-submit yang dihitung; alamat yang berinteraksi
  harus pemegang Agent ID.

## 4. Kanal submit proyek — HASIL RISET (negatif)

**Tidak ditemukan URL form submit proyek di mana pun per 2026-11-19 ~12:40 WIB.**
Yang dicek:

| # | Sumber | Hasil |
|---|--------|-------|
| 1 | Pengumuman resmi (dibaca penuh 2x, 277 baris) | Tidak ada link form submit. Satu-satunya outlink = survei kampanye X (lihat §5). "For More Information:" kosong. |
| 2 | Repost Binance Square (post 389517345917641, dibaca penuh 334 baris) | Isi sama + tabel developer resources. Tidak ada form submit. |
| 3 | Post berita Binance Square (11-18-2026-...-389517706162185) | Ringkasan berita saja, tanpa form. |
| 4 | Pencarian web (6 sudut query berbeda: "submit project", "registration", "forms.gle", "dorahacks", "bnbchain.org hackathons agent id", "survey app.binance.com") | Tidak ada form submit, tidak ada halaman hackathon bnbchain.org untuk Agent ID, tidak ada listing DoraHacks. |
| 5 | Post X resmi @BNBCHAIN dan @BinanceWallet (via mirror teapaw) | Hanya menautkan ke pengumuman. Tidak ada link form. |
| 6 | Blog BNB Chain | Tidak ada posting tentang hackathon ini (hanya pemenang BNB Hack edisi sebelumnya). |
| 7 | Artikel agregator (seismyc/BTCWires, coincu, weex, toobit, ainvest) | Menyalin pengumuman saja, tanpa link form tambahan. |
| 8 | Postingan peserta (AgentWall, dsb.) | Mereka membangun dan mempromosikan proyeknya, tapi tidak ada yang menautkan form submit resmi. |

## 5. JANGAN KELIRU — survei kampanye X (BUKAN submit proyek)

Satu-satunya link survei resmi yang dipublikasikan:

**https://app.binance.com/uni-qr/user-survey/ff6832f8d2984af289068c9450a3c98c**

Ini **hanya untuk kampanye promosi X** (Agent Ecosystem Promotion Award):
posting konten original di X tentang proyek peserta dengan hashtag
#BinanceWalletHackathon + #AgenticWallet, lalu kirim link postingan lewat
survei ini. 20 pemenang berbagi 2.000 USDC. Halaman survei minta login akun
Binance. **Jangan pakai link ini untuk submit proyek AirdropGate.**

## 6. Kanal submit yang PALING MUNGKIN (dugaan beralasan, bukan fakta)

Dua pola dari hackathon Binance/BNB Chain sebelumnya:

1. **Survei Binance (paling mungkin).** Binance Agent OS Mini Hackathon
   (Sep 2026, juga 60.000 USDC) memakai pola yang sama persis: pengumuman +
   "Complete the survey: app.binance.com/uni-qr/user-survey/…". Link survei
   itu dipublikasikan lewat postingan X @Binance dan blog Binance, BUKAN di
   dalam pengumuman. Kemungkinan besar hackathon ini juga akan memakai satu
   survei `app.binance.com/uni-qr/user-survey/<hash>` khusus proyek — yang
   sampai saat ini belum dipublikasikan.
2. **Google Form / halaman bnbchain.org (pola BNB Chain).** BNB Hack:
   Tokenized Stocks Edition memakai halaman
   `bnbchain.org/en/hackathons/tokenized-stocks` + Google Forms
   (register `forms.gle/NEmy3FxYc4f5Dua47`, submit
   `forms.gle/yToDUzaDMwWnq6R6A`). Sejauh ini tidak ada halaman
   `bnbchain.org/en/hackathons/*` untuk Agent ID.

Catatan: tombol "REGISTER NOW" di grafis promo resmi belum terverifikasi
arah linknya (kemungkinan besar ke pengumuman). Jangan asumsikan itu form.

## 7. Langkah submit (begitu kanal resmi muncul)

1. Verifikasi link HANYA dari: pengumuman resmi (cek ulang halamannya),
   postingan X @BinanceWallet / @BNBCHAIN, blog binance.com, atau
   bnbchain.org. Cocokkan domain persis (`binance.com`, `app.binance.com`,
   `bnbchain.org`, `forms.gle` yang ditautkan dari halaman resmi).
2. Siapkan paket submit (lihat §2): nama, website live, alamat kontrak
   (BscScan terverifikasi), deskripsi pemakaian Agent ID, repo GitHub publik,
   alamat terima hadiah (USDC).
3. Isi form SEKALI (satu proyek per tim). Simpan bukti: screenshot
   konfirmasi + URL/survey ID + tanggal/jam submit (WIB + UTC).
4. Catat di file ini: URL form yang dipakai, tanggal submit, dan ID/konfirmasi
   apa pun yang diberikan.
5. Setelah submit: terus dorong interaksi (target ≥30 alamat Agent ID) sampai
   9 Des 08:00 UTC — interaksi setelah submit tetap dihitung selama masih
   dalam Submission Period.

## 8. Jadwal cek ulang kanal submit

- Cek pengumuman + pencarian "Agent ID Hackathon submit/survey" **setiap 2–3
  hari** selama build (berikutnya ~21–22 Nov 2026).
- Cek lagi **5 Des 2026** (4 hari sebelum deadline) dan **7 Des 2026**.
- Deadline keras submit: **9 Des 2026 08:00 UTC / 15:00 WIB**.
- Bila sampai 7 Des belum ada kanal resmi: eskalasi ke Fari — opsi terakhir
  adalah menanyakan lewat kanal resmi Binance (reply ke postingan
  @BinanceWallet/@BNBCHAIN, atau support) — JANGAN menebak-nebak form.

## 9. Referensi

- Pengumuman: https://www.binance.com/en/support/announcement/detail/95f5dbe0ea674a48a739b59e046648bf
- Square repost: https://www.binance.com/en/square/post/389517345917641
- Survei kampanye X (BUKAN submit proyek): https://app.binance.com/uni-qr/user-survey/ff6832f8d2984af289068c9450a3c98c
- Kontrak Agent ID (BSC): 0x60b9262456de011f7d15a54cdd8c48baaa8b022f
  (SPACE ID Agent ID, ERC-721, non-transferable; cek `balanceOf(address) > 0`)
- Agentic Wallet docs: https://web3.binance.com/en/dev-docs/products/agentic-wallet/introduction
- Agent OS: https://www.binance.com/en/agent-os
- BNB Agent Studio docs: https://docs.bnbchain.org/developer-kit/bnbchain-studio/
- Contoh pola submit BNB Hack sebelumnya (bukan hackathon ini):
  halaman https://www.bnbchain.org/en/hackathons/tokenized-stocks,
  submit https://forms.gle/yToDUzaDMwWnq6R6A

---
*Riset oleh subagent, 2026-11-19 ~12:40 WIB. Read-only: tidak ada yang di-submit,
tidak ada form yang diisi, tidak ada login.*
