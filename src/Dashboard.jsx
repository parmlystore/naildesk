import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient.js';

const NAV = [
{ key: 'overview', label: 'Dashboard' },
{ key: 'bookings', label: 'Bookings' },
{ key: 'clients', label: 'Clients' },
{ key: 'finance', label: 'Income & Expenses' },
{ key: 'pricelist', label: 'Price list' },
{ key: 'todo', label: 'To-do' },
{ key: 'stock', label: 'Stock' },
];

const PLANS = [
{ key: 'basic', label: 'Basic', price: '$399', blurb: 'Full studio management app. Clients, finances, price list. Manual calendar entry.' },
{ key: 'pro', label: 'Pro', price: '$799', blurb: 'Everything in Basic, plus 24/7 online booking, email confirmations and deposit handling.' },
];

export default function Dashboard({ session }) {
const [page, setPage] = useState('overview');
const [studio, setStudio] = useState(null);
const [loadingStudio, setLoadingStudio] = useState(true);

useEffect(() => {
(async () => {
const { data } = await supabase.from('studios').select('*').eq('owner_email', session.user.email).maybeSingle();
setStudio(data);
setLoadingStudio(false);
})();
}, [session]);

useEffect(() => {
if (studio) document.title = studio.name + ' · Dashboard';
}, [studio]);

if (loadingStudio) return <div className="main">Loading…</div>;

if (!studio) {
return <Onboarding session={session} onCreated={setStudio} />;
}

if (!studio.unlocked) {
const checkoutStatus = new URLSearchParams(window.location.search).get('checkout');
return <Locked studio={studio} onUpdate={setStudio} checkoutStatus={checkoutStatus} />;
}

return (
<div className="app">
<nav className="sidebar">
<div className="brand">{studio.name}<span style={{color:'var(--pink-dark)'}}>.</span></div>
<span className="brand-sub">Powered by NailDesk</span>
{NAV.map(item => (
<div key={item.key} className={'nav-item' + (page === item.key ? ' active' : '')} onClick={() => setPage(item.key)}>
<span className="nav-dot"></span>{item.label}
</div>
))}
<div className="nav-item logout-item" onClick={() => supabase.auth.signOut()}>
<span className="nav-dot"></span>Sign out
</div>
</nav>
<div className="main">
{page === 'overview' && <Overview studio={studio} />}
{page === 'bookings' && <Bookings studio={studio} />}
{page === 'clients' && <Clients studio={studio} />}
{page === 'finance' && <Finance studio={studio} />}
{page === 'pricelist' && <PriceList studio={studio} />}
{page === 'todo' && <Todo studio={studio} />}
{page === 'stock' && <Stock studio={studio} />}
</div>
</div>
);
}

function Onboarding({ session, onCreated }) {
const [name, setName] = useState('');
const [slug, setSlug] = useState('');
const [error, setError] = useState('');
const [saving, setSaving] = useState(false);

async function create(e) {
e.preventDefault();
setSaving(true);
setError('');
const { data, error } = await supabase.from('studios').insert({
name,
owner_email: session.user.email,
booking_slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
}).select().single();
if (error) {
setError(error.message.includes('duplicate') ? 'That booking link is already taken — try another.' : error.message);
setSaving(false);
return;
}
await supabase.from('booking_settings').insert({ studio_id: data.id });
onCreated(data);
setSaving(false);
}

return (
<div className="login-shell">
<div className="login-card">
<div className="login-brand">Set up your studio</div>
<p className="sub center" style={{margin:'0 0 24px'}}>Just the basics — you can change everything later.</p>
<form onSubmit={create}>
<div className="field"><label>Studio name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Bloom Nails" required /></div>
<div className="field"><label>Booking link</label><input value={slug} onChange={e => setSlug(e.target.value)} placeholder="e.g. bloom-nails" required /></div>
{error && <div className="error-msg">{error}</div>}
<button className="btn btn-solid" type="submit" style={{width:'100%', justifyContent:'center'}} disabled={saving}>{saving ? 'Creating…' : 'Create studio'}</button>
</form>
</div>
</div>
);
}

