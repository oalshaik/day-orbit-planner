"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Task = { id: number; title: string; description: string; icon: string; start: number; end: number; color: string };

const COLORS = ["#6C63FF", "#FF7657", "#16B8A6", "#F4B83E", "#EB5E8B", "#3994E8", "#8FCB4A"];
const ICONS = ["☕", "💻", "🥗", "🏃", "📚", "🧘", "🎧", "🛌", "🎨", "📞", "✈️", "🍳"];
const DEFAULTS: Task[] = [
  { id: 1, title: "Deep work", description: "Focus block — no notifications", icon: "💻", start: 8, end: 11.5, color: "#6C63FF" },
  { id: 2, title: "Lunch & reset", description: "Step away and recharge", icon: "🥗", start: 12, end: 13.5, color: "#16B8A6" },
  { id: 3, title: "Move", description: "Run around the neighborhood", icon: "🏃", start: 17.5, end: 19, color: "#FF7657" },
  { id: 4, title: "Read", description: "A quiet end to the day", icon: "📚", start: 21, end: 22.5, color: "#3994E8" },
];

const pad = (n: number) => String(Math.floor(n)).padStart(2, "0");
const time = (n: number) => `${pad(n % 24)}:${n % 1 ? "30" : "00"}`;
const angle = (hour: number) => (hour / 24) * 360 - 90;
const point = (hour: number, radius: number) => {
  const a = (angle(hour) * Math.PI) / 180;
  return { x: 200 + Math.cos(a) * radius, y: 200 + Math.sin(a) * radius };
};
const arc = (start: number, end: number, radius = 145) => {
  const a = point(start, radius), b = point(end, radius);
  return `M ${a.x} ${a.y} A ${radius} ${radius} 0 ${end - start > 12 ? 1 : 0} 1 ${b.x} ${b.y}`;
};

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>(DEFAULTS);
  const [selected, setSelected] = useState<number>(1);
  const [open, setOpen] = useState(false);
  const [drag, setDrag] = useState<{ id: number; edge: "start" | "end" } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const active = tasks.find(t => t.id === selected);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { const saved = localStorage.getItem("day-orbit-tasks"); if (saved) setTasks(JSON.parse(saved)); }, []);
  useEffect(() => { localStorage.setItem("day-orbit-tasks", JSON.stringify(tasks)); }, [tasks]);

  const total = useMemo(() => tasks.reduce((n, t) => n + t.end - t.start, 0), [tasks]);
  const updateFromPointer = (clientX: number, clientY: number) => {
    if (!drag || !svgRef.current) return;
    const r = svgRef.current.getBoundingClientRect();
    const x = ((clientX - r.left) / r.width) * 400 - 200;
    const y = ((clientY - r.top) / r.height) * 400 - 200;
    let h = (((Math.atan2(y, x) * 180) / Math.PI + 90 + 360) % 360) / 15;
    h = Math.round(h * 2) / 2;
    setTasks(ts => ts.map(t => t.id !== drag.id ? t : drag.edge === "start"
      ? { ...t, start: Math.min(h, t.end - .5) }
      : { ...t, end: Math.max(h, t.start + .5) }));
  };
  const saveTask = (data: FormData) => {
    const start = Number(data.get("start")), end = Number(data.get("end"));
    const task: Task = { id: Date.now(), title: String(data.get("title")), description: String(data.get("description")), icon: String(data.get("icon")), color: String(data.get("color")), start, end: Math.max(end, start + .5) };
    setTasks(t => [...t, task]); setSelected(task.id); setOpen(false);
  };

  return (
    <main className="app-shell" onPointerMove={e => updateFromPointer(e.clientX, e.clientY)} onPointerUp={() => setDrag(null)}>
      <header>
        <div className="brand"><span className="brand-mark">◎</span><span>Day Orbit</span></div>
        <div className="today"><span>Today</span><strong>MON, JUL 13</strong></div>
        <button className="avatar" aria-label="Profile">AM</button>
      </header>

      <section className="workspace">
        <aside className="intro">
          <p className="eyebrow">YOUR DAY, AT A GLANCE</p>
          <h1>Make time<br/>feel <em>visible.</em></h1>
          <p className="lead">Shape your day around what matters. Add an activity, then drag its edges around the clock.</p>
          <button className="primary" onClick={() => setOpen(true)}><span>＋</span> Add to my day</button>
          <div className="stats"><div><strong>{tasks.length}</strong><span>ACTIVITIES</span></div><div><strong>{total.toFixed(1)}h</strong><span>PLANNED</span></div></div>
        </aside>

        <div className="clock-wrap">
          <div className="clock-halo" />
          <svg ref={svgRef} className="clock" viewBox="0 0 400 400" aria-label="24 hour circular planner">
            <circle cx="200" cy="200" r="145" className="track" />
            {Array.from({ length: 24 }).map((_, i) => {
              const p1 = point(i, i % 3 === 0 ? 121 : 125), p2 = point(i, 130), label = point(i, 174);
              return <g key={i}><line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} className="tick" />{i % 3 === 0 && <text x={label.x} y={label.y} className="hour">{pad(i)}</text>}</g>;
            })}
            {tasks.map(t => {
              const mid = point((t.start + t.end) / 2, 145), s = point(t.start, 145), e = point(t.end, 145), on = t.id === selected;
              return <g key={t.id} onClick={() => setSelected(t.id)} className="task-arc">
                <path d={arc(t.start, t.end)} stroke={t.color} className={on ? "arc selected" : "arc"} />
                <text x={mid.x} y={mid.y} className="arc-icon">{t.icon}</text>
                {on && <><circle cx={s.x} cy={s.y} r="8" fill="white" stroke={t.color} strokeWidth="4" className="handle" onPointerDown={ev => { ev.currentTarget.setPointerCapture(ev.pointerId); setDrag({ id: t.id, edge: "start" }); }} /><circle cx={e.x} cy={e.y} r="8" fill="white" stroke={t.color} strokeWidth="4" className="handle" onPointerDown={ev => { ev.currentTarget.setPointerCapture(ev.pointerId); setDrag({ id: t.id, edge: "end" }); }} /></>}
              </g>;
            })}
            <circle cx="200" cy="200" r="103" className="center" />
            <text x="200" y="174" className="sun">☀</text><text x="200" y="201" className="center-time">{active ? time(active.start) : "Ready"}</text><text x="200" y="223" className="center-label">{active?.title ?? "Plan your day"}</text>
          </svg>
          <p className="drag-hint"><span>↔</span> Drag the dots to stretch an activity</p>
        </div>

        <aside className="agenda">
          <div className="agenda-head"><div><p className="eyebrow">TODAY&apos;S FLOW</p><h2>On your orbit</h2></div><button onClick={() => setOpen(true)} aria-label="Add activity">＋</button></div>
          <div className="task-list">{[...tasks].sort((a,b) => a.start-b.start).map(t => <button key={t.id} className={`task-card ${selected === t.id ? "active" : ""}`} style={{"--task": t.color} as React.CSSProperties} onClick={() => setSelected(t.id)}><span className="task-icon">{t.icon}</span><span className="task-copy"><strong>{t.title}</strong><small>{t.description}</small></span><span className="task-time">{time(t.start)}<small>{(t.end-t.start).toFixed(1)}h</small></span></button>)}</div>
          {active && <button className="delete" onClick={() => { setTasks(t => t.filter(x => x.id !== active.id)); setSelected(0); }}>Remove selected activity</button>}
        </aside>
      </section>

      {open && <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && setOpen(false)}><form className="modal" action={saveTask}><button type="button" className="close" onClick={() => setOpen(false)}>×</button><p className="eyebrow">NEW ACTIVITY</p><h2>Add to your orbit</h2><label>What are you doing?<input name="title" placeholder="Morning walk" required autoFocus /></label><label>Description<textarea name="description" placeholder="A little detail to remember…" rows={2} /></label><div className="form-row"><label>Starts<select name="start" defaultValue="14">{Array.from({length:48}).map((_,i)=><option value={i/2} key={i}>{time(i/2)}</option>)}</select></label><label>Ends<select name="end" defaultValue="15">{Array.from({length:48}).map((_,i)=><option value={i/2} key={i}>{time(i/2)}</option>)}</select></label></div><fieldset><legend>Choose an icon</legend><div className="icon-grid">{ICONS.map((x,i)=><label key={x}><input type="radio" name="icon" value={x} defaultChecked={i===0}/><span>{x}</span></label>)}</div></fieldset><fieldset><legend>Color</legend><div className="color-grid">{COLORS.map((x,i)=><label key={x}><input type="radio" name="color" value={x} defaultChecked={i===0}/><span style={{background:x}} /></label>)}</div></fieldset><button className="primary save" type="submit">Place on my day <span>→</span></button></form></div>}
    </main>
  );
}
