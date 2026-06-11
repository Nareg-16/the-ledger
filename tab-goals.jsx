/* ============================================================
   tab-goals.jsx — financial goals + contribution logger
   ============================================================ */
function GoalsTab() {
  const app = useApp();
  const { cur, goals, addGoal, updateGoal, deleteGoal, contributeGoal } = app;

  const [open, setOpen] = useState(false);
  const [contribFor, setContribFor] = useState(null);

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <div className="eyebrow">Goals · saved across every month</div>
          <h1>What you’re working toward.</h1>
          <p className="lede">Name a target, set what you’ve saved, and watch the distance close. Goals carry across all months.</p>
        </div>
        <Btn variant="primary" icon="plus" onClick={() => setOpen(true)}>New goal</Btn>
      </div>

      {goals.length ? (
        <div className="grid cols-3">
          {goals.map((g) => <GoalCard key={g.id} g={g} cur={cur} onContribute={() => setContribFor(g)} onDelete={() => deleteGoal(g.id)} />)}
        </div>
      ) : (
        <Card><EmptyState icon="target" title="No goals yet"
          sub="An emergency fund, a trip, a new laptop — give your savings a destination."
          action={<Btn variant="primary" icon="plus" onClick={() => setOpen(true)}>Create your first goal</Btn>} /></Card>
      )}

      {open && <GoalModal onClose={() => setOpen(false)} onSave={(g) => { addGoal(g); setOpen(false); }} />}
      {contribFor && <ContribModal goal={contribFor} cur={cur} onClose={() => setContribFor(null)}
        onSave={(amt) => { contributeGoal(contribFor.id, amt); setContribFor(null); }} />}
    </div>
  );
}

function GoalCard({ g, cur: mainCur, onContribute, onDelete }) {
  const cur = g.cur || mainCur;       // each goal lives in its own currency
  const p = g.target ? clamp((g.saved / g.target) * 100, 0, 100) : 0;
  const remaining = Math.max(0, g.target - g.saved);
  const months = g.monthly > 0 ? Math.ceil(remaining / g.monthly) : null;
  const done = remaining <= 0;
  return (
    <div className="goal-card rise">
      <div className="gc-top" style={{ background: g.color }} />
      <div className="gc-body">
        <div className="between">
          <div className="goal-name"><span className="gdot" style={{ background: g.color }} />{g.name}</div>
          <button className="mini-btn" onClick={onDelete} aria-label="Delete goal"><Icon name="trash" size={15} /></button>
        </div>

        <div className="between" style={{ alignItems: "flex-end", margin: "16px 0 7px" }}>
          <span className="mono" style={{ fontSize: 26, fontWeight: 600, color: g.color }}>{pct(p)}</span>
          {done ? <span className="chip pos"><Icon name="check" size={13} /> Reached</span>
                : <span className="muted mono" style={{ fontSize: 12.5 }}>{fmt(remaining, cur)} to go</span>}
        </div>
        <ProgressBar value={p} color={g.color} tall />
        <div className="between mono" style={{ fontSize: 12.5, color: "var(--ink-faint)", marginTop: 6 }}>
          <span>{fmt(g.saved, cur)}</span><span>{fmt(g.target, cur)}</span>
        </div>

        <div className="goal-meta">
          <div><div className="k">Monthly</div><div className="v">{fmt(g.monthly, cur)}</div></div>
          <div className="right"><div className="k">{done ? "Status" : "Est. finish"}</div>
            <div className="v">{done ? "Done" : months != null ? `${months} mo` : "—"}</div></div>
          {g.deadline && <div className="right"><div className="k">Deadline</div>
            <div className="v" style={{ fontSize: 13 }}>{new Date(g.deadline + "T00:00").toLocaleDateString("en-US", { month: "short", year: "2-digit" })}</div></div>}
        </div>

        <Btn variant="ghost" size="sm" icon="plus" className="block" style={{ marginTop: 6 }} onClick={onContribute}>Log contribution</Btn>
      </div>
    </div>
  );
}