function Locked({ studio, onUpdate, checkoutStatus }) {
const [selectedTier, setSelectedTier] = useState(studio.tier || 'pro');
const [redirecting, setRedirecting] = useState(false);
const [error, setError] = useState('');
const [confirming, setConfirming] = useState(checkoutStatus === 'success');

useEffect(() => {
if (checkoutStatus !== 'success') return;
let attempts = 0;
const interval = setInterval(async () => {
attempts += 1;
const { data } = await supabase.from('studios').select('*').eq('id', studio.id).maybeSingle();
if (data?.unlocked) {
clearInterval(interval);
onUpdate(data);
} else if (attempts >= 10) {
clearInterval(interval);
setConfirming(false);
}
}, 2000);
return () => clearInterval(interval);
}, [checkoutStatus, studio.id, onUpdate]);

async function goToCheckout() {
setRedirecting(true);
setError('');
try {
const res = await fetch('/api/create-checkout-session', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ studioId: studio.id, tier: selectedTier, ownerEmail: studio.owner_email }),
});
const data = await res.json();
if (!res.ok || !data.url) {
setError('Something went wrong starting checkout — please try again.');
setRedirecting(false);
return;
}
window.location.href = data.url;
} catch (e) {
setError('Something went wrong starting checkout — please try again.');
setRedirecting(false);
}
}

if (confirming) {
return (
<div className="login-shell">
<div className="login-card center">
<div className="login-brand">NailDesk<span style={{color:'var(--pink-dark)'}}>.</span></div>
<p className="sub" style={{margin:'16px 0 0'}}>Confirming your payment…</p>
</div>
</div>
);
}

return (
<div className="login-shell">
<div className="login-card" style={{maxWidth:600}}>
<div className="login-brand">{studio.name}<span style={{color:'var(--pink-dark)'}}>.</span></div>
<p className="sub center" style={{margin:'8px 0 28px'}}>Pick a plan to unlock your dashboard.</p>
{checkoutStatus === 'cancelled' && <div className="error-msg" style={{marginBottom:16}}>Payment was cancelled — pick a plan below to try again.</div>}
<div style={{display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:12, marginBottom:24}}>
{PLANS.map(p => (
<div key={p.key} onClick={() => setSelectedTier(p.key)}
style={{
border: selectedTier === p.key ? '2px solid var(--pink-dark)' : '1px solid var(--border)',
borderRadius:6, padding:16, cursor:'pointer', background: selectedTier === p.key ? 'var(--pink-light)' : 'transparent',
}}>
<div style={{fontFamily:'var(--fb)', fontSize:'0.72rem', letterSpacing:'0.06em', textTransform:'uppercase', color:'var(--ink-soft)'}}>{p.label}</div>
<div style={{fontFamily:'var(--fd)', fontWeight:500, fontSize:'1.6rem', margin:'6px 0'}}>{p.price}</div>
<div style={{fontSize:'0.8rem', color:'var(--ink-soft)', lineHeight:1.5}}>{p.blurb}</div>
</div>
))}
</div>
{error && <div className="error-msg">{error}</div>}
<button className="btn btn-solid" style={{width:'100%', justifyContent:'center'}} onClick={goToCheckout} disabled={redirecting}>
{redirecting ? 'Redirecting to payment…' : `Continue to payment — ${PLANS.find(p => p.key === selectedTier)?.price}`}
</button>
<div style={{textAlign:'center', marginTop:16}}>
<span className="nav-item logout-item" style={{display:'inline', cursor:'pointer'}} onClick={() => supabase.auth.signOut()}>Sign out</span>
</div>
</div>
</div>
);
}

