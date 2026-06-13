/* ============================================================
   tab-wealth.jsx — savings & assets: cash per currency + gold,
   dual-currency totals, composition donut
   ============================================================ */
function WealthTab() {
  const app = useApp();
  const { cur, cur2, convert, holdings, holdingValue, netWorth, goldPrice, addHolding, editHolding, deleteHolding, go,
          netWorthHistory } = app;

  const [modal, setModal] = useState(null); // {kind:"cash"|"gold", entry?}

  // net-worth trend: history is stored in USD per month → display currency, last 12
  const trend = useMemo(() => {
    return Object.entries(netWorthHistory || {})
      .sort((a, b) => parseMonthKey(a[0]).getTime() - parseMonthKey(b[0]).getTime())
      .slice(-12)
      .map(([mk, usd]) => ({ label: parseMonthKey(mk).toLocaleDateString("en-US", { month: "short" }), value: round2(convert(usd, "USD", cur)) }));
  }, [netWorthHistory, cur, app.rates]);

  const cash = holdings.filter((h) => h.type !== "gold");
  const gold = holdings.filter((h) => h.type === "gold");
  const cashTotal = round2(cash.reduce((s, h) => s + holdingValue(h), 0));
  const goldTotal = round2(gold.reduce((s, h) => s + holdingValue(h), 0));
  const goldGrams = gold.reduce((s, h) => s + (h.grams || 0), 0);

  // breakdown by currency (native sums) — "700k AMD and $1,000, broken down"
  const byCurrency = useMemo(() => {
    const m = {};
    cash.forEach((h) => { m[h.cur] = (m[h.cur] || 0) + (h.amount || 0); });
    return Object.entries(m).map(([code, amount]) => ({ code, amount, value: convert(amount, code, cur) }))
      .sort((a, b) => b.value - a.value);
  }, [holdings, cur, app.rates]);

  const donut = [
    ...byCurrency.map((c, i) => ({ label: c.code, value: round2(c.value), color: SWATCHES[i % SWATCHES.length] })),
    ...(goldTotal > 0 ? [{ label: "Gold", value: goldTotal, color: "#f59e0b" }] : []),
  ].filter((d) => d.value > 0);

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <div className="eyebrow">Wealth · saved across every month</div>
          <h1>What you hold.</h1>
          <p className="lede">Savings in every currency, plus gold — each kept in its own unit and totalled in both of your display currencies.</p>
        </div>
        <div className="right">
          <div className="muted" style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Net worth</div>
          <Dual value={netWorth} size="lg" tone="var(--gold-deep)" className="right" />
        </div>
      </div>

      <div className="grid cols-3" style={{ marginBottom: 18 }}>
        <div className="stat accent is-gold rise">
          <div className="label"><span className="dot" style={{ background: "var(--gold)" }} />Total net worth</div>
          <Dual value={netWorth} size="lg" />
          <div className="meta">{holdings.length} holding{holdings.length === 1 ? "" : "s"}</div>
        </div>
        <div className="stat accent is-pos rise">
          <div className="label"><span className="dot" style={{ background: "var(--pos)" }} />Cash savings</div>
          <Dual value={cashTotal} size="lg" />
          <div className="meta">{byCurrency.length} currenc{byCurrency.length === 1 ? "y" : "ies"}</div>
        </div>
        <div className="stat accent is-gold rise">
          <div className="label"><span className="dot" style={{ background: "#f59e0b" }} />Gold</div>
          <Dual value={goldTotal} size="lg" />
          <div className="meta">{goldGrams ? `${goldGrams.toLocaleString("en-US")} g held · $${goldPrice}/g (24k)` : "none recorded"}</div>
        </div>
      </div>

      {/* net-worth trend */}
      <Card style={{ marginBottom: 18 }}>
        <div className="card-head">
          <div><h3>Net worth over time</h3><span className="sub">one snapshot a month, in {cur}</span></div>
          {trend.length >= 2 && <span className="chip gold"><Icon name="trend" size={14} />{trend.length} months</span>}
        </div>
        {trend.length >= 2
          ? <LineChart points={trend} cur={cur} />
          : <EmptyState icon="trend" title="Your trend is just starting"
              sub="The Ledger records your net worth once a month. Come back next month and the line will begin to grow." />}
      </Card>

      <div className="grid split">
        <div className="stack" style={{ gap: 18 }}>
          {/* cash holdings */}
          <Card className="flush">
            <div className="between" style={{ padding: "18px 22px 8px" }}>
              <div><h3>Cash savings</h3><span className="sub muted">each kept in its own currency</span></div>
              <Btn size="sm" variant="primary" icon="plus" onClick={() => setModal({ kind: "cash" })}>Add savings</Btn>
            </div>
            {cash.length ? (
              <table className="tbl">
                <thead><tr><th>Name</th><th>Currency</th><th className="right">Amount</th><th className="right">In {cur}</th><th></th></tr></thead>
                <tbody>
                  {cash.map((h) => (
                    <tr key={h.id}>
                      <td style={{ fontWeight: 600 }}>{h.name}</td>
                      <td><span className="chip gold mono">{CURRENCIES[h.cur]?.sym} {h.cur}</span></td>
                      <td className="amt">{fmt(h.amount, h.cur)}</td>
                      <td className="num soft">{fmt(holdingValue(h), cur)}</td>
                      <td><div className="row-actions">
                        <button className="mini-btn edit" onClick={() => setModal({ kind: "cash", entry: h })} aria-label="Edit"><Icon name="edit" size={15} /></button>
                        <button className="mini-btn" onClick={() => deleteHolding(h.id)} aria-label="Delete"><Icon name="trash" size={16} /></button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr>
                  <td colSpan="3" style={{ fontWeight: 700, paddingTop: 14 }}>Total cash</td>
                  <td className="num" style={{ paddingTop: 14 }}><Dual value={cashTotal} size="sm" className="right" /></td><td></td>
                </tr></tfoot>
              </table>
            ) : <EmptyState icon="wallet" title="No savings recorded"
                  sub="Add each pot of money you hold — ֏700,000 under the mattress, $1,000 in the bank — in its own currency."
                  action={<Btn variant="primary" size="sm" icon="plus" onClick={() => setModal({ kind: "cash" })}>Add savings</Btn>} />}
          </Card>

          {/* gold holdings */}
          <Card className="flush">
            <div className="between" style={{ padding: "18px 22px 8px" }}>
              <div><h3>Gold</h3><span className="sub muted">priced manually at ${goldPrice}/g for 24k — change it in Settings</span></div>
              <Btn size="sm" variant="primary" icon="plus" onClick={() => setModal({ kind: "gold" })}>Add gold</Btn>
            </div>
            {gold.length ? (
              <table className="tbl">
                <thead><tr><th>Item</th><th>Karat</th><th className="right">Weight</th><th className="right">In {cur}</th><th></th></tr></thead>
                <tbody>
                  {gold.map((h) => (
                    <tr key={h.id}>
                      <td style={{ fontWeight: 600 }}>{h.name}</td>
                      <td><span className="chip gold mono">{h.karat}k</span></td>
                      <td className="amt">{h.grams} g</td>
                      <td className="num soft">{fmt(holdingValue(h), cur)}</td>
                      <td><div className="row-actions">
                        <button className="mini-btn edit" onClick={() => setModal({ kind: "gold", entry: h })} aria-label="Edit"><Icon name="edit" size={15} /></button>
                        <button className="mini-btn" onClick={() => deleteHolding(h.id)} aria-label="Delete"><Icon name="trash" size={16} /></button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr>
                  <td colSpan="3" style={{ fontWeight: 700, paddingTop: 14 }}>Total gold</td>
                  <td className="num" style={{ paddingTop: 14 }}><Dual value={goldTotal} size="sm" className="right" /></td><td></td>
                </tr></tfoot>
              </table>
            ) : <EmptyState icon="gold" title="No gold recorded"
                  sub="Track coins, bars, or jewellery by weight and karat. Value follows the gold price you set."
                  action={<Btn variant="primary" size="sm" icon="plus" onClick={() => setModal({ kind: "gold" })}>Add gold</Btn>} />}
          </Card>
        </div>

        {/* composition + per-currency breakdown */}
        <div className="stack" style={{ gap: 18 }}>
          <Card>
            <div className="card-head"><h3>Composition</h3><span className="sub">where your wealth sits</span></div>
            {donut.length ? (
              <>
                <DonutChart data={donut} total={fmt(netWorth, cur, { compact: true })} totalLabel="net worth" />
                <div style={{ marginTop: 12 }}><Legend items={donut} cur={cur} /></div>
              </>
            ) : <EmptyState icon="pie" title="Nothing yet" sub="Add savings or gold to see the breakdown." />}
          </Card>

          {byCurrency.length > 0 && (
            <Card>
              <div className="card-head"><h3>By currency</h3><span className="sub">native amounts</span></div>
              <div className="stack" style={{ gap: 12 }}>
                {byCurrency.map((c) => (
                  <div className="between" key={c.code} style={{ background: "var(--inset)", padding: "10px 14px", borderRadius: 12 }}>
                    <span style={{ fontWeight: 700 }}><span className="mono" style={{ color: "var(--gold-deep)" }}>{CURRENCIES[c.code]?.sym}</span> {c.code}</span>
                    <span className="right">
                      <span className="mono" style={{ fontWeight: 600 }}>{fmt(c.amount, c.code)}</span>
                      {c.code !== cur && <span className="mono soft" style={{ display: "block", fontSize: 12 }}>≈ {fmt(c.value, cur)}</span>}
                    </span>
                  </div>
                ))}
              </div>
              <Tip>Rates are manual — update them in <a href="#" onClick={(e) => { e.preventDefault(); go("settings"); }}>Settings</a> and every total re-prices instantly. Your native amounts never change.</Tip>
            </Card>
          )}
        </div>
      </div>

      {modal && <HoldingModal kind={modal.kind} entry={modal.entry}
        onClose={() => setModal(null)}
        onSave={(h) => { modal.entry ? editHolding(modal.entry.id, h) : addHolding(h); setModal(null); }} />}
    </div>
  );
}

function HoldingModal({ kind, entry, onClose, onSave }) {
  const { cur, convert, goldPrice } = useApp();
  const isGold = kind === "gold";
  const [name, setName] = useState(entry?.name || "");
  const [amount, setAmount] = useState(entry ? String(isGold ? entry.grams : entry.amount) : "");
  const [hcur, setHcur] = useState(entry?.cur || cur);
  const [karat, setKarat] = useState(entry?.karat || 24);
  const num = parseFloat(amount);
  const valid = name.trim() && num > 0;

  const goldPreview = isGold && num > 0
    ? convert(goldValueUSD(num, karat, goldPrice), "USD", cur) : 0;

  const save = () => valid && onSave(isGold
    ? { type: "gold", name: name.trim(), grams: num, karat: Number(karat) }
    : { type: "cash", name: name.trim(), amount: num, cur: hcur });

  return (
    <Modal title={entry ? `Edit ${isGold ? "gold" : "savings"}` : isGold ? "Add gold" : "Add savings"} onClose={onClose}>
      <Field label={isGold ? "Item name" : "Savings name"}>
        <input className="input" autoFocus placeholder={isGold ? "e.g. Gold bar, Wedding ring" : "e.g. AMD cash, USD bank account"}
          value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      {isGold ? (
        <>
          <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <Field label="Weight (grams)">
              <div className="input-prefix"><span className="sym">g</span>
                <input className="input mono" type="number" min="0" step="any" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
            </Field>
            <Field label="Karat">
              <SelectBox value={String(karat)} onChange={setKarat}>
                {Object.keys(KARATS).sort((a, b) => b - a).map((k) => <option key={k} value={k}>{k}k {k === "24" ? "(pure)" : ""}</option>)}
              </SelectBox>
            </Field>
          </div>
          {num > 0 && <Tip>At <b>${goldPrice}/g</b> (24k), this is worth about <b>{fmt(goldPreview, cur)}</b> today. The value follows the price you keep in Settings.</Tip>}
        </>
      ) : (
        <div className="form-row" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
          <Field label="Amount">
            <div className="input-prefix"><span className="sym">{CURRENCIES[hcur].sym}</span>
              <input className="input mono" type="number" min="0" step="any" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          </Field>
          <Field label="Currency"><CurrencySelect value={hcur} onChange={setHcur} /></Field>
        </div>
      )}
      {!isGold && hcur !== cur && num > 0 && (
        <Tip>Stored as <b>{fmt(num, hcur)}</b> — it stays in {hcur} forever and is only <i>shown</i> converted ({fmt(convert(num, hcur, cur), cur)} at today's rate).</Tip>
      )}
      <div className="flex gap-12" style={{ justifyContent: "flex-end", marginTop: 6 }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" disabled={!valid} onClick={save}>{entry ? "Save changes" : "Add"}</Btn>
      </div>
    </Modal>
  );
}

Object.assign(window, { WealthTab });
