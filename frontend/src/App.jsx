import { useEffect, useState } from 'react'
import { Link, Routes, Route, useNavigate, Navigate } from 'react-router-dom'
import AdminDashboard from './AdminDashboard'
import { request, getToken } from './api'

// function Auth({ mode, onAuth }) {
//   const [form, setForm] = useState({name:'', email:'', password:''}), [error,setError]=useState('')
//   const nav = useNavigate()
//   async function submit(e){
//     e.preventDefault(); setError('')
//     try {
//       const data = await request(mode === 'register' ? '/auth/register' : '/auth/login',
//         {method:'POST', body:JSON.stringify(form)})
//       localStorage.setItem('token', data.access_token); localStorage.setItem('user', JSON.stringify(data.user))
//       onAuth(data.user); nav('/')
//     } catch(err){ setError(err.message) }
//   }
//   return <section className="auth-card"><span className="eyebrow">CAREBOOK ACCOUNT</span><h1>{mode==='register'?'Create your account':'Welcome back'}</h1><p className="muted">Book and manage your appointments in one place.</p>
//     <form onSubmit={submit}>{mode==='register'&&<label>Full name<input required minLength="2" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Your name"/></label>}
//     <label>Email address<input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="you@example.com"/></label>
//     <label>Password<input required minLength="8" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="At least 8 characters"/></label>
//     {error&&<p className="error">{error}</p>}<button className="primary full">{mode==='register'?'Create account':'Sign in'}</button></form>
//     <p className="muted center">{mode==='register'?'Already have an account?':'New to CareBook?'} <Link to={mode==='register'?'/login':'/register'}>{mode==='register'?'Sign in':'Create account'}</Link></p>
//   </section>
// }

function Auth({ mode, onAuth }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: ''
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let body;
      let headers = {};

      if (mode === 'register') {
        // Registration sends JSON to FastAPI
        body = JSON.stringify(form);
        headers['Content-Type'] = 'application/json';
      } else {
        // OAuth2 login expects form data
        body = new URLSearchParams();
        body.append('username', form.email);
        body.append('password', form.password);

        headers['Content-Type'] =
          'application/x-www-form-urlencoded';
      }

      const data = await request(
        mode === 'register'
          ? '/auth/register'
          : '/auth/login',
        {
          method: 'POST',
          headers,
          body
        }
      );

      if (!data.access_token || !data.user) {
        throw new Error('Invalid response from server');
      }

      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));

      onAuth(data.user);
      nav('/');

    } catch (err) {
      console.error('Authentication failed:', err);

      setError(
        typeof err.message === 'string'
          ? err.message
          : 'Unable to authenticate. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-card">
      <span className="eyebrow">CAREBOOK ACCOUNT</span>

      <h1>
        {mode === 'register'
          ? 'Create your account'
          : 'Welcome back'}
      </h1>

      <p className="muted">
        Book and manage your appointments in one place.
      </p>

      <form onSubmit={submit}>
        {mode === 'register' && (
          <label>
            Full name
            <input
              required
              minLength="2"
              value={form.name}
              onChange={e =>
                setForm({ ...form, name: e.target.value })
              }
              placeholder="Your name"
            />
          </label>
        )}

        <label>
          Email address
          <input
            required
            type="email"
            value={form.email}
            onChange={e =>
              setForm({ ...form, email: e.target.value })
            }
            placeholder="you@example.com"
          />
        </label>

        <label>
          Password
          <input
            required
            minLength="8"
            type="password"
            value={form.password}
            onChange={e =>
              setForm({ ...form, password: e.target.value })
            }
            placeholder="At least 8 characters"
          />
        </label>

        {error && (
          <p className="error">{error}</p>
        )}

        <button
          className="primary full"
          type="submit"
          disabled={loading}
        >
          {loading
            ? 'Please wait...'
            : mode === 'register'
              ? 'Create account'
              : 'Sign in'}
        </button>
      </form>

      <p className="muted center">
        {mode === 'register'
          ? 'Already have an account?'
          : 'New to CareBook?'}

        {' '}

        <Link to={mode === 'register' ? '/login' : '/register'}>
          {mode === 'register' ? 'Sign in' : 'Create account'}
        </Link>
      </p>
    </section>
  );
}