function Overview({ studio }) {
const [stats, setStats] = useState({ todayBookings: 0, monthNet: 0, lowStock: 0, openTodos: 0 });
const [recent, setRecent] = useState([]);
useEffect(() => {
(async () => {
const today = new Date().toISOString().slice(0, 10);
const monthStart = new Date(); monthStart.setDate(1);
const monthStartStr = monthStart.toISOString().slice(0, 10);
const [{ count: todayBookings }, { data: inc }, { data: exp }, { data: stock }, { count: openTodos }, { data: appts }] = await Promise.all([
supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('studio_id', studio.id).eq('appointment_date', today),
supabase.from('income').select('amount').eq('studio_id', studio.id).gte('date', monthStartStr),
supabase.from('expenses').select('amount').eq('studio_id', studio.id).gte('date', monthStartStr),
supabase.from('stock_items').select('id').eq('studio_id', studio.id).lte('qty', 0),
supabase.from('todos').select('id', { count: 'exact', head: true }).eq('studio_id', studio.id).eq('done', false),
supabase.from('appointments').select('service_name, appointment_date, appointment_time, created_at').eq('studio_id', studio.id).order('created_at', { ascending: false }).limit(5),
]);
const incomeTotal = (inc || []).reduce((s, r) => s + Number(r.amount), 0);
const expenseTotal = (exp || []).reduce((s, r) => s + Number(r.amount), 0);
setStats({ todayBookings: todayBookings || 0, monthNet: incomeTotal - expenseTotal, lowStock: (stock || []).length, openTodos: openTodos || 0 });
setRecent(appts || []);
})();
}, [studio]);

const hour = new Date().getHours();
const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

return (
<>
<div className="page-head">
<span className="eyebrow">Overview</span>
<h1>{greeting}, {studio.name}.</h1>
<p className="sub">Everything about your studio in one place.</p>
</div>
<div className="stat-grid">
<div className="stat"><div className="num">{stats.todayBookings}</div><div className="lbl">Bookings today</div></div>
<div className="stat"><div className="num">$" + "{stats.monthNet.toFixed(0)}</div><div className="lbl">Net this month</div></div>
<div className="stat"><div className="num">{stats.lowStock}</div><div className="lbl">Low stock items</div></div>
<div className="stat"><div className="num">{stats.openTodos}</div><div className="lbl">Open to-dos</div></div>
</div>
<div className="activity">
{recent.map((a, i) => (
<div className="row" key={i}><span>{a.service_name} — {a.appointment_date} {a.appointment_time}</span><span>booked</span></div>
))}
{recent.length === 0 && <div className="row"><span>No bookings yet</span><span></span></div>}
</div>
</>
);
}

function Bookings({ studio }) {
const [rows, setRows] = useState([]);
useEffect(() => {
(async () => {
const { data } = await supabase.from('appointments').select('*').eq('studio_id', studio.id).order('appointment_date', { ascending: false }).order('appointment_time');
setRows(data || []);
})();
}, [studio]);
return (
<>
<div className="page-head"><span className="eyebrow">Bookings</span><h1>Upcoming &amp; past appointments</h1></div>
<table>
<thead><tr><th>Date</th><th>Time</th><th>Service</th><th>Client</th><th>Price</th><th>Status</th></tr></thead>
<tbody>
{rows.map(r => (
<tr key={r.id}><td>{r.appointment_date}</td><td>{r.appointment_time}</td><td>{r.service_name}</td><td>{r.client_name}</td><td>$" + "{Number(r.price).toFixed(0)}</td><td>{r.status}</td></tr>
))}
{rows.length === 0 && <tr><td colSpan={6}>No bookings yet.</td></tr>}
</tbody>
</table>
</>
);
}

function Clients({ studio }) {
const [rows, setRows] = useState([]);
useEffect(() => {
(async () => {
const { data } = await supabase.from('clients').select('*').eq('studio_id', studio.id).order('created_at', { ascending: false });
setRows(data || []);
})();
}, [studio]);
return (
<>
<div className="page-head"><span className="eyebrow">Clients</span><h1>Every client, one record</h1></div>
<table>
<thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Notes</th></tr></thead>
<tbody>
{rows.map(r => (
<tr key={r.id}><td>{r.name}</td><td>{r.phone}</td><td>{r.email}</td><td>{r.notes}</td></tr>
))}
{rows.length === 0 && <tr><td colSpan={4}>No clients yet.</td></tr>}
</tbody>
</table>
</>
);
}