function GoalModal({ onClose, onSave }) {
  const { cur } = useApp();
  const [f, setF] = useState({ name: "", target: "", saved: "", monthly: "", deadline: "", color: SWATCHES[3] });
  const [entryCur, setEntryCur] = useState(cur);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const valid = f.name.trim() && parseFloat(f.target) > 0;
  const cv = (x) => round2(parseFloat(x) || 0);
  const save = () => valid && onSave({
    name: f.name.trim(), target: cv(f.target), saved: cv(f.saved),
    monthly: cv(f.monthly), deadline: f.deadline, color: f.color, cur: entryCur,
  });
  return (
    <Modal title="New goal" onClose={onClose}>
      <Field label="Goal name"><input className="input" autoFocus placeholder="e.g. Emergency fund" value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>
      <Field label="Goal currency">
        <SelectBox value={entryCur} onChange={setEntryCur}>
          {Object.keys(CURRENCIES).map((k) => <option key={k} value={k}>{CURRENCIES[k].sym} {k} — {CURRENCIES[k].name}{k === cur ? " (your main)" : ""}</option>)}
        </SelectBox>
      </Field>
      {entryCur !== cur && <Tip>This goal is kept in <b>{entryCur}</b> — its amounts never get converted away. Contributions in other currencies are translated into {entryCur} at your saved rate.</Tip>}
      <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Field label="Target amount"><MoneyInputMulti value={f.target} onChange={(v) => set("target", v)} entryCur={entryCur} onEntryCur={setEntryCur} /></Field>
        <Field label="Saved so far"><MoneyInputMulti value={f.saved} onChange={(v) => set("saved", v)} entryCur={entryCur} onEntryCur={setEntryCur} /></Field>
      </div>
      <div className="form-row" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Field label="Monthly contribution"><MoneyInputMulti value={f.monthly} onChange={(v) => set("monthly", v)} entryCur={entryCur} onEntryCur={setEntryCur} /></Field>
        <Field label="Deadline (optional)"><input className="input" type="date" value={f.deadline} onChange={(e) => set("deadline", e.target.value)} /></Field>
      </div>
      <Field label="Color"><SwatchPicker value={f.color} onChange={(c) => set("color", c)} /></Field>
      <div className="flex gap-12" style={{ justifyContent: "flex-end", marginTop: 6 }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" disabled={!valid} onClick={save}>Create goal</Btn>
      </div>
    </Modal>
  );
}

function ContribModal({ goal, cur: mainCur, onClose, onSave }) {
  const { convert } = useApp();
  const gcur = goal.cur || mainCur;     // the goal's own currency
  const [amt, setAmt] = useState(goal.monthly ? String(goal.monthly) : "");
  const [entryCur, setEntryCur] = useState(gcur);
  const v = parseFloat(amt);
  const converted = v > 0 ? round2(convert(v, entryCur, gcur)) : 0;
  const newTotal = goal.saved + converted;
  return (
    <Modal title={`Add to “${goal.name}”`} onClose={onClose}>
      <div className="between" style={{ background: "var(--inset)", padding: "12px 16px", borderRadius: 12 }}>
        <span className="soft">Currently saved</span>
        <span className="mono" style={{ fontWeight: 600 }}>{fmt(goal.saved, gcur)} / {fmt(goal.target, gcur)}</span>
      </div>
      <Field label="Contribution amount"><MoneyInputMulti value={amt} onChange={setAmt} entryCur={entryCur} onEntryCur={setEntryCur} autoFocus /></Field>
      {v > 0 && <Tip>{entryCur !== gcur && <>That’s <b>{fmt(converted, gcur)}</b> toward this goal. </>}New total will be <b>{fmt(newTotal, gcur)}</b> — {pct(clamp(newTotal / goal.target * 100, 0, 100))} of your target.</Tip>}
      <div className="flex gap-12" style={{ justifyContent: "flex-end", marginTop: 6 }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" disabled={!(v > 0)} onClick={() => onSave(converted)}>Add contribution</Btn>
      </div>
    </Modal>
  );
}

Object.assign(window, { GoalsTab });
