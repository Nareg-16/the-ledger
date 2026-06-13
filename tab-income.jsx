/* ============================================================
   tab-income.jsx — income sources + live allocation panel
   ============================================================ */
function IncomeTab() {
  const app = useApp();
  const { cur, inCur, monthData, totalIncome, allocations, addIncome, editIncome, deleteIncome,
          setAllocations, applyFiftyThirtyTwenty } = app;

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [freq, setFreq] = useState("monthly");
  const [entryCur, setEntryCur] = useState(cur);
  const [editing, setEditing] = useState(null);

  const submit = (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!name.trim() || !(amt > 0)) return;
    addIncome({ name: name.trim(), amount: round2(amt), cur: entryCur, freq });
    setName(""); setAmount(""); setFreq("monthly");
  };

  const monthlyOf = (e) => inCur(e.amount, e.cur) * FREQS[e.freq].factor;
  const allocSum = allocations.reduce((s, a) => s + a.pct, 0);
  const allocOk = Math.round(allocSum) === 100;

  const setBucket = (id, patch) => setAllocations(allocations.map((a) => a.id === id ? { ...a, ...patch } : a));
  const cycleColor = (id) => {
    const a = allocations.find((x) => x.id === id);
    const i = SWATCHES.indexOf(a.color);
    setBucket(id, { color: SWATCHES[(i + 1) % SWATCHES.length] });
  };
  const addBucket = () => setAllocations([...allocations, { id: uid(), name: "New bucket", pct: 0, color: SWATCHES[allocations.length % SWATCHES.length] }]);
  const delBucket = (id) => setAllocations(allocations.filter((a) => a.id !== id));

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <div className="eyebrow">{monthLabel(app.month)} {monthYear(app.month)} · Income</div>
          <h1>What comes in.</h1>
          <p className="lede">Add every source. We convert each one to its monthly equivalent so the whole picture lines up.</p>
        </div>
        <div className="right">
          <div className="muted" style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Monthly income</div>
          <Dual value={totalIncome} size="lg" tone="var(--pos)" className="right" />
        </div>
      </div>

      <div className="grid split">
        {/* left: add + table */}
        <div className="stack" style={{ gap: 18 }}>
          <Card>
            <div className="card-head"><h3>Add a source</h3></div>
            <form onSubmit={submit} className="stack gap-12">
              <Field label="Source name"><input className="input" placeholder="e.g. Salary, Freelance, Dividends" value={name} onChange={(e) => setName(e.target.value)} /></Field>
              <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr" }}>
                <Field label="Amount"><MoneyInputMulti value={amount} onChange={setAmount} entryCur={entryCur} onEntryCur={setEntryCur} /></Field>
                <Field label="Frequency">
                  <SelectBox value={freq} onChange={setFreq}>
                    {Object.entries(FREQS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </SelectBox>
                </Field>
              </div>
              <Btn variant="primary" icon="plus" type="submit" className="block">Add income source</Btn>
            </form>
          </Card>

          <Card className="flush">
            <div className="between" style={{ padding: "18px 22px 6px" }}>
              <h3>Sources</h3>
              <span className="sub muted">{monthData.income.length} total</span>
            </div>
            {monthData.income.length ? (
              <div className="table-wrap">
              <table className="tbl">
                <thead><tr><th>Source</th><th>Frequency</th><th className="right">Amount</th><th className="right">Monthly</th><th></th></tr></thead>
                <tbody>
                  {monthData.income.map((e) => (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 600 }}>{e.name}</td>
                      <td><span className="chip gold">{FREQS[e.freq].label}</span></td>
                      <td className="num soft"><NativeAmt amount={e.amount} cur={e.cur} /></td>
                      <td className="amt" style={{ color: "var(--pos)" }}>{fmt(monthlyOf(e), cur)}</td>
                      <td><div className="row-actions">
                        <button className="mini-btn edit" onClick={() => setEditing(e)} aria-label="Edit"><Icon name="edit" size={15} /></button>
                        <button className="mini-btn" onClick={() => deleteIncome(e.id)} aria-label="Delete"><Icon name="trash" size={16} /></button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><td colSpan="3" style={{ fontWeight: 700, paddingTop: 14 }}>Total monthly</td>
                  <td className="num" style={{ paddingTop: 14 }}><Dual value={totalIncome} size="sm" tone="var(--pos)" className="right" /></td><td></td></tr></tfoot>
              </table>
              </div>
            ) : <EmptyState icon="income" title="No income yet" sub="Add your salary or any other source above to get started." />}
          </Card>
        </div>

        {/* right: allocation panel */}
        <Card>
          <div className="card-head">
            <div><h3>Allocation</h3><span className="sub">split your income into buckets</span></div>
            <Btn size="sm" variant="ghost" onClick={applyFiftyThirtyTwenty}>Apply 50/30/20</Btn>
          </div>

          <Tip><b>Tip:</b> tap a color square to recolor a bucket. Your percentages should add up to <b>100%</b> so every part of your income has a home.</Tip>

          {/* stacked preview */}
          <div className="stacked-bar mt-16">
            {allocations.map((a) => <span key={a.id} style={{ width: `${clamp(a.pct, 0, 100)}%`, background: a.color }} title={`${a.name} ${a.pct}%`} />)}
            {allocSum < 100 && <span style={{ width: `${100 - clamp(allocSum, 0, 100)}%`, background: "var(--inset)" }} />}
          </div>

          <div style={{ marginTop: 8 }}>
            {allocations.map((a) => (
              <div className="alloc-row" key={a.id}>
                <button className="swatch-btn" style={{ background: a.color }} onClick={() => cycleColor(a.id)} title="Click to recolor" />
                <div className="stack" style={{ gap: 6 }}>
                  <input className="alloc-name" value={a.name} onChange={(e) => setBucket(a.id, { name: e.target.value })} />
                  <input className="range" type="range" min="0" max="100" value={a.pct}
                    style={{ accentColor: a.color }} onChange={(e) => setBucket(a.id, { pct: parseInt(e.target.value, 10) })} />
                </div>
                <span className="alloc-pct">{a.pct}%</span>
                <div className="stack" style={{ alignItems: "flex-end", gap: 2 }}>
                  <span className="mono" style={{ fontSize: 12, color: "var(--ink-faint)" }}>{fmt(totalIncome * a.pct / 100, cur, { dec: 0 })}</span>
                  <button className="mini-btn" onClick={() => delBucket(a.id)} aria-label="Remove bucket"><Icon name="trash" size={14} /></button>
                </div>
              </div>
            ))}
          </div>

          <button className="btn ghost sm" style={{ marginTop: 10 }} onClick={addBucket}><Icon name="plus" size={15} />Add bucket</button>

          <div className={`alloc-total ${allocOk ? "ok" : "off"}`}>
            <div>
              <div style={{ fontWeight: 700 }}>Allocated</div>
              <div className="muted" style={{ fontSize: 12.5 }}>{allocOk ? "Perfectly balanced." : allocSum > 100 ? `${Math.round(allocSum - 100)}% over — trim a bucket.` : `${Math.round(100 - allocSum)}% still unassigned.`}</div>
            </div>
            <div className="n">{Math.round(allocSum)}%</div>
          </div>
        </Card>
      </div>

      {editing && <EditIncomeModal entry={editing} onClose={() => setEditing(null)}
        onSave={(patch) => { editIncome(editing.id, patch); setEditing(null); }} />}
    </div>
  );
}

function EditIncomeModal({ entry, onClose, onSave }) {
  const { cur } = useApp();
  const [name, setName] = useState(entry.name);
  const [amount, setAmount] = useState(String(entry.amount));
  const [freq, setFreq] = useState(entry.freq);
  const [entryCur, setEntryCur] = useState(entry.cur || cur);
  const amt = parseFloat(amount);
  const valid = name.trim() && amt > 0;
  const save = () => valid && onSave({ name: name.trim(), amount: round2(amt), cur: entryCur, freq });
  return (
    <Modal title="Edit income source" onClose={onClose}>
      <Field label="Source name"><input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Field label="Amount"><MoneyInputMulti value={amount} onChange={setAmount} entryCur={entryCur} onEntryCur={setEntryCur} /></Field>
        <Field label="Frequency">
          <SelectBox value={freq} onChange={setFreq}>
            {Object.entries(FREQS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </SelectBox>
        </Field>
      </div>
      <div className="flex gap-12" style={{ justifyContent: "flex-end", marginTop: 6 }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" disabled={!valid} onClick={save}>Save changes</Btn>
      </div>
    </Modal>
  );
}

Object.assign(window, { IncomeTab });
