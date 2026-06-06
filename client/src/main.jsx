import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Home,
  Image as ImageIcon,
  Lock,
  LogOut,
  Menu,
  Phone,
  Scissors,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  XCircle,
} from "lucide-react";
import { api } from "./api.js";
import "./styles.css";

const BRAND_RED = "#990E0E";

const fallbackServices = [
  {
    id: "manicure",
    name: "Manicure",
    description: "Cuidado y embellecimiento de uñas y cutículas.",
    durationMinutes: 60,
    priceClp: 12000,
    imageUrl: "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "esmaltado-permanente",
    name: "Esmaltado Permanente",
    description: "Color intenso y brillo duradero hasta 3 semanas.",
    durationMinutes: 90,
    priceClp: 17000,
    imageUrl: "https://images.unsplash.com/photo-1610992015732-2449b76344bc?auto=format&fit=crop&w=900&q=80",
  },
];

function money(value) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value || 0);
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function statusText(value) {
  if (value === "confirmed") return "Confirmada";
  if (value === "cancelled") return "Cancelada";
  return "Pendiente";
}

function statusClass(value) {
  if (value === "confirmed") return "status confirmed";
  if (value === "cancelled") return "status cancelled";
  return "status pending";
}

function Logo({ compact = false }) {
  return (
    <div className={compact ? "logo compact" : "logo"}>
      <img src="/assets/logo-red.png" alt="Marcela Labbé" />
    </div>
  );
}