function Finance({ studio }) {
const [income, setIncome] = useState([]);
const [expenses, setExpenses] = useState([]);
const [type, setType] = useState('income');
const [desc, setDesc] = useState('');
const [amount, setAmount] = useState('');

async function load() {
const [{ data: inc }, { data: exp }] = await Promise.all([
supabase.from('income').select('*').eq('studio_id', studio.id).order('date', { ascending: false }),
supabase.from('expenses').select('*').eq('studio_id', studio.id).order('date', { ascending: false }),
]);
setIncome(inc || []);
setExpenses(exp || []);
}
useEffect(() => { load(); }, [studio]);

async function addEntry() {
if (!desc || !amount) return;
const today = new Date().toISOString().slice(0, 10);
if (type === 'income') {
await supabase.from('income').insert({ studio_id: studio.id, date: today, type: desc, amount: Number(amount) });
} else {
await supabase.from('expenses').insert({ studio_id: studio.id, date: today, category: desc, amount: Number(amount) });
}
setDesc(''); setAmount('');
load();
}

const rows = [
...income.map(r => ({ ...r, kind: 'income', label: r.type })),
...expenses.map(r => ({ ...r, kind: 'expense', label: r.category })),
].sort((a, b) => new Date(b.date) - new Date(a.date));

const total = income.reduce((s, r) => s + Number(r.amount), 0) - expenses.reduce((s, r) => s + Number(r.amount), 0);

return (
<>
<div className="page-head"><span className="eyebrow">Income &amp; Expenses</span><h1>See your real profit</h1></div>
<div className="inline-form">
<select value={type} onChange={e => setType(e.target.value)}>
<option value="income">Income</option>
<option value="expense">Expense</option>
</select>
<input type="text" placeholder="Description, e.g. Rent" value={desc} onChange={e => setDesc(e.target.value)} />
<input type="number" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} style={{maxWidth:120}} />
<button className="btn btn-solid" onClick={addEntry}>Add entry</button>
</div>
<table>
<thead><tr><th>Date</th><th>Description</th><th>Amount</th></tr></thead>
<tbody>
{rows.map((r, i) => (
<tr key={i}><td>{new Date(r.date).toLocaleDateString('en-AU')}</td><td>{r.label}</td>
<td className={r.kind === 'income' ? 'amt-in' : 'amt-out'}>{r.kind === 'income' ? '+' : '−'}$" + "{Number(r.amount).toFixed(0)}</td></tr>
))}
</tbody>
</table>
<div className="stat-grid" style={{marginTop:18, marginBottom:0}}>
<div className="stat"><div className="num">$" + "{total.toFixed(0)}</div><div className="lbl">Net total</div></div>
</div>
</>
);
}

function PriceList({ studio }) {
const [rows, setRows] = useState([]);
const [name, setName] = useState('');
const [price, setPrice] = useState('');
const [duration, setDuration] = useState('');

async function load() {
const { data } = await supabase.from('services').select('*').eq('studio_id', studio.id).order('created_at');
setRows(data || []);
}
useEffect(() => { load(); }, [studio]);

async function addService() {
if (!name || !price) return;
await supabase.from('services').insert({ studio_id: studio.id, name, price: Number(price), duration_mins: duration ? Number(duration) : 60 });
setName(''); setPrice(''); setDuration('');
load();
}

return (
<>
<div className="page-head"><span className="eyebrow">Price list</span><h1>Your services &amp; packages</h1><p className="sub">This is exactly what shows on your public booking page.</p></div>
<div className="inline-form">
<input type="text" placeholder="Service name" value={name} onChange={e => setName(e.target.value)} />
<input type="number" placeholder="Duration (mins)" value={duration} onChange={e => setDuration(e.target.value)} style={{maxWidth:160}} />
<input type="number" placeholder="Price" value={price} onChange={e => setPrice(e.target.value)} style={{maxWidth:120}} />
<button className="btn btn-solid" onClick={addService}>Add</button>
</div>
<div className="toolbar"><button className="btn btn-outline" onClick={() => window.print()}>Print price list</button></div>
<div className="price-sheet">
<h2 style={{fontFamily:'var(--fd)', fontStyle:'italic', marginBottom:20}}>{studio.name}</h2>
{rows.map(r => (
<div className="price-row" key={r.id}>
<div><div className="pname">{r.name}</div>{r.duration_mins && <span className="pmeta">{r.duration_mins} min</span>}</div>
<div className="pval">$" + "{Number(r.price).toFixed(0)}</div>
</div>
))}
{rows.length === 0 && <p className="sub">No services yet — add one above.</p>}
</div>
</>
);
}