function Dashboard({user}) {
  const [services,setServices]=useState([]), [slots,setSlots]=useState([]), [bookings,setBookings]=useState([]),
    [serviceId,setServiceId]=useState(''), [date,setDate]=useState(new Date().toISOString().slice(0,10)),
    [message,setMessage]=useState(''), [error,setError]=useState('')
  async function load(){
    try { const s=await request('/services'); setServices(s); if(s.length&&!serviceId)setServiceId(String(s[0].id))
      if(getToken())setBookings(await request('/bookings/me')) } catch(e){setError(e.message)}
  }
  useEffect(()=>{load()},[])
  useEffect(()=>{if(serviceId&&date)request(`/slots?service_id=${serviceId}&date=${date}`).then(setSlots).catch(e=>setError(e.message))},[serviceId,date])
  async function book(slotId){
    try {await request('/bookings',{method:'POST',body:JSON.stringify({slot_id:slotId,notes:''})});setMessage('Your appointment is confirmed.');setError('');load();request(`/slots?service_id=${serviceId}&date=${date}`).then(setSlots)}
    catch(e){setError(e.message)}
  }
  async function cancel(id){
    try{await request(`/bookings/${id}/cancel`,{method:'PATCH'});setMessage('Booking cancelled.');load()}catch(e){setError(e.message)}
  }
  return <main className="page">
    <section className="welcome"><div><span className="eyebrow">YOUR WELLNESS, ON YOUR TIME</span><h1>Find a time that works for you.</h1><p>Choose a service, pick an available slot, and you're all set.</p></div><div className="welcome-mark">✦</div></section>
    {(message||error)&&<div className={error?'notice error':'notice success'}>{error||message}<button onClick={()=>{setError('');setMessage('')}}>×</button></div>}
    <div className="section-heading"><div><span className="eyebrow">BOOK AN APPOINTMENT</span><h2>Available services</h2></div><span className="step">01 — 02</span></div>
    <div className="booking-layout"><section className="panel service-panel"><label>Choose a service<select value={serviceId} onChange={e=>setServiceId(e.target.value)}>{services.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select></label>
      <div className="service-detail"><div className="service-icon">✚</div><div><h3>{services.find(s=>String(s.id)===serviceId)?.name||'Select a service'}</h3><p>{services.find(s=>String(s.id)===serviceId)?.description||'Choose from our available services.'}</p><small>{services.find(s=>String(s.id)===serviceId)?.duration_minutes||30} minute appointment</small></div></div>
      <label className="date-label">Select a date<input type="date" min={new Date().toISOString().slice(0,10)} value={date} onChange={e=>setDate(e.target.value)}/></label>
      <h3 className="slot-title">Available time slots</h3><div className="slots">{slots.length?slots.map(s=><button className="slot" key={s.id} onClick={()=>book(s.id)}>{new Date(s.start_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}<small>{s.available} left</small></button>):<p className="muted">No available slots for this date. Try another date.</p>}</div>
    </section><aside className="panel help-panel"><div className="help-icon">♡</div><h3>Simple, secure booking</h3><p>Your appointments stay organised in one place. You can review your history or cancel a booking whenever plans change.</p><div className="help-rule"/><div className="mini-stat"><b>01</b><span>Choose a service</span></div><div className="mini-stat"><b>02</b><span>Select a convenient time</span></div><div className="mini-stat"><b>03</b><span>Confirm your appointment</span></div></aside></div>
    {getToken()&&<section className="history"><div className="section-heading"><div><span className="eyebrow">YOUR ACTIVITY</span><h2>My bookings</h2></div><span className="count">{bookings.length} total</span></div>
      {bookings.length?<div className="booking-list">{bookings.map(b=><article className="booking-row" key={b.id}><div className="booking-date"><b>{new Date(b.start_at).toLocaleDateString([], {day:'2-digit'})}</b><span>{new Date(b.start_at).toLocaleDateString([], {month:'short'})}</span></div><div className="booking-info"><b>{b.service_name}</b><span>{new Date(b.start_at).toLocaleString([], {dateStyle:'medium',timeStyle:'short'})}</span></div><span className={`badge ${b.status}`}>{b.status}</span>{b.status==='confirmed'&&<button className="text-button" onClick={()=>cancel(b.id)}>Cancel</button>}</article>)}</div>:<div className="empty">No bookings yet. Choose a time slot above to get started.</div>}
    </section>}
    {!getToken()&&<div className="login-prompt"> <span>Sign in to book an appointment and view your history.</span><Link className="primary link-button" to="/login">Sign in</Link></div>}
  </main>
}

// export default function App(){
//   const [user,setUser]=useState(()=>{try{return JSON.parse(localStorage.getItem('user'))}catch{return null}})
//   function logout(){localStorage.removeItem('token');localStorage.removeItem('user');setUser(null)}
//   return <><header className="topbar"><Link className="brand" to="/"><span className="brand-icon">✚</span>care<span>book</span></Link><nav><Link to="/">Appointments</Link>{user?<><span className="user-chip">{user.name}</span><button className="nav-button" onClick={logout}>Sign out</button></>:<><Link to="/login">Sign in</Link><Link className="nav-cta" to="/register">Get started</Link></>}</nav></header>
//     <Routes><Route path="/" element={<Dashboard user={user}/>}/><Route path="/login" element={<Auth mode="login" onAuth={setUser}/>}/><Route path="/register" element={<Auth mode="register" onAuth={setUser}/>}/></Routes>
//     <footer><span>© 2026 CareBook</span><span>Appointments made simple.</span></footer></>
// }

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user'))
    } catch {
      return null
    }
  })

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <>
      <header className="topbar">
        <Link className="brand" to="/">
          <span className="brand-icon">✚</span>
          care<span>book</span>
        </Link>

        <nav>
          <Link to="/">Appointments</Link>

          {user ? (
            <>
              {user.role === 'admin' && (
                <Link to="/admin">Admin Dashboard</Link>
              )}

              <span className="user-chip">{user.name}</span>

              <button className="nav-button" onClick={logout}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Sign in</Link>
              <Link className="nav-cta" to="/register">
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>

      <Routes>
        <Route
          path="/"
          element={<Dashboard user={user} />}
        />

        <Route
          path="/admin"
          element={
            user?.role === 'admin'
              ? <AdminDashboard user={user} />
              : <Navigate to="/" replace />
          }
        />

        <Route
          path="/login"
          element={<Auth mode="login" onAuth={setUser} />}
        />

        <Route
          path="/register"
          element={<Auth mode="register" onAuth={setUser} />}
        />
      </Routes>

      <footer>
        <span>© 2026 CareBook</span>
        <span>Appointments made simple.</span>
      </footer>
    </>
  )
}


