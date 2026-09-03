import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient.js';

function nextDays(n) {
const out = [];
const today = new Date();
for (let i = 0; i < n; i++) {
const d = new Date(today);
d.setDate(today.getDate() + i);
out.push(d);
}
return out;
}
function fmtDate(d) { return d.toISOString().slice(0, 10); }
function dayLabel(d) { return d.toLocaleDateString('en-AU', { weekday: 'short' }).toUpperCase(); }
function dayNum(d) { return d.getDate(); }

export default function Booking({ slug }) {
const [loading, setLoading] = useState(true);
const [notFound, setNotFound] = useState(false);
const [studio, setStudio] = useState(null);
const [services, setServices] = useState([]);
const [settings, setSettings] = useState(null);

const [step, setStep] = useState(1);
const [service, setService] = useState(null);
const dates = nextDays(7);
const [dateIdx, setDateIdx] = useState(0);
const [takenSlots, setTakenSlots] = useState([]);
const [slot, setSlot] = useState(null);
const [name, setName] = useState('');
const [phone, setPhone] = useState('');
const [email, setEmail] = useState('');
const [submitting, setSubmitting] = useState(false);
const [submitError, setSubmitError] = useState('');
const [confirmed, setConfirmed] = useState(null);

const DAILY_SLOTS = ['09:00', '10:30', '12:00', '14:00', '15:30', '17:00'];

useEffect(() => {
(async () => {
const { data: studioRow } = await supabase.from('studios').select('*').eq('booking_slug', slug).maybeSingle();
if (!studioRow) { setNotFound(true); setLoading(false); return; }
setStudio(studioRow);
const [{ data: svc }, { data: bs }] = await Promise.all([
supabase.from('services').select('*').eq('studio_id', studioRow.id).eq('active', true).order('created_at'),
supabase.from('booking_settings').select('*').eq('studio_id', studioRow.id).maybeSingle(),
]);
setServices(svc || []);
setSettings(bs || null);
setLoading(false);
})();
}, [slug]);

useEffect(() => {
if (studio) document.title = studio.name;
}, [studio]);

useEffect(() => {
if (!studio) return;
(async () => {
const dateStr = fmtDate(dates[dateIdx]);
const { data } = await supabase.from('appointments')
.select('appointment_time')
.eq('studio_id', studio.id)
.eq('appointment_date', dateStr)
.neq('status', 'cancelled');
setTakenSlots((data || []).map(r => r.appointment_time.slice(0, 5)));
setSlot(null);
})();
}, [studio, dateIdx]);

async function confirmBooking() {
setSubmitting(true);
setSubmitError('');

const reference = 'ND-' + Math.random().toString(36).slice(2, 8).toUpperCase();
const { error: apptErr } = await supabase.from('appointments').insert({
studio_id: studio.id,
service_id: service.id,
reference,
appointment_date: fmtDate(dates[dateIdx]),
appointment_time: slot,
duration_mins: service.duration_mins || 60,
price: service.price,
service_name: service.name,
client_name: name,
client_phone: phone,
client_email: email,
source: 'online',
});
if (apptErr) {
if (apptErr.code === '23505') {
setSubmitError('Sorry — that time was just booked by someone else. Please pick another slot.');
setSlot(null);
setStep(2);
} else {
setSubmitError('Something went wrong — please try again.');
}
setSubmitting(false);
return;
}
setConfirmed({ reference });
setSubmitting(false);
setStep(4);
}

if (loading) return <div className="login-shell">Loading…</div>;
if (notFound) return <div className="login-shell"><div className="login-card center"><h1>Studio not found</h1><p className="sub">This booking link doesn't match any studio.</p></div></div>;

return (
<div>
<div style={{background:'var(--card)', borderBottom:'1px solid var(--border)', padding:'18px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12}}>
<div className="brand" style={{color:'var(--ink)'}}>{studio.name}</div>
<div style={{display:'flex', gap:8, fontFamily:'var(--fb)', fontSize:'0.75rem', letterSpacing:'0.04em', textTransform:'uppercase', color:'var(--ink-soft)'}}>
{['Service', 'Time', 'Details', 'Confirmed'].map((label, i) => {
const n = i + 1;
return <span key={label} style={{fontWeight: n === step ? 600 : 400, color: n === step ? 'var(--pink-dark)' : 'var(--ink-soft)'}}>{n < step ? '✓ ' : ''}{label}</span>;
})}
</div>
</div>

<div className="login-shell" style={{alignItems:'flex-start', paddingTop:48}}>
<div className="login-card" style={{maxWidth:520, textAlign:'left'}}>

{step === 1 && (
<>
<span className="eyebrow">Step 1 of 4</span>
<h1>Pick a service</h1>
<div style={{marginBottom:20}}>
{services.map(s => (
<div key={s.id} onClick={() => setService(s)}
style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:14, border: service?.id === s.id ? '2px solid var(--pink-dark)' : '1px solid var(--border)', borderRadius:5, marginBottom:10, cursor:'pointer', background: service?.id === s.id ? 'var(--pink-light)' : 'transparent'}}>
<div>
<div style={{fontWeight:500}}>{s.name}</div>
<div style={{fontSize:'0.78rem', color:'var(--ink-soft)'}}>{s.duration_mins} min</div>
</div>
<div style={{fontFamily:'var(--fd)', fontWeight:500}}>$" + "{Number(s.price).toFixed(0)}</div>
</div>
))}
{services.length === 0 && <p className="sub">No services are set up yet — check back soon.</p>}
</div>
<button className="btn btn-solid" style={{width:'100%', justifyContent:'center'}} disabled={!service} onClick={() => setStep(2)}>Continue</button>
</>
)}

{step === 2 && (
<>
<span className="eyebrow">Step 2 of 4</span>
<h1>Pick a time</h1>
<div style={{display:'flex', gap:8, overflowX:'auto', marginBottom:18}}>
{dates.map((d, i) => (
<div key={i} onClick={() => setDateIdx(i)}
style={{textAlign:'center', padding:'10px 14px', borderRadius:5, cursor:'pointer', flexShrink:0, border: dateIdx === i ? '2px solid var(--pink-dark)' : '1px solid var(--border)', background: dateIdx === i ? 'var(--pink-light)' : 'transparent'}}>
<div style={{fontSize:'0.68rem', letterSpacing:'0.06em', color:'var(--ink-soft)'}}>{dayLabel(d)}</div>
<div style={{fontFamily:'var(--fd)', fontWeight:500, fontSize:'1.1rem'}}>{dayNum(d)}</div>
</div>
))}
</div>
<div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8, marginBottom:20}}>
{DAILY_SLOTS.map(t => {
const isFull = takenSlots.includes(t);
return (
<div key={t}
style={{textAlign:'center', padding:'10px 6px', borderRadius:5, fontSize:'0.85rem', cursor: isFull ? 'not-allowed' : 'pointer', opacity: isFull ? 0.4 : 1, border: slot === t ? '2px solid var(--pink-dark)' : '1px solid var(--border)', background: slot === t ? 'var(--pink-light)' : 'transparent'}}
onClick={() => !isFull && setSlot(t)}>
{t}{isFull ? ' · Full' : ''}
</div>
);
})}
</div>
<div style={{display:'flex', justifyContent:'space-between'}}>
<button className="btn btn-outline" onClick={() => setStep(1)}>← Back</button>
<button className="btn btn-solid" disabled={!slot} onClick={() => setStep(3)}>Continue</button>
</div>
</>
)}

