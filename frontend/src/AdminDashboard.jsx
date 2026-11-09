
// import { useEffect, useState } from 'react'
// import { request } from './api'

// export default function AdminDashboard({ user }) {
//   const [services, setServices] = useState([])
//   const [bookings, setBookings] = useState([])
//   const [error, setError] = useState('')
//   const [loading, setLoading] = useState(true)

//   async function loadDashboard() {
//     try {
//       setLoading(true)
//       setError('')

//       const [serviceData, bookingData] = await Promise.all([
//         request('/services'),
//         request('/admin/bookings')
//       ])

//       setServices(serviceData)
//       setBookings(bookingData)
//     } catch (err) {
//       setError(err.message || 'Unable to load dashboard')
//     } finally {
//       setLoading(false)
//     }
//   }

//   useEffect(() => {
//     loadDashboard()
//   }, [])

//   if (loading) {
//     return <p>Loading admin dashboard...</p>
//   }

//   return (
//     <main className="admin-dashboard">
//       <div className="admin-heading">
//         <div>
//           <p className="eyebrow">CAREBOOK ADMIN PANEL</p>
//           <h1>Admin Dashboard</h1>
//           <p>Welcome, {user?.name || 'Admin'}!</p>
//         </div>

//         <button onClick={loadDashboard}>
//           Refresh
//         </button>
//       </div>

//       {error && <p className="error">{error}</p>}

//       <section className="admin-stats">
//         <div className="admin-stat-card">
//           <h3>Total Services</h3>
//           <h2>{services.length}</h2>
//         </div>

//         <div className="admin-stat-card">
//           <h3>Total Bookings</h3>
//           <h2>{bookings.length}</h2>
//         </div>

//         <div className="admin-stat-card">
//           <h3>Confirmed Bookings</h3>
//           <h2>
//             {bookings.filter(
//               booking => booking.status === 'confirmed'
//             ).length}
//           </h2>
//         </div>

//         <div className="admin-stat-card">
//           <h3>Cancelled Bookings</h3>
//           <h2>
//             {bookings.filter(
//               booking => booking.status === 'cancelled'
//             ).length}
//           </h2>
//         </div>
//       </section>

//       <section className="admin-section">
//         <h2>Available Services</h2>

//         {services.length === 0 ? (
//           <p>No services available.</p>
//         ) : (
//           <div className="admin-table-wrapper">
//             <table>
//               <thead>
//                 <tr>
//                   <th>ID</th>
//                   <th>Service Name</th>
//                   <th>Description</th>
//                   <th>Duration</th>
//                 </tr>
//               </thead>

//               <tbody>
//                 {services.map(service => (
//                   <tr key={service.id}>
//                     <td>{service.id}</td>
//                     <td>{service.name}</td>
//                     <td>{service.description}</td>
//                     <td>{service.duration_minutes} minutes</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </section>

//       <section className="admin-section">
//         <h2>Customer Bookings</h2>

//         {bookings.length === 0 ? (
//           <p>No bookings found.</p>
//         ) : (
//           <div className="admin-table-wrapper">
//             <table>
//               <thead>
//                 <tr>
//                   <th>Booking ID</th>
//                   <th>Customer</th>
//                   <th>Email</th>
//                   <th>Service</th>
//                   <th>Appointment</th>
//                   <th>Status</th>
//                 </tr>
//               </thead>

//               <tbody>
//                 {bookings.map(booking => (
//                   <tr key={booking.id}>
//                     <td>{booking.id}</td>
//                     <td>{booking.customer}</td>
//                     <td>{booking.email}</td>
//                     <td>{booking.service}</td>
//                     <td>
//                       {new Date(booking.start_at).toLocaleString()}
//                     </td>
//                     <td>{booking.status}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </section>
//     </main>
//   )
// }

import { useEffect, useMemo, useState } from 'react'
import { request } from './api'

