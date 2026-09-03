import React, { useState } from 'react';
import { supabase } from './supabaseClient.js';

export default function Login() {
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [showPassword, setShowPassword] = useState(false);
const [error, setError] = useState('');
const [loading, setLoading] = useState(false);
const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'reset'
const [resetSent, setResetSent] = useState(false);

async function handleSubmit(e) {
e.preventDefault();
setError('');
setLoading(true);
if (mode === 'signin') {
const { error } = await supabase.auth.signInWithPassword({ email, password });
if (error) setError(error.message);
} else if (mode === 'signup') {
const { error } = await supabase.auth.signUp({ email, password });
if (error) setError(error.message);
else setError('Check your email to confirm your account, then sign in.');
}
setLoading(false);
}

async function handleReset(e) {
e.preventDefault();
setError('');
setLoading(true);
const { error } = await supabase.auth.resetPasswordForEmail(email, {
redirectTo: window.location.origin + '/login',
});
setLoading(false);
if (error) { setError(error.message); return; }
setResetSent(true);
}

if (mode === 'reset') {
return (
<div className="login-shell">
<div className="login-card">
<div className="login-brand">NailDesk<span style={{color:'var(--pink-dark)'}}>.</span></div>
<div className="login-sub">Reset your password</div>
{resetSent ? (
<p className="sub center" style={{margin:'16px 0 0'}}>Check your email for a link to reset your password.</p>
) : (
<form onSubmit={handleReset}>
<div className="field">
<label>Email</label>
<input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
</div>
{error && <div className="error-msg">{error}</div>}
<button className="btn btn-solid" type="submit" style={{width:'100%', justifyContent:'center'}} disabled={loading}>
{loading ? 'Sending…' : 'Send reset link'}
</button>
</form>
)}
<div style={{textAlign:'center', marginTop:18, fontSize:'0.82rem', color:'var(--ink-soft)'}}>
<a href="#" onClick={e => { e.preventDefault(); setMode('signin'); setError(''); setResetSent(false); }} style={{color:'var(--pink-dark)', textDecoration:'underline'}}>← Back to sign in</a>
</div>
</div>
</div>
);
}

return (
<div className="login-shell">
<div className="login-card">
<div className="login-brand">NailDesk<span style={{color:'var(--pink-dark)'}}>.</span></div>
<div className="login-sub">{mode === 'signin' ? 'Sign in to your dashboard' : 'Create your studio account'}</div>
<form onSubmit={handleSubmit}>
<div className="field">
<label>Email</label>
<input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
</div>
<div className="field">
<label>Password</label>
<div style={{position:'relative'}}>
<input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={6} style={{paddingRight:52}} />
<button type="button" onClick={() => setShowPassword(s => !s)}
style={{position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:'0.72rem', letterSpacing:'0.04em', textTransform:'uppercase', color:'var(--pink-dark)', padding:4}}>
{showPassword ? 'Hide' : 'Show'}
</button>
</div>
</div>
{mode === 'signin' && (
<div style={{textAlign:'right', marginTop:-6, marginBottom:14}}>
<a href="#" onClick={e => { e.preventDefault(); setMode('reset'); setError(''); }} style={{fontSize:'0.78rem', color:'var(--ink-soft)', textDecoration:'underline'}}>Forgot password?</a>
</div>
)}
{error && <div className="error-msg">{error}</div>}
<button className="btn btn-solid" type="submit" style={{width:'100%', justifyContent:'center'}} disabled={loading}>
{loading ? 'Please wait…' : (mode === 'signin' ? 'Sign in' : 'Create account')}
</button>
</form>
<div style={{textAlign:'center', marginTop:18, fontSize:'0.82rem', color:'var(--ink-soft)'}}>
{mode === 'signin' ? (
<span>New studio? <a href="#" onClick={e => { e.preventDefault(); setMode('signup'); setError(''); }} style={{color:'var(--pink-dark)', textDecoration:'underline'}}>Create an account</a></span>
) : (
<span>Already have one? <a href="#" onClick={e => { e.preventDefault(); setMode('signin'); setError(''); }} style={{color:'var(--pink-dark)', textDecoration:'underline'}}>Sign in</a></span>
)}
</div>
</div>
</div>
);
}