{step === 3 && (
<>
<span className="eyebrow">Step 3 of 4</span>
<h1>Confirm your details</h1>
<div className="field"><label>Full name</label><input value={name} onChange={e => setName(e.target.value)} /></div>
<div className="field"><label>Mobile</label><input value={phone} onChange={e => setPhone(e.target.value)} /></div>
<div className="field"><label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
{settings?.require_deposit && settings?.deposit_amount > 0 && (
<div style={{background:'var(--amber-light)', color:'var(--amber)', fontSize:'0.85rem', padding:'12px 14px', borderRadius:5, marginBottom:16}}>
<strong>Deposit — $" + "{Number(settings.deposit_amount).toFixed(0)}</strong><br/>
Transfer to {settings.bank_account_name} · BSB {settings.bank_bsb} · Acc {settings.bank_account_number} · Reference: your name.
</div>
)}
{submitError && <div className="error-msg">{submitError}</div>}
<div style={{display:'flex', justifyContent:'space-between'}}>
<button className="btn btn-outline" onClick={() => setStep(2)}>← Back</button>
<button className="btn btn-solid" disabled={!name || !phone || !email || submitting} onClick={confirmBooking}>
{submitting ? 'Confirming…' : 'Confirm booking'}
</button>
</div>
</>
)}

{step === 4 && confirmed && (
<div style={{textAlign:'center'}}>
<div style={{width:56, height:56, borderRadius:'50%', background:'var(--pink-dark)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.4rem', margin:'0 auto 16px'}}>✓</div>
<span className="eyebrow">Step 4 of 4</span>
<h1>Booking confirmed</h1>
<div style={{background:'var(--pink-light)', borderRadius:5, padding:18, textAlign:'left', margin:'20px 0'}}>
<div style={{display:'flex', justifyContent:'space-between', padding:'6px 0'}}><span>Reference</span><span>{confirmed.reference}</span></div>
<div style={{display:'flex', justifyContent:'space-between', padding:'6px 0'}}><span>Service</span><span>{service.name}</span></div>
<div style={{display:'flex', justifyContent:'space-between', padding:'6px 0'}}><span>When</span><span>{dates[dateIdx].toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}, {slot}</span></div>
<div style={{display:'flex', justifyContent:'space-between', padding:'6px 0'}}><span>Price</span><span>$" + "{Number(service.price).toFixed(0)}</span></div>
</div>
<p className="sub">A confirmation has been recorded — the studio has been notified instantly.</p>
</div>
)}

</div>
</div>
</div>
);
}
