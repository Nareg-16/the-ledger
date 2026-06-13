/* ============================================================
   onboarding.jsx — first-run 3-step welcome
   pick currencies → add one income → add one saving
   ============================================================ */
function Onboarding() {
  const { cur, cur2, setCurrency, setCurrency2, addIncome, addHolding, setOnboarded, go } = useApp();
  const [step, setStep] = useState(0);

  // step 1 — income
  const [incName, setIncName] = useState("");
  const [incAmt, setIncAmt] = useState("");
  const [incCur, setIncCur] = useState(cur);
  const [incFreq, setIncFreq] = useState("monthly");
  // step 2 — saving
  const [savName, setSavName] = useState("");
  const [savAmt, setSavAmt] = useState("");
  const [savCur, setSavCur] = useState(cur);

  const finish = (dest) => { setOnboarded(true); if (dest) go(dest); };

  const saveIncome = () => {
    const a = parseFloat(incAmt);
    if (incName.trim() && a > 0) addIncome({ name: incName.trim(), amount: round2(a), cur: incCur, freq: incFreq });
  };
  const saveSaving = () => {
    const a = parseFloat(savAmt);
    if (savName.trim() && a > 0) addHolding({ type: "cash", name: savName.trim(), amount: round2(a), cur: savCur });
  };

  const steps = [
    /* ---- 0: currencies ---- */
    <div key="0" className="ob-step">
      <div className="ob-illus"><Icon name="wallet" size={30} /></div>
      <h2 className="serif">Welcome to The Ledger</h2>
      <p className="ob-lede">A calm place to track money across currencies — and gold. First, which two should everything be shown in?</p>
      <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr", textAlign: "left" }}>
        <Field label="I mostly think in"><CurrencySelect value={cur} onChange={setCurrency} /></Field>
        <Field label="…and also want to see"><CurrencySelect value={cur2} onChange={setCurrency2} /></Field>
      </div>
      <p className="ob-hint">Every total shows the first big, the second underneath. You can change these any time in Settings.</p>
      <div className="ob-actions">
        <button className="ob-skip" onClick={() => finish()}>Skip setup</button>
        <Btn variant="primary" onClick={() => { setIncCur(cur); setSavCur(cur); setStep(1); }}>Continue</Btn>
      </div>
    </div>,

    /* ---- 1: income ---- */
    <div key="1" className="ob-step">
      <div className="ob-illus pos"><Icon name="income" size={30} /></div>
      <h2 className="serif">Add what comes in</h2>
      <p className="ob-lede">One source is enough to start — your salary, freelance, anything. Add more later.</p>
      <div className="stack gap-12" style={{ textAlign: "left" }}>
        <Field label="Source name"><input className="input" placeholder="e.g. Salary" value={incName} onChange={(e) => setIncName(e.target.value)} autoFocus /></Field>
        <div className="form-row" style={{ gridTemplateColumns: "1.3fr 1fr" }}>
          <Field label="Amount">
            <div className="money-multi">
              <div className="input-prefix"><span className="sym">{CURRENCIES[incCur].sym}</span>
                <input className="input mono" type="number" min="0" step="any" inputMode="decimal" value={incAmt} onChange={(e) => setIncAmt(e.target.value)} />
              </div>
              <div className="select-wrap money-cur">
                <select className="select" value={incCur} onChange={(e) => setIncCur(e.target.value)}>
                  {Object.keys(CURRENCIES).map((k) => <option key={k} value={k}>{CURRENCIES[k].sym} {k}</option>)}
                </select>
              </div>
            </div>
          </Field>
          <Field label="How often">
            <SelectBox value={incFreq} onChange={setIncFreq}>{Object.entries(FREQS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</SelectBox>
          </Field>
        </div>
      </div>
      <div className="ob-actions">
        <button className="ob-skip" onClick={() => setStep(2)}>Skip this</button>
        <Btn variant="primary" onClick={() => { saveIncome(); setStep(2); }}>Continue</Btn>
      </div>
    </div>,

    /* ---- 2: saving ---- */
    <div key="2" className="ob-step">
      <div className="ob-illus gold"><Icon name="coins" size={30} /></div>
      <h2 className="serif">Add what you’ve saved</h2>
      <p className="ob-lede">A pot of cash in any currency. Gold and more currencies live in the Wealth tab.</p>
      <div className="stack gap-12" style={{ textAlign: "left" }}>
        <Field label="Savings name"><input className="input" placeholder="e.g. Bank account" value={savName} onChange={(e) => setSavName(e.target.value)} autoFocus /></Field>
        <Field label="Amount">
          <div className="money-multi">
            <div className="input-prefix"><span className="sym">{CURRENCIES[savCur].sym}</span>
              <input className="input mono" type="number" min="0" step="any" inputMode="decimal" value={savAmt} onChange={(e) => setSavAmt(e.target.value)} />
            </div>
            <div className="select-wrap money-cur">
              <select className="select" value={savCur} onChange={(e) => setSavCur(e.target.value)}>
                {Object.keys(CURRENCIES).map((k) => <option key={k} value={k}>{CURRENCIES[k].sym} {k}</option>)}
              </select>
            </div>
          </div>
        </Field>
      </div>
      <div className="ob-actions">
        <button className="ob-skip" onClick={() => finish()}>Skip this</button>
        <Btn variant="primary" icon="check" onClick={() => { saveSaving(); finish("overview"); }}>All set</Btn>
      </div>
    </div>,
  ];

  return (
    <div className="ob-scrim">
      <div className="ob-card rise">
        <div className="ob-dots">{steps.map((_, i) => <span key={i} className={i === step ? "on" : i < step ? "done" : ""} />)}</div>
        {steps[step]}
      </div>
    </div>
  );
}

Object.assign(window, { Onboarding });