export default function AdminDashboard({ user }) {
  const [services, setServices] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [showServiceForm, setShowServiceForm] = useState(false)
  const [showSlotForm, setShowSlotForm] = useState(false)

  const [serviceForm, setServiceForm] = useState({
    name: '',
    description: '',
    duration_minutes: 30
  })

  const [slotForm, setSlotForm] = useState({
    service_id: '',
    start_at: '',
    end_at: '',
    capacity: 2
  })

  async function loadDashboard() {
    try {
      setLoading(true)
      setError('')

      const [serviceData, bookingData] = await Promise.all([
        request('/services'),
        request('/admin/bookings')
      ])

      setServices(serviceData)
      setBookings(bookingData)
    } catch (err) {
      setError(err.message || 'Unable to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const confirmed = bookings.filter(
    booking => booking.status === 'confirmed'
  ).length

  const cancelled = bookings.filter(
    booking => booking.status === 'cancelled'
  ).length

  const filteredBookings = useMemo(() => {
    return bookings.filter(booking => {
      const searchText = search.toLowerCase()

      const matchesSearch =
        String(booking.id).includes(searchText) ||
        (booking.customer || '').toLowerCase().includes(searchText) ||
        (booking.email || '').toLowerCase().includes(searchText) ||
        (booking.service || '').toLowerCase().includes(searchText)

      const matchesStatus =
        statusFilter === 'all' ||
        booking.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [bookings, search, statusFilter])

  async function addService(e) {
    e.preventDefault()
    setError('')
    setMessage('')

    try {
      await request('/admin/services', {
        method: 'POST',
        body: JSON.stringify({
          ...serviceForm,
          duration_minutes: Number(serviceForm.duration_minutes)
        })
      })

      setMessage('New service added successfully!')

      setServiceForm({
        name: '',
        description: '',
        duration_minutes: 30
      })

      setShowServiceForm(false)
      await loadDashboard()
    } catch (err) {
      setError(err.message || 'Unable to add service')
    }
  }

  async function addSlot(e) {
    e.preventDefault()
    setError('')
    setMessage('')

    try {
      await request('/admin/slots', {
        method: 'POST',
        body: JSON.stringify({
          service_id: Number(slotForm.service_id),
          start_at: new Date(slotForm.start_at).toISOString(),
          end_at: new Date(slotForm.end_at).toISOString(),
          capacity: Number(slotForm.capacity)
        })
      })

      setMessage('Appointment slot created successfully!')

      setSlotForm({
        service_id: '',
        start_at: '',
        end_at: '',
        capacity: 2
      })

      setShowSlotForm(false)
    } catch (err) {
      setError(err.message || 'Unable to create slot')
    }
  }

  if (loading) {
    return <main className="admin-dashboard"><p>Loading dashboard...</p></main>
  }

  return (
    <main className="admin-dashboard">

      <div className="admin-heading">
        <div>
          <p className="eyebrow">CAREBOOK ADMIN PANEL</p>
          <h1>Admin Dashboard</h1>
          <p>Welcome, {user?.name || 'Admin'}!</p>
        </div>

        <button className="admin-action" onClick={loadDashboard}>
          ↻ Refresh
        </button>
      </div>

      {(error || message) && (
        <div className={error ? 'notice error' : 'notice success'}>
          {error || message}
          <button onClick={() => {
            setError('')
            setMessage('')
          }}>×</button>
        </div>
      )}

      <section className="admin-stats">
        <div className="admin-stat-card">
          <h3>Total Services</h3>
          <h2>{services.length}</h2>
        </div>

        <div className="admin-stat-card">
          <h3>Total Bookings</h3>
          <h2>{bookings.length}</h2>
        </div>

        <div className="admin-stat-card">
          <h3>Confirmed Bookings</h3>
          <h2>{confirmed}</h2>
        </div>

        <div className="admin-stat-card">
          <h3>Cancelled Bookings</h3>
          <h2>{cancelled}</h2>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section-heading">
          <h2>Manage Services</h2>
          <button
            className="admin-action"
            onClick={() => setShowServiceForm(!showServiceForm)}
          >
            {showServiceForm ? 'Close' : '+ Add Service'}
          </button>
        </div>

        {showServiceForm && (
          <form className="admin-form" onSubmit={addService}>
            <label>
              Service Name
              <input
                required
                value={serviceForm.name}
                onChange={e => setServiceForm({
                  ...serviceForm,
                  name: e.target.value
                })}
                placeholder="Example: Eye Consultation"
              />
            </label>

            <label>
              Description
              <textarea
                required
                value={serviceForm.description}
                onChange={e => setServiceForm({
                  ...serviceForm,
                  description: e.target.value
                })}
                placeholder="Enter service description"
              />
            </label>

            <label>
              Duration (minutes)
              <input
                type="number"
                min="1"
                required
                value={serviceForm.duration_minutes}
                onChange={e => setServiceForm({
                  ...serviceForm,
                  duration_minutes: e.target.value
                })}
              />
            </label>

            <button className="admin-action" type="submit">
              Save Service
            </button>
          </form>
        )}

        <div className="admin-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Service</th>
                <th>Description</th>
                <th>Duration</th>
              </tr>
            </thead>

            <tbody>
              {services.map(service => (
                <tr key={service.id}>
                  <td>{service.id}</td>
                  <td>{service.name}</td>
                  <td>{service.description}</td>
                  <td>{service.duration_minutes} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section-heading">
          <h2>Manage Appointment Slots</h2>
          <button
            className="admin-action"
            onClick={() => setShowSlotForm(!showSlotForm)}
          >
            {showSlotForm ? 'Close' : '+ Add Slot'}
          </button>
        </div>

        {showSlotForm && (
          <form className="admin-form" onSubmit={addSlot}>
            <label>
              Select Service
              <select
                required
                value={slotForm.service_id}
                onChange={e => setSlotForm({
                  ...slotForm,
                  service_id: e.target.value
                })}
              >
                <option value="">Choose service</option>
                {services.map(service => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Start Date and Time
              <input
                type="datetime-local"
                required
                value={slotForm.start_at}
                onChange={e => setSlotForm({
                  ...slotForm,
                  start_at: e.target.value
                })}
              />
            </label>

            <label>
              End Date and Time
              <input
                type="datetime-local"
                required
                value={slotForm.end_at}
                onChange={e => setSlotForm({
                  ...slotForm,
                  end_at: e.target.value
                })}
              />
            </label>

            <label>
              Capacity
              <input
                type="number"
                min="1"
                required
                value={slotForm.capacity}
                onChange={e => setSlotForm({
                  ...slotForm,
                  capacity: e.target.value
                })}
              />
            </label>

            <button className="admin-action" type="submit">
              Create Appointment Slot
            </button>
          </form>
        )}
      </section>

      <section className="admin-section">
        <h2>Customer Bookings</h2>

        <div className="booking-filters">
          <input
            type="search"
            placeholder="Search customer, email, service or ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">All Bookings</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <p className="muted">
          Showing {filteredBookings.length} of {bookings.length} bookings
        </p>

        <div className="admin-table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Customer</th>
                <th>Email</th>
                <th>Service</th>
                <th>Appointment</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {filteredBookings.map(booking => (
                <tr key={booking.id}>
                  <td>{booking.id}</td>
                  <td>{booking.customer}</td>
                  <td>{booking.email}</td>
                  <td>{booking.service}</td>
                  <td>
                    {new Date(booking.start_at).toLocaleString()}
                  </td>
                  <td>
                    <span className={`badge ${booking.status}`}>
                      {booking.status}
                    </span>
                  </td>
                </tr>
              ))}

              {filteredBookings.length === 0 && (
                <tr>
                  <td colSpan="6">No matching bookings found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