function Todo({ studio }) {
const [rows, setRows] = useState([]);
const [text, setText] = useState('');

async function load() {
const { data } = await supabase.from('todos').select('*').eq('studio_id', studio.id).order('created_at');
setRows(data || []);
}
useEffect(() => { load(); }, [studio]);

async function addTodo() {
if (!text) return;
await supabase.from('todos').insert({ studio_id: studio.id, text });
setText('');
load();
}
async function toggle(row) {
await supabase.from('todos').update({ done: !row.done }).eq('id', row.id);
load();
}

return (
<>
<div className="page-head"><span className="eyebrow">To-do</span><h1>The small stuff, tracked</h1></div>
<div className="inline-form">
<input type="text" placeholder="Add a task" value={text} onChange={e => setText(e.target.value)} />
<button className="btn btn-solid" onClick={addTodo}>Add task</button>
</div>
<div className="todo-list">
{rows.map(r => (
<div className={'todo-item' + (r.done ? ' done' : '')} key={r.id}>
<input type="checkbox" checked={r.done} onChange={() => toggle(r)} /><span style={{flex:1}}>{r.text}</span>
<span style={{fontSize:'0.75rem', color:'var(--ink-soft)', flexShrink:0, marginLeft:10}}>{new Date(r.created_at).toLocaleDateString('en-AU')}</span>
</div>
))}
{rows.length === 0 && <div className="todo-item">Nothing to do yet.</div>}
</div>
</>
);
}

function Stock({ studio }) {
const [rows, setRows] = useState([]);
const [name, setName] = useState('');
const [qty, setQty] = useState('');
const [reorderAt, setReorderAt] = useState('');

async function load() {
const { data } = await supabase.from('stock_items').select('*').eq('studio_id', studio.id).order('name');
setRows(data || []);
}
useEffect(() => { load(); }, [studio]);

async function addItem() {
if (!name) return;
await supabase.from('stock_items').insert({ studio_id: studio.id, name, qty: Number(qty) || 0, reorder_at: Number(reorderAt) || 0 });
setName(''); setQty(''); setReorderAt('');
load();
}

return (
<>
<div className="page-head"><span className="eyebrow">Stock</span><h1>Know what's running low</h1></div>
<div className="inline-form">
<input type="text" placeholder="Item name" value={name} onChange={e => setName(e.target.value)} />
<input type="number" placeholder="Qty on hand" value={qty} onChange={e => setQty(e.target.value)} style={{maxWidth:140}} />
<input type="number" placeholder="Reorder at" value={reorderAt} onChange={e => setReorderAt(e.target.value)} style={{maxWidth:140}} />
<button className="btn btn-solid" onClick={addItem}>Add item</button>
</div>
<table>
<thead><tr><th>Item</th><th>On hand</th><th>Reorder at</th><th>Status</th></tr></thead>
<tbody>
{rows.map(r => (
<tr key={r.id}>
<td>{r.name}</td><td>{r.qty}</td><td>{r.reorder_at}</td>
<td><span className={'tag ' + (r.qty <= r.reorder_at ? 'low' : 'ok')}>{r.qty <= r.reorder_at ? 'Low' : 'OK'}</span></td>
</tr>
))}
{rows.length === 0 && <tr><td colSpan={4}>No stock items yet.</td></tr>}
</tbody>
</table>
</>
);
}