function Header({ active, setActive }) {
  const tabs = [
    { id: "home", label: "Inicio", icon: Home },
    { id: "services", label: "Servicios", icon: Scissors },
    { id: "booking", label: "Reservar", icon: Calendar },
    { id: "admin", label: "Admin", icon: Settings },
  ];

  return (
    <header className="topbar">
      <button className="brand" onClick={() => setActive("home")}>
        <Logo compact />
        <span>
          <b>MARCELA LABBÉ</b>
          <small>Nails Recovery</small>
        </span>
      </button>
      <nav className="tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActive(tab.id)} className={active === tab.id ? "active" : ""}>
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}

function HomePage({ setActive }) {
  return (
    <section className="hero page-grid">
      <div className="hero-card">
        <div className="hero-overlay" />
        <div className="hero-content">
          <Logo />
          <p className="eyebrow">Belleza. Salud. Confianza.</p>
          <h1>Agenda tu momento de cuidado</h1>
          <p>
            Reserva horas para manicure, pedicure, esmaltado permanente, uñas acrílicas, soft gel y Nails Recovery.
          </p>
          <div className="hero-actions">
            <button className="primary" onClick={() => setActive("booking")}><Calendar size={19} /> Reservar Hora</button>
            <button className="ghost" onClick={() => setActive("services")}>Ver Servicios</button>
          </div>
        </div>
      </div>

      <aside className="info-panel">
        <h2>Proyecto real operativo</h2>
        <p>
          Esta versión ya se conecta a una API, guarda reservas en SQLite, calcula disponibilidad y permite administración con login.
        </p>
        <div className="benefits">
          <Benefit icon={ShieldCheck} title="Marca" text="Rojo, negro y blanco corporativo." />
          <Benefit icon={Sparkles} title="Servicios" text="Fotos, precios y duración." />
          <Benefit icon={Clock} title="Agenda" text="Horas disponibles calculadas por backend." />
          <Benefit icon={Lock} title="Admin" text="Acceso privado para gestionar reservas." />
        </div>
      </aside>
    </section>
  );
}

function Benefit({ icon: Icon, title, text }) {
  return (
    <div className="benefit">
      <Icon size={22} />
      <b>{title}</b>
      <span>{text}</span>
    </div>
  );
}

function ServicesPage({ services, setSelectedServiceId, setActive }) {
  return (
    <section className="panel">
      <div className="section-title">
        <span>Servicios</span>
        <h2>Nuestros tratamientos</h2>
      </div>
      <div className="services-grid">
        {services.map((service) => (
          <article className="service-card" key={service.id}>
            <img src={service.imageUrl} alt={service.name} />
            <div>
              <h3>{service.name}</h3>
              <p>{service.description}</p>
              <div className="service-meta">
                <b>{money(service.priceClp)}</b>
                <span>{service.durationMinutes} min</span>
              </div>
              <button className="primary full" onClick={() => { setSelectedServiceId(service.id); setActive("booking"); }}>
                Reservar este servicio
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function BookingPage({ services, selectedServiceId, setSelectedServiceId }) {
  const [date, setDate] = useState(todayString());
  const [slots, setSlots] = useState([]);
  const [slot, setSlot] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [form, setForm] = useState({ clientName: "", phone: "", email: "", notes: "", whatsappConsent: true });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const service = services.find((item) => item.id === selectedServiceId) || services[0];

  useEffect(() => {
    if (!service?.id || !date) return;
    setLoadingSlots(true);
    setSlot("");
    setError("");
    api.getAvailability(date, service.id)
      .then((data) => setSlots(data.slots || []))
      .catch(() => {
        setSlots([]);
        setError("No se pudo cargar la disponibilidad. Revisa que la API esté encendida.");
      })
      .finally(() => setLoadingSlots(false));
  }, [date, service?.id]);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (!slot) {
      setError("Selecciona una hora disponible.");
      return;
    }
    try {
      await api.createBooking({
        serviceId: service.id,
        clientName: form.clientName,
        phone: form.phone,
        email: form.email,
        date,
        startTime: slot,
        notes: form.notes,
        whatsappConsent: form.whatsappConsent,
      });
      setMessage("Reserva registrada. Quedó pendiente de confirmación.");
      setForm({ clientName: "", phone: "", email: "", notes: "", whatsappConsent: true });
      const updated = await api.getAvailability(date, service.id);
      setSlots(updated.slots || []);
      setSlot("");
    } catch (err) {
      setError(err.message === "SLOT_NOT_AVAILABLE" || err.message === "SLOT_ALREADY_BOOKED" ? "Esa hora ya no está disponible." : "No se pudo registrar la reserva.");
    }
  }

  return (
    <section className="booking-layout">
      <form className="panel booking-form" onSubmit={submit}>
        <div className="section-title">
          <span>Reservar hora</span>
          <h2>Datos de la cita</h2>
        </div>

        <label>Servicio</label>
        <select value={service?.id || ""} onChange={(event) => setSelectedServiceId(event.target.value)}>
          {services.map((item) => <option key={item.id} value={item.id}>{item.name} · {money(item.priceClp)}</option>)}
        </select>

        <label>Fecha</label>
        <input type="date" value={date} min={todayString()} onChange={(event) => setDate(event.target.value)} />

        <label>Hora disponible</label>
        <div className="slot-grid">
          {loadingSlots && <p>Cargando horas...</p>}
          {!loadingSlots && slots.length === 0 && <p className="muted">No hay horas disponibles para esta fecha.</p>}
          {!loadingSlots && slots.map((item) => (
            <button type="button" key={item.startTime} className={slot === item.startTime ? "slot selected" : "slot"} onClick={() => setSlot(item.startTime)}>
              {item.startTime}
            </button>
          ))}
        </div>

        <label>Nombre completo</label>
        <input value={form.clientName} onChange={(event) => updateForm("clientName", event.target.value)} required minLength={2} placeholder="Nombre de la clienta" />

        <label>WhatsApp</label>
        <input value={form.phone} onChange={(event) => updateForm("phone", event.target.value)} required placeholder="+56 9 ..." />

        <label>Correo opcional</label>
        <input type="email" value={form.email} onChange={(event) => updateForm("email", event.target.value)} placeholder="correo@ejemplo.cl" />

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={form.whatsappConsent}
            onChange={(event) => updateForm("whatsappConsent", event.target.checked)}
          />
          <span>Acepto recibir confirmación y recordatorios de mi reserva por WhatsApp.</span>
        </label>

        <label>Observaciones</label>
        <textarea value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} placeholder="Color, diseño, retiro previo, etc." />

        {error && <p className="alert error">{error}</p>}
        {message && <p className="alert success">{message}</p>}

        <button className="primary full" type="submit"><CheckCircle2 size={19} /> Confirmar Reserva</button>
      </form>

      <aside className="summary-card">
        {service && <>
          <img src={service.imageUrl} alt={service.name} />
          <h3>{service.name}</h3>
          <p>{service.description}</p>
          <div className="summary-row"><Clock size={18} /> {service.durationMinutes} minutos</div>
          <div className="summary-row"><Calendar size={18} /> {date || "Selecciona fecha"}</div>
          <div className="summary-row"><CheckCircle2 size={18} /> {slot || "Selecciona hora"}</div>
          <b className="price">{money(service.priceClp)}</b>
        </>}
      </aside>
    </section>
  );
}

function AdminPage({ services, reloadServices }) {
  const [email, setEmail] = useState("admin@marcela-labbe.cl");
  const [password, setPassword] = useState("Cambiar123");
  const [bookings, setBookings] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const token = localStorage.getItem("admin_token");

  async function login(event) {
    event.preventDefault();
    setError("");
    try {
      const data = await api.login({ email, password });
      localStorage.setItem("admin_token", data.token);
      setMessage("Sesión iniciada.");
      loadBookings();
    } catch {
      setError("Credenciales incorrectas.");
    }
  }

  async function loadBookings() {
    try {
      const data = await api.getAdminBookings();
      setBookings(data);
    } catch {
      setError("No se pudieron cargar las reservas.");
    }
  }

  useEffect(() => {
    if (token) loadBookings();
  }, []);

  async function updateStatus(id, status) {
    await api.updateBookingStatus(id, status);
    await loadBookings();
  }

  async function remove(id) {
    await api.deleteBooking(id);
    await loadBookings();
  }

  function logout() {
    localStorage.removeItem("admin_token");
    setBookings([]);
    setMessage("Sesión cerrada.");
  }

  if (!token) {
    return (
      <section className="panel login-panel">
        <div className="section-title">
          <span>Administración</span>
          <h2>Ingreso privado</h2>
        </div>
        <form onSubmit={login}>
          <label>Email</label>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <label>Clave</label>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          {error && <p className="alert error">{error}</p>}
          {message && <p className="alert success">{message}</p>}
          <button className="primary full" type="submit"><Lock size={18} /> Entrar</button>
        </form>
      </section>
    );
  }

  const metrics = {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === "pending").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
  };

  return (
    <section className="admin-layout">
      <div className="panel">
        <div className="admin-header">
          <div className="section-title">
            <span>Administración</span>
            <h2>Agenda de reservas</h2>
          </div>
          <button className="ghost dark" onClick={logout}><LogOut size={18} /> Salir</button>
        </div>

        <div className="metrics">
          <Metric label="Total" value={metrics.total} />
          <Metric label="Pendientes" value={metrics.pending} />
          <Metric label="Confirmadas" value={metrics.confirmed} />
        </div>

        <button className="secondary" onClick={loadBookings}>Actualizar reservas</button>

        <div className="booking-list">
          {bookings.length === 0 && <p className="muted">No hay reservas registradas.</p>}
          {bookings.map((booking) => (
            <article className="booking-item" key={booking.id}>
              <div>
                <h3>{booking.clientName}</h3>
                <p>{booking.serviceName}</p>
                <p><Phone size={15} /> {booking.phone}</p>
                <p><Calendar size={15} /> {booking.date} · {booking.startTime} a {booking.endTime}</p>
                {booking.notes && <small>{booking.notes}</small>}
              </div>
              <div className="booking-actions">
                <span className={statusClass(booking.status)}>{statusText(booking.status)}</span>
                <button onClick={() => updateStatus(booking.id, "confirmed")} className="success-btn">Confirmar</button>
                <button onClick={() => updateStatus(booking.id, "cancelled")} className="secondary">Cancelar</button>
                <button onClick={() => remove(booking.id)} className="danger"><Trash2 size={17} /></button>
              </div>
            </article>
          ))}
        </div>
      </div>
      <ServiceAdmin services={services} reloadServices={reloadServices} />
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}

function ServiceAdmin({ services, reloadServices }) {
  const [form, setForm] = useState({ id: "", name: "", description: "", durationMinutes: 60, priceClp: 0, imageUrl: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function change(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function save(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await api.createService({
        id: form.id,
        name: form.name,
        description: form.description,
        durationMinutes: Number(form.durationMinutes),
        priceClp: Number(form.priceClp),
        imageUrl: form.imageUrl,
      });
      setMessage("Servicio creado.");
      setForm({ id: "", name: "", description: "", durationMinutes: 60, priceClp: 0, imageUrl: "" });
      reloadServices();
    } catch (err) {
      setError(err.message === "SERVICE_EXISTS" ? "Ya existe un servicio con ese ID." : "No se pudo crear el servicio.");
    }
  }

  async function toggleService(service) {
    await api.updateService(service.id, { isActive: !service.isActive });
    reloadServices();
  }

  return (
    <aside className="panel service-admin">
      <div className="section-title">
        <span>Servicios</span>
        <h2>Editar catálogo</h2>
      </div>
      <div className="compact-list">
        {services.map((service) => (
          <div key={service.id} className="compact-item">
            <span>{service.name}</span>
            <button className="secondary" onClick={() => toggleService(service)}>{service.isActive ? "Desactivar" : "Activar"}</button>
          </div>
        ))}
      </div>
      <form onSubmit={save} className="service-form">
        <h3>Crear nuevo servicio</h3>
        <label>ID interno</label>
        <input value={form.id} onChange={(event) => change("id", event.target.value.toLowerCase().replace(/\s+/g, "-"))} placeholder="ej: retiro-producto" required />
        <label>Nombre</label>
        <input value={form.name} onChange={(event) => change("name", event.target.value)} required />
        <label>Descripción</label>
        <textarea value={form.description} onChange={(event) => change("description", event.target.value)} required />
        <label>Duración minutos</label>
        <input type="number" value={form.durationMinutes} onChange={(event) => change("durationMinutes", event.target.value)} required />
        <label>Precio CLP</label>
        <input type="number" value={form.priceClp} onChange={(event) => change("priceClp", event.target.value)} required />
        <label>URL foto referencial</label>
        <input value={form.imageUrl} onChange={(event) => change("imageUrl", event.target.value)} placeholder="https://..." required />
        {error && <p className="alert error">{error}</p>}
        {message && <p className="alert success">{message}</p>}
        <button className="primary full" type="submit">Crear servicio</button>
      </form>
    </aside>
  );
}

function App() {
  const [active, setActive] = useState("home");
  const [services, setServices] = useState(fallbackServices);
  const [selectedServiceId, setSelectedServiceId] = useState(fallbackServices[0].id);
  const [apiNotice, setApiNotice] = useState("");

  async function loadServices() {
    try {
      const includeInactive = localStorage.getItem("admin_token") ? true : false;
      const data = await api.getServices(includeInactive);
      setServices(data.length ? data : fallbackServices);
      if (!selectedServiceId && data[0]) setSelectedServiceId(data[0].id);
      setApiNotice("");
    } catch {
      setApiNotice("API no disponible. La app muestra datos de referencia, pero las reservas requieren backend activo.");
      setServices(fallbackServices);
    }
  }

  useEffect(() => {
    loadServices();
  }, []);

  const activeServices = useMemo(() => services.filter((s) => s.isActive !== false), [services]);
  const catalogServices = active === "admin" ? services : activeServices;

  useEffect(() => {
    if (!catalogServices.find((s) => s.id === selectedServiceId) && catalogServices[0]) {
      setSelectedServiceId(catalogServices[0].id);
    }
  }, [catalogServices, selectedServiceId]);

  return (
    <div className="app">
      <Header active={active} setActive={setActive} />
      <main className="container">
        {apiNotice && <p className="global-alert"><XCircle size={18} /> {apiNotice}</p>}
        {active === "home" && <HomePage setActive={setActive} />}
        {active === "services" && <ServicesPage services={activeServices} setSelectedServiceId={setSelectedServiceId} setActive={setActive} />}
        {active === "booking" && <BookingPage services={activeServices} selectedServiceId={selectedServiceId} setSelectedServiceId={setSelectedServiceId} />}
        {active === "admin" && <AdminPage services={services} reloadServices={loadServices} />}
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
