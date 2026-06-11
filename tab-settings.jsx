/* ============================================================
   tab-settings.jsx — currencies, rates, gold price, categories,
   data (import/export/encrypted backup), app lock, sharing
   ============================================================ */
function SettingsTab() {
  const app = useApp();
  const { cur, cur2, setCurrency, setCurrency2, budgetMethod, setField, categories, addCategory, deleteCategory,
          exportJSON, importJSON, exportEncrypted, importEncrypted, lockEnabled, enableLock, disableLock,
          clearMonth, month, rates, setRate, resetRates, goldPrice, setGoldPrice, convert } = app;

  const [newCat, setNewCat] = useState("");
  const [newColor, setNewColor] = useState(SWATCHES[0]);
  const [confirmClear, setConfirmClear] = useState(false);
  const [lockModal, setLockModal] = useState(null);   // "enable" | "backup" | "restore"
  const [notice, setNotice] = useState("");

  const flash = (msg) => { setNotice(msg); setTimeout(() => setNotice(""), 4000); };

  const addCat = () => {
    const n = newCat.trim();
    if (!n || categories.some((c) => c.name.toLowerCase() === n.toLowerCase())) return;
    addCategory({ name: n, color: newColor });
    setNewCat("");
  };

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <div className="eyebrow">Settings</div>
          <h1>Make it yours.</h1>
          <p className="lede">Currencies, rates, the gold price, your categories — and keeping your data safe.</p>
        </div>
      </div>

      {notice && <div className="tip" style={{ marginBottom: 16 }}><span className="ic"><Icon name="info" size={18} /></span><p>{notice}</p></div>}

      <div className="grid cols-2" style={{ alignItems: "start" }}>
        <div className="stack" style={{ gap: 18 }}>
          <Card>
            <div className="card-head"><h3>Display currencies</h3><span className="sub">totals are shown in both</span></div>
            <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <Field label="Primary"><CurrencySelect value={cur} onChange={setCurrency} /></Field>
              <Field label="Secondary"><CurrencySelect value={cur2} onChange={setCurrency2} /></Field>
            </div>
            <Tip>Every amount is <b>kept in the currency you entered it in</b>. These two only control how totals are displayed — e.g. net worth in <b>{cur}</b> with its <b>{cur2}</b> equivalent underneath.</Tip>
          </Card>

          <Card>
            <div className="card-head">
              <div><h3>Exchange rates</h3><span className="sub">manual — you're in charge</span></div>
              <Btn size="sm" variant="ghost" onClick={resetRates}>Reset</Btn>
            </div>
            <Tip>Update a rate and <b>everything re-prices instantly</b> — totals, charts, conversions. Your original amounts never change, since each entry remembers its own currency.</Tip>
            <div className="between mt-16" style={{ marginBottom: 4 }}>
              <span className="muted" style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>Units per 1 $ USD</span>
            </div>
            <div className="rate-grid">
              {Object.entries(CURRENCIES).map(([k, v]) => (
                <div className="rate-row" key={k}>
                  <span className="rate-code"><span className="mono" style={{ color: "var(--gold-deep)" }}>{v.sym}</span> {k}</span>
                  <input className="input mono" type="number" min="0" step="any" disabled={k === "USD"}
                    value={rates[k] ?? ""} onChange={(e) => setRate(k, parseFloat(e.target.value) || 0)} />
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="card-head"><h3>Gold price</h3><span className="sub">manual, like the rates</span></div>
            <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr", alignItems: "end" }}>
              <Field label="USD per gram (24k)">
                <div className="input-prefix"><span className="sym">$</span>
                  <input className="input mono" type="number" min="0" step="any"
                    value={goldPrice} onChange={(e) => setGoldPrice(parseFloat(e.target.value) || 0)} />
                </div>
              </Field>
              <div className="muted" style={{ fontSize: 13, paddingBottom: 10 }}>
                ≈ {fmt(convert(goldPrice, "USD", cur), cur)} per gram in {cur}
              </div>
            </div>
            <Tip>Lower karats are valued by purity automatically: 22k = 91.7%, 21k = 87.5%, 18k = 75%, 14k = 58.3% of this price.</Tip>
          </Card>

          <Card>
            <div className="card-head"><h3>Default budget method</h3></div>
            <div className="seg">
              {Object.entries(BUDGET_METHODS).map(([k, v]) => (
                <button key={k} className={budgetMethod === k ? "on" : ""} onClick={() => setField("budgetMethod", k)}>{v.label}</button>
              ))}
            </div>
            <p className="soft mt-16" style={{ fontSize: 13.5 }}>{BUDGET_METHODS[budgetMethod].blurb}</p>
          </Card>
        </div>

        <div className="stack" style={{ gap: 18 }}>
          <Card>
            <div className="card-head"><h3>Security</h3><span className="sub">your numbers, your eyes only</span></div>
            <div className="between" style={{ background: "var(--inset)", padding: "12px 16px", borderRadius: 12 }}>
              <div className="flex gap-12" style={{ alignItems: "center" }}>
                <Icon name={lockEnabled ? "lock" : "unlock"} size={20} style={{ color: lockEnabled ? "var(--pos)" : "var(--ink-faint)" }} />
                <div>
                  <div style={{ fontWeight: 700 }}>App lock {lockEnabled ? "is on" : "is off"}</div>
                  <div className="muted" style={{ fontSize: 12.5 }}>{lockEnabled ? "Data is encrypted on this device (AES-256). You'll be asked for the passphrase on open." : "Data is stored unencrypted in this browser."}</div>
                </div>
              </div>
              {lockEnabled
                ? <Btn size="sm" variant="ghost" onClick={() => { disableLock(); flash("App lock removed — data is stored unencrypted again."); }}>Turn off</Btn>
                : <Btn size="sm" variant="primary" icon="lock" onClick={() => setLockModal("enable")}>Set passphrase</Btn>}
            </div>
            <Tip><b>Heads up:</b> there is no recovery. If you forget the passphrase, the encrypted data can't be opened — keep a backup somewhere safe.</Tip>
          </Card>

          <Card>
            <div className="card-head"><h3>Your data</h3><span className="sub">backups & restore</span></div>
            <Tip>Everything lives privately in this browser — nothing is uploaded. Export a backup anytime; encrypted backups are safe to keep in cloud drives.</Tip>
            <div className="flex gap-12 wrap mt-16">
              <Btn icon="download" onClick={exportJSON}>Export JSON</Btn>
              <Btn icon="upload" onClick={() => importJSON((err) => flash(err || "Data imported — welcome back."))}>Import JSON</Btn>
            </div>
            <div className="flex gap-12 wrap mt-8">
              <Btn icon="lock" onClick={() => setLockModal("backup")}>Encrypted backup</Btn>
              <Btn icon="unlock" onClick={() => setLockModal("restore")}>Restore encrypted backup</Btn>
            </div>
            <div className="flex gap-12 wrap mt-16">
              <Btn variant="danger" icon="trash" onClick={() => setConfirmClear(true)}>Clear this month</Btn>
            </div>
            <p className="muted mt-8" style={{ fontSize: 12.5 }}>“Clear this month” removes income & expenses for {monthLabel(month)} {monthYear(month)} only. Wealth, goals, and settings are kept.</p>
          </Card>

          <Card>
            <div className="card-head"><h3>Share with friends</h3><span className="sub">give them their own Ledger</span></div>
            <p className="soft" style={{ fontSize: 14 }}>
              The Ledger is a self-contained web app — anyone who opens it gets <b>their own private copy</b>, with their data stored only in their browser. Two easy ways to share:
            </p>
            <ol className="share-list">
              <li><b>Send the folder.</b> Zip this app's folder and send it — they open <i>index.html</i> in any browser. (Internet is needed once, to load fonts & libraries.)</li>
              <li><b>Host it free.</b> Drop the folder on <b>Netlify</b>, <b>Vercel</b>, or <b>GitHub Pages</b> and share the link. Everyone's data still stays on their own device — nothing is shared between users.</li>
            </ol>
            <Tip>Want real accounts, sync between devices, and shared budgets? That needs a small backend (e.g. Supabase) — it's on the roadmap in the README.</Tip>
          </Card>

          <Card>
            <div className="card-head"><h3>Categories</h3><span className="sub">{categories.length} total</span></div>
            <div className="flex gap-12" style={{ alignItems: "flex-end" }}>
              <Field label="New category"><input className="input" placeholder="e.g. Subscriptions" value={newCat}
                onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCat()} /></Field>
              <Btn variant="primary" icon="plus" onClick={addCat}>Add</Btn>
            </div>
            <div className="mt-16"><SwatchPicker value={newColor} onChange={setNewColor} /></div>

            <div className="flex gap-8 wrap" style={{ marginTop: 18 }}>
              {categories.map((c) => (
                <span key={c.name} className="cat-badge" style={{ background: c.color + "1f", color: c.color, paddingRight: 6 }}>
                  <span className="dot" style={{ background: c.color }} />{c.name}
                  <button className="mini-btn" style={{ width: 20, height: 20, marginLeft: 2 }} onClick={() => deleteCategory(c.name)} aria-label="Delete">
                    <Icon name="close" size={13} />
                  </button>
                </span>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {confirmClear && (
        <Modal title={`Clear ${monthLabel(month)}?`} onClose={() => setConfirmClear(false)}>
          <p className="soft">This will permanently delete all income and expense entries for <b>{monthLabel(month)} {monthYear(month)}</b>. Your wealth, goals, categories, and settings stay intact.</p>
          <div className="flex gap-12" style={{ justifyContent: "flex-end", marginTop: 6 }}>
            <Btn variant="ghost" onClick={() => setConfirmClear(false)}>Cancel</Btn>
            <Btn variant="danger" icon="trash" onClick={() => { clearMonth(); setConfirmClear(false); }}>Clear month</Btn>
          </div>
        </Modal>
      )}

      {lockModal && (
        <PassphraseModal mode={lockModal}
          onClose={() => setLockModal(null)}
          onSubmit={async (pass) => {
            if (lockModal === "enable") { enableLock(pass); flash("App lock is on — your data is now encrypted on this device."); }
            else if (lockModal === "backup") { await exportEncrypted(pass); flash("Encrypted backup downloaded."); }
            else importEncrypted(pass, (err) => flash(err || "Backup restored."));
            setLockModal(null);
          }} />
      )}
    </div>
  );
}

function PassphraseModal({ mode, onClose, onSubmit }) {
  const titles = { enable: "Set an app lock passphrase", backup: "Encrypt a backup", restore: "Restore encrypted backup" };
  const blurbs = {
    enable: "From now on, your data is stored encrypted and the app asks for this passphrase when it opens.",
    backup: "The downloaded file is unreadable without this passphrase — safe to keep anywhere.",
    restore: "Enter the passphrase the backup was encrypted with, then pick the file.",
  };
  const needConfirm = mode !== "restore";
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const ok = p1.length >= 4 && (!needConfirm || p1 === p2);
  return (
    <Modal title={titles[mode]} onClose={onClose}>
      <p className="soft" style={{ fontSize: 13.5 }}>{blurbs[mode]}</p>
      <Field label="Passphrase"><input className="input" type="password" autoFocus value={p1} onChange={(e) => setP1(e.target.value)} placeholder="At least 4 characters" /></Field>
      {needConfirm && <Field label="Repeat passphrase"><input className="input" type="password" value={p2} onChange={(e) => setP2(e.target.value)} /></Field>}
      {needConfirm && p2 && p1 !== p2 && <p style={{ color: "var(--neg)", fontSize: 13 }}>Passphrases don't match yet.</p>}
      <div className="flex gap-12" style={{ justifyContent: "flex-end", marginTop: 6 }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" icon="lock" disabled={!ok} onClick={() => onSubmit(p1)}>
          {mode === "enable" ? "Turn on app lock" : mode === "backup" ? "Download backup" : "Choose file & restore"}
        </Btn>
      </div>
    </Modal>
  );
}

Object.assign(window, { SettingsTab });
