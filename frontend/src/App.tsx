import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  AlertCircle, ArrowLeftRight, ArrowRight, Armchair,
  BadgeCheck, BedDouble, BusFront, CalendarDays, Check, CheckCircle2,
  ChevronRight, CircleHelp, Clock3, Compass, LayoutDashboard, LogOut, MapPin,
  Menu, Pencil, Plus, RefreshCw, Route, Search, ShieldCheck, Sparkles, Ticket,
  Trash2, TrendingUp, Users, X,
} from 'lucide-react';
import { api } from './api';
import type { Booking, Bus, BusCategory, BusPayload, DashboardStats, Passenger, SeatMap, User } from './types';

const categories: { value: BusCategory; label: string; short: string }[] = [
  { value: 'AC_SLEEPER', label: 'AC Sleeper', short: 'AC Sleeper' },
  { value: 'AC_SEATER_SEMI_SLEEPER', label: 'AC Seater (Semi-Sleeper)', short: 'AC Semi-Sleeper' },
  { value: 'NON_AC_SLEEPER', label: 'Non-AC Sleeper', short: 'Non-AC Sleeper' },
  { value: 'NON_AC_SEATER', label: 'Non-AC Seater', short: 'Non-AC Seater' },
];

type Page = 'search' | 'trips' | 'dashboard' | 'fleet' | 'bookings';
type Notice = { kind: 'success' | 'error' | 'info'; message: string };

function localDatePlus(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function money(value: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

function time(value: string): string {
  return value ? value.slice(0, 5) : '—';
}

function dateLabel(value: string, options?: Intl.DateTimeFormatOptions): string {
  if (!value) return '—';
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', options ?? { day: 'numeric', month: 'short', year: 'numeric' });
}

function availabilityLabel(availability: Bus['availability']): string {
  if (availability === 'FULL') return 'Fully booked';
  if (availability === 'LOW') return 'Filling fast';
  if (availability === 'LIMITED') return 'Seats available';
  return 'All seats open';
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(true);
  const [page, setPage] = useState<Page>('search');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    api.me().then((current) => {
      setUser(current);
      setPage(current.role === 'ADMIN' ? 'dashboard' : 'search');
    }).catch(() => setUser(null)).finally(() => setBooting(false));
  }, []);

  const flash = useCallback((message: string, kind: Notice['kind'] = 'success') => {
    setNotice({ message, kind });
    window.setTimeout(() => setNotice((current) => current?.message === message ? null : current), 4200);
  }, []);

  const onLogin = (current: User) => {
    setUser(current);
    setPage(current.role === 'ADMIN' ? 'dashboard' : 'search');
    flash(`Welcome back, ${current.displayName.split(' ')[0]}.`, 'success');
  };

  const onLogout = async () => {
    try { await api.logout(); } catch { /* The local session may already have expired. */ }
    setUser(null);
    setPage('search');
    flash('You have been signed out.', 'info');
  };

  if (booting) return <div className="app-loader"><div className="loader-mark"><BusFront size={27} /></div><span>Preparing your journey…</span></div>;
  if (!user) return <AuthScreen onLogin={onLogin} />;

  const admin = user.role === 'ADMIN';
  const navItems: { id: Page; label: string; icon: typeof Search }[] = admin
    ? [{ id: 'dashboard', label: 'Overview', icon: LayoutDashboard }, { id: 'fleet', label: 'Bus fleet', icon: BusFront }, { id: 'bookings', label: 'Reservations', icon: Ticket }]
    : [{ id: 'search', label: 'Find buses', icon: Search }, { id: 'trips', label: 'My journeys', icon: Ticket }];

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand-lockup" onClick={() => setPage(admin ? 'dashboard' : 'search')} aria-label="Mango home">
          <span className="brand-symbol"><BusFront size={22} strokeWidth={2.5} /></span>
          <span className="brand-word">mango<span>.</span><small>{admin ? 'OPERATIONS' : 'TRAVEL, MADE BETTER'}</small></span>
        </button>
        <button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle navigation"><Menu size={21} /></button>
        <nav className={`main-nav ${mobileNav ? 'nav-open' : ''}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return <button key={item.id} className={`nav-link ${page === item.id ? 'active' : ''}`} onClick={() => { setPage(item.id); setMobileNav(false); }}><Icon size={17} />{item.label}</button>;
          })}
        </nav>
        <div className="profile-area">
          <span className="profile-divider" />
          <div className="avatar">{user.displayName.charAt(0).toUpperCase()}</div>
          <div className="profile-copy"><strong>{user.displayName}</strong><span>{admin ? 'Administrator' : 'Traveller'}</span></div>
          <button className="icon-button logout-button" onClick={onLogout} title="Sign out" aria-label="Sign out"><LogOut size={18} /></button>
        </div>
      </header>

      <main className="page-wrap">
        {admin && page === 'dashboard' && <AdminDashboard onNavigate={setPage} />}
        {admin && page === 'fleet' && <AdminFleet flash={flash} />}
        {admin && page === 'bookings' && <AdminBookings flash={flash} />}
        {!admin && page === 'search' && <SearchPage user={user} flash={flash} onViewTrips={() => setPage('trips')} />}
        {!admin && page === 'trips' && <MyTrips flash={flash} />}
      </main>

      <footer className="site-footer"><div className="footer-brand"><span className="footer-dot" />Mango <span>·</span> journeys made thoughtful.</div><div>Designed for the road ahead <ArrowRight size={14} /></div></footer>
      {notice && <div className={`toast toast-${notice.kind}`} role="status"><span className="toast-icon">{notice.kind === 'success' ? <CheckCircle2 size={18} /> : notice.kind === 'error' ? <AlertCircle size={18} /> : <CircleHelp size={18} />}</span><span>{notice.message}</span><button onClick={() => setNotice(null)} aria-label="Dismiss notification"><X size={16} /></button></div>}
    </div>
  );
}

function AuthScreen({ onLogin }: { onLogin: (user: User) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'register') {
        const response = await api.register(username, displayName, password);
        setSuccess(response.message);
        setMode('login');
        setPassword('');
      } else {
        const current = await api.login(username, password);
        onLogin(current);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to continue. Please try again.');
    } finally { setBusy(false); }
  }

  return (
    <div className="auth-screen">
      <div className="auth-art">
        <div className="auth-art-orb orb-one" /><div className="auth-art-orb orb-two" />
        <div className="auth-art-top"><span className="brand-symbol"><BusFront size={22} strokeWidth={2.5} /></span><span className="auth-brand">mango<span>.</span></span><span className="auth-badge"><ShieldCheck size={14} /> A better way to travel</span></div>
        <div className="auth-art-content">
          <div className="eyebrow eyebrow-light"><Sparkles size={14} /> TAKE THE SCENIC ROUTE</div>
          <h1>Good journeys<br />start <em>here.</em></h1>
          <p>Thoughtfully planned bus travel, clear choices, and a smoother ride from search to seat.</p>
          <div className="auth-route-visual"><div className="route-stops"><span className="route-stop-dot" /><span className="route-line" /><span className="route-stop-dot destination" /></div><div className="route-visual-cities"><div><strong>Hyderabad</strong><span>Departure city</span></div><ArrowRight size={17} /><div><strong>Your next stop</strong><span>New memories ahead</span></div></div></div>
        </div>
        <div className="auth-art-bottom"><span>MADE FOR EVERY KIND OF GETAWAY</span><span>01 — MANGO TRAVEL</span></div>
      </div>
      <div className="auth-panel">
        <div className="auth-panel-top"><span className="auth-mobile-brand">mango<span>.</span></span><span className="auth-status"><span /> All systems ready</span></div>
        <div className="auth-form-wrap">
          <div className="form-kicker">{mode === 'login' ? 'WELCOME BACK' : 'JOIN THE JOURNEY'}</div>
          <h2>{mode === 'login' ? 'Sign in to Mango' : 'Create your account'}</h2>
          <p className="muted auth-description">{mode === 'login' ? 'Your next journey is only a few clicks away.' : 'Set up your traveller profile to book and manage trips.'}</p>
          <div className="auth-mode-tabs"><button className={mode === 'login' ? 'selected' : ''} onClick={() => { setMode('login'); setError(''); }}>Sign in</button><button className={mode === 'register' ? 'selected' : ''} onClick={() => { setMode('register'); setError(''); setSuccess(''); }}>Create account</button></div>
          {success && <div className="form-success"><CheckCircle2 size={16} />{success}</div>}
          <form onSubmit={submit} className="auth-form">
            {mode === 'register' && <label className="field-label">Full name<div className="input-wrap"><Users size={17} /><input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Aanya Sharma" autoComplete="name" required minLength={2} maxLength={100} /></div></label>}
            <label className="field-label">Username<div className="input-wrap"><UserIcon /><input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter your username" autoComplete="username" required minLength={3} maxLength={30} /></div></label>
            <label className="field-label">Password<div className="input-wrap"><LockIcon /><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === 'register' ? 'At least 8 characters' : 'Enter your password'} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required minLength={mode === 'register' ? 8 : 1} /></div></label>
            {error && <div className="form-error"><AlertCircle size={16} />{error}</div>}
            <button className="button button-primary auth-submit" disabled={busy}>{busy ? <Loader /> : mode === 'login' ? 'Sign in securely' : 'Create account'}<ArrowRight size={17} /></button>
          </form>
          <div className="secure-note"><ShieldCheck size={15} /><span>Your account is protected with encrypted password storage.</span></div>
          {mode === 'login' && <div className="demo-note"><strong>Role-based access</strong><span>Administrator access is configured on the backend.</span><small>Public registration creates traveller accounts only.</small></div>}
        </div>
        <div className="auth-panel-footer">© {new Date().getFullYear()} Mango Mobility <span>·</span> Travel better.</div>
      </div>
    </div>
  );
}

function SearchPage({ user, flash, onViewTrips }: { user: User; flash: (message: string, kind?: Notice['kind']) => void; onViewTrips: () => void }) {
  const [source, setSource] = useState('Hyderabad');
  const [destination, setDestination] = useState('');
  const [journeyDate, setJourneyDate] = useState(localDatePlus(1));
  const [category, setCategory] = useState<BusCategory | ''>('');
  const [sortBy, setSortBy] = useState<'recommended' | 'fare-low' | 'departure' | 'seats'>('recommended');
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searched, setSearched] = useState(false);
  const [resultsStale, setResultsStale] = useState(false);
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [seatMap, setSeatMap] = useState<SeatMap | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [deckView, setDeckView] = useState<'ALL' | 'LOWER' | 'UPPER'>('ALL');
  const [showPassengerModal, setShowPassengerModal] = useState(false);
  const [bookingBusy, setBookingBusy] = useState(false);
  const [seatLoading, setSeatLoading] = useState(false);
  const [lastBookings, setLastBookings] = useState<Booking[] | null>(null);

  const search = useCallback(async (event?: FormEvent) => {
    event?.preventDefault();
    if (source.trim() && destination.trim() && source.trim().toLocaleLowerCase() === destination.trim().toLocaleLowerCase()) {
      flash('Choose two different cities for your journey.', 'error');
      return;
    }
    setLoading(true); setSearched(true); setLastBookings(null);
    try {
      const results = await api.searchBuses({ source, destination, journeyDate, category });
      setBuses(results);
      setResultsStale(false);
      setSelectedBus(null); setSeatMap(null); setSelectedSeats([]);
    } catch (error) {
      setBuses([]);
      setResultsStale(false);
      setSelectedBus(null); setSeatMap(null); setSelectedSeats([]);
      flash(error instanceof Error ? error.message : 'Could not load routes. Check that the Mango backend is running.', 'error');
    } finally { setLoading(false); }
  }, [source, destination, journeyDate, category, flash]);

  useEffect(() => { void search(); }, []); // Initial route discovery.

  async function chooseCategory(nextCategory: BusCategory | '') {
    setCategory(nextCategory);
    setLoading(true); setSearched(true); setLastBookings(null);
    setSelectedBus(null); setSeatMap(null); setSelectedSeats([]);
    try {
      setBuses(await api.searchBuses({ source, destination, journeyDate, category: nextCategory }));
      setResultsStale(false);
    } catch (error) {
      setBuses([]);
      setResultsStale(false);
      flash(error instanceof Error ? error.message : 'Could not filter routes.', 'error');
    } finally { setLoading(false); }
  }

  const visibleBuses = useMemo(() => {
    const result = [...buses];
    if (sortBy === 'fare-low') return result.sort((a, b) => a.fare - b.fare);
    if (sortBy === 'departure') return result.sort((a, b) => time(a.departureTime).localeCompare(time(b.departureTime)));
    if (sortBy === 'seats') return result.sort((a, b) => b.availableSeats - a.availableSeats);
    return result.sort((a, b) => (a.availability === 'FULL' ? 1 : 0) - (b.availability === 'FULL' ? 1 : 0) || a.fare - b.fare);
  }, [buses, sortBy]);

  async function clearSearch() {
    setSource(''); setDestination(''); setCategory(''); setSearched(true); setLoading(true);
    setSelectedBus(null); setSeatMap(null); setSelectedSeats([]); setLastBookings(null);
    try { setBuses(await api.searchBuses({ source: '', destination: '', journeyDate, category: '' })); setResultsStale(false); }
    catch (error) { setBuses([]); setResultsStale(false); flash(error instanceof Error ? error.message : 'Could not load routes.', 'error'); }
    finally { setLoading(false); }
  }

  function markSearchCriteriaChanged() {
    setResultsStale(true);
    setSelectedBus(null);
    setSeatMap(null);
    setSelectedSeats([]);
    setLastBookings(null);
    setShowPassengerModal(false);
  }

  async function selectBus(bus: Bus) {
    setSelectedBus(bus); setSelectedSeats([]); setSeatMap(null); setSeatLoading(true); setLastBookings(null); setDeckView('ALL');
    setShowPassengerModal(false);
    try { setSeatMap(await api.seats(bus.id, journeyDate)); }
    catch (error) { flash(error instanceof Error ? error.message : 'Could not load seat map.', 'error'); setSelectedBus(null); }
    finally { setSeatLoading(false); }
  }

  function toggleSeat(seatNumber: number) {
    if (selectedSeats.includes(seatNumber)) {
      setSelectedSeats(selectedSeats.filter((s) => s !== seatNumber));
    } else {
      if (selectedSeats.length >= 5) {
        flash('You can choose up to 5 seats for booking.', 'info');
        return;
      }
      setSelectedSeats([...selectedSeats, seatNumber].sort((a, b) => a - b));
    }
  }

  async function confirmBooking(passengersList: Passenger[]) {
    if (!selectedBus || passengersList.length === 0 || bookingBusy) return;
    setBookingBusy(true);
    let bookedList: Booking[];
    try {
      bookedList = await api.book(selectedBus.id, journeyDate, passengersList);
    } catch (error) {
      flash(error instanceof Error ? error.message : 'Booking could not be completed.', 'error');
      try { setSeatMap(await api.seats(selectedBus.id, journeyDate)); } catch { /* Keep the last map */ }
      setBookingBusy(false);
      return;
    }

    setLastBookings(bookedList);
    setSelectedSeats([]);
    setShowPassengerModal(false);
    const refCode = bookedList[0].groupBookingCode || bookedList[0].bookingCode;
    flash(`Successfully booked ${bookedList.length} seat${bookedList.length > 1 ? 's' : ''}! Booking reference: ${refCode}`, 'success');
    try {
      const [nextMap, nextBuses] = await Promise.all([
        api.seats(selectedBus.id, journeyDate),
        api.searchBuses({ source, destination, journeyDate, category }),
      ]);
      setSeatMap(nextMap);
      setBuses(nextBuses);
    } catch {
      flash('Your booking is confirmed, but availability could not refresh. Use Refresh to reload the latest seats.', 'info');
    } finally {
      setBookingBusy(false);
    }
  }

  const activeSeats = seatMap?.seats ?? [];
  const hasUpperDeck = activeSeats.some((s) => s.deck === 'UPPER');
  const lowerSeats = activeSeats.filter((s) => s.deck === 'LOWER' || s.deck === 'MAIN');
  const upperSeats = activeSeats.filter((s) => s.deck === 'UPPER');
  const displayedSeats = deckView === 'LOWER' ? lowerSeats : deckView === 'UPPER' ? upperSeats : activeSeats;
  const routeDate = dateLabel(journeyDate, { weekday: 'long', day: 'numeric', month: 'long' });

  function renderSeatRows(seatList: SeatMap['seats']) {
    return Array.from({ length: Math.ceil(seatList.length / 4) }, (_, row) => {
      const rowSeats = seatList.slice(row * 4, row * 4 + 4);
      return (
        <div className="seat-row" key={row}>
          <div className="seat-pair">
            {rowSeats.slice(0, 2).map((seat) => {
              const selIdx = selectedSeats.indexOf(seat.seatNumber);
              return (
                <SeatButton
                  key={seat.seatNumber}
                  seat={seat}
                  selected={selIdx !== -1}
                  selectOrder={selIdx !== -1 ? selIdx + 1 : undefined}
                  onSelect={() => toggleSeat(seat.seatNumber)}
                />
              );
            })}
          </div>
          <span className="seat-aisle" />
          <div className="seat-pair">
            {rowSeats.slice(2, 4).map((seat) => {
              const selIdx = selectedSeats.indexOf(seat.seatNumber);
              return (
                <SeatButton
                  key={seat.seatNumber}
                  seat={seat}
                  selected={selIdx !== -1}
                  selectOrder={selIdx !== -1 ? selIdx + 1 : undefined}
                  onSelect={() => toggleSeat(seat.seatNumber)}
                />
              );
            })}
          </div>
        </div>
      );
    });
  }

  return (
    <div className="user-home">
      <section className="hero-banner">
        <div className="hero-grain" />
        <div className="hero-copy"><div className="eyebrow eyebrow-light"><span className="eyebrow-dot" /> YOUR NEXT CHAPTER STARTS ON THE ROAD</div><h1>Make room for<br /><em>somewhere new.</em></h1><p>Comfortable rides. Thoughtful details. More of what makes travel worth it.</p><div className="hero-perks"><span><BadgeCheck size={16} /> Easy booking</span><span><ShieldCheck size={16} /> Secure accounts</span><span><Armchair size={16} /> Choose up to 5 seats</span></div></div>
        <div className="hero-illustration"><div className="sun-disc" /><div className="hill hill-back" /><div className="hill hill-front" /><div className="hero-bus"><div className="hero-bus-windows"><i /><i /><i /><i /></div><div className="hero-bus-line" /><div className="hero-bus-lights" /><div className="wheel wheel-left" /><div className="wheel wheel-right" /></div><div className="hero-road"><span /><span /><span /></div><div className="floating-stamp"><span>TAKE THE</span><strong>LONG WAY</strong><em>sometimes.</em></div></div>
        <div className="hero-serial">MNG / 01</div>
      </section>

      <section className="search-card elevated-card">
        <div className="search-card-heading"><div><span className="form-kicker">PLAN YOUR ESCAPE</span><h2>Where would you like to go?</h2></div><span className="search-step"><span>01</span> SEARCH ROUTES</span></div>
        <form className="journey-form" onSubmit={search}>
          <label className="journey-field"><span className="journey-label"><MapPin size={15} /> FROM</span><input list="mango-cities" value={source} onChange={(e) => { setSource(e.target.value); markSearchCriteriaChanged(); }} placeholder="Departure city" /></label>
          <button type="button" className="swap-button" onClick={() => { setSource(destination); setDestination(source); markSearchCriteriaChanged(); }} aria-label="Swap locations"><ArrowLeftRight size={18} /></button>
          <label className="journey-field"><span className="journey-label"><MapPin size={15} /> TO</span><input list="mango-cities" value={destination} onChange={(e) => { setDestination(e.target.value); markSearchCriteriaChanged(); }} placeholder="Where to?" /></label>
          <datalist id="mango-cities"><option>Hyderabad</option><option>Bengaluru</option><option>Vijayawada</option><option>Chennai</option><option>Warangal</option><option>Visakhapatnam</option><option>Pune</option><option>Mumbai</option></datalist>
          <label className="journey-field date-field"><span className="journey-label"><CalendarDays size={15} /> JOURNEY DATE</span><input type="date" min={localDatePlus(0)} value={journeyDate} onChange={(e) => { setJourneyDate(e.target.value); markSearchCriteriaChanged(); }} required /></label>
          <label className="journey-field category-field"><span className="journey-label"><Armchair size={15} /> BUS TYPE</span><select value={category} onChange={(e) => { setCategory(e.target.value as BusCategory | ''); markSearchCriteriaChanged(); }}><option value="">All bus types</option>{categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <button className="button button-primary search-button" type="submit" disabled={loading}><Search size={18} /> Search buses</button>
        </form>
      </section>

      {lastBookings && lastBookings.length > 0 && (
        <section className="booking-success-card">
          <div className="success-mark"><Check size={22} /></div>
          <div className="success-copy">
            <span className="form-kicker">BOOKING CONFIRMED · {lastBookings.length} {lastBookings.length === 1 ? 'SEAT' : 'SEATS'}</span>
            <h3>Your journey is booked!</h3>
            <p>
              {lastBookings[0].busName} · {dateLabel(lastBookings[0].journeyDate)} · Seats: {lastBookings.map((b) => `${b.seatNumber} (${b.passengerName || b.displayName})`).join(', ')}
            </p>
          </div>
          <div className="success-code">
            <span>BOOKING REFERENCE</span>
            <strong>{lastBookings[0].groupBookingCode || lastBookings[0].bookingCode}</strong>
          </div>
          <button className="button button-secondary" onClick={onViewTrips}>View my journey <ArrowRight size={16} /></button>
        </section>
      )}

      <div className="route-filter-row" aria-label="Route filters">
        <div className="category-shortcuts" aria-label="Filter by bus category">
          <button type="button" className={`category-shortcut ${category === '' ? 'selected' : ''}`} onClick={() => void chooseCategory('')}>All buses</button>
          {categories.map((item) => <button type="button" key={item.value} className={`category-shortcut ${category === item.value ? 'selected' : ''}`} onClick={() => void chooseCategory(item.value)}>{item.short}</button>)}
        </div>
        <label className="sort-control"><span>Sort by</span><select value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}><option value="recommended">Recommended</option><option value="fare-low">Lowest fare</option><option value="departure">Departure time</option><option value="seats">Seats available</option></select></label>
      </div>

      <div className="results-layout">
        <section className="results-column">
          <div className="results-heading"><div><div className="form-kicker">THE ROUTES</div><h2>{searched && (source || destination) ? `${source || 'Anywhere'}${destination ? ` to ${destination}` : ''}` : 'Find your kind of getaway'}</h2><p>{routeDate} <span className="heading-dot">·</span> {loading ? 'Finding a comfortable ride…' : `${visibleBuses.length} ${visibleBuses.length === 1 ? 'route' : 'routes'} to explore`}</p></div><button className="subtle-button" onClick={() => void search()} disabled={loading}><RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh</button></div>
          {loading ? <div className="loading-list"><div className="skeleton route-skeleton" /><div className="skeleton route-skeleton" /></div> : resultsStale ? <div className="empty-state"><div className="empty-illustration"><Search size={30} /></div><h3>Update your search</h3><p>Your journey details changed. Search again to load routes and seat availability for the selected trip.</p><button className="button button-primary" onClick={() => void search()}><Search size={16} /> Search buses</button></div> : buses.length === 0 ? <div className="empty-state"><div className="empty-illustration"><Compass size={30} /></div><h3>No buses on this route yet</h3><p>Try a different city, date, or bus type to find your next trip.</p><button className="button button-secondary" onClick={() => void clearSearch()}>Clear search</button></div> : <div className="route-list">{visibleBuses.map((bus, index) => <BusCard key={bus.id} bus={bus} selected={selectedBus?.id === bus.id} onSelect={() => void selectBus(bus)} index={index} />)}</div>}
        </section>
        <aside className="seat-column">
          {!selectedBus ? <div className="seat-empty elevated-card"><div className="seat-empty-art"><div className="seat-empty-seat seat-a" /><div className="seat-empty-seat seat-b" /><div className="seat-empty-seat seat-c" /><div className="seat-empty-seat seat-d" /><span><Armchair size={23} /></span></div><div className="form-kicker">YOUR SPACE, YOUR WAY</div><h3>Pick the seat<br />that feels right.</h3><p>Select any route to view its seat map. Choose up to 5 seater seats or sleeper berths.</p><div className="seat-empty-foot"><span><i className="legend-dot green" /> Available</span><span><i className="legend-dot red" /> Booked</span></div></div> : <div className="seat-panel elevated-card">
            <div className="seat-panel-heading"><div><span className="form-kicker">STEP 02 · SELECT SEATS</span><h3>Choose your spot.</h3></div><button className="icon-button" onClick={() => { setSelectedBus(null); setSeatMap(null); setSelectedSeats([]); }} aria-label="Close seat selection"><X size={18} /></button></div>
            <div className="selected-route-mini"><div className="mini-bus-icon"><BusFront size={20} /></div><div className="selected-route-copy"><strong>{selectedBus.name}</strong><span>{selectedBus.source} <ArrowRight size={12} /> {selectedBus.destination}</span></div><strong className="mini-price">{money(selectedBus.fare)}</strong></div>
            <div className="bus-category-line"><span className="category-pill">{selectedBus.categoryLabel}</span><span className={`availability-pill availability-${seatMap?.availability ?? selectedBus.availability}`}>{(seatMap?.availability ?? selectedBus.availability) === 'AVAILABLE' ? 'All seats open' : (seatMap?.availability ?? selectedBus.availability) === 'FULL' ? 'Fully booked' : `${seatMap?.availableSeats ?? selectedBus.availableSeats} seats open`}</span></div>
            {seatLoading ? <div className="seat-loading"><Loader /><span>Preparing your seat map…</span></div> : <>
              {hasUpperDeck && (
                <div className="deck-switcher">
                  <button type="button" className={deckView === 'ALL' ? 'active' : ''} onClick={() => setDeckView('ALL')}>
                    All Decks ({activeSeats.length})
                  </button>
                  <button type="button" className={deckView === 'LOWER' ? 'active' : ''} onClick={() => setDeckView('LOWER')}>
                    Lower ({lowerSeats.length})
                  </button>
                  <button type="button" className={deckView === 'UPPER' ? 'active' : ''} onClick={() => setDeckView('UPPER')}>
                    Upper ({upperSeats.length})
                  </button>
                </div>
              )}
              <div className="seat-map-header"><span>FRONT OF BUS</span><span className="steering-wheel">◉</span></div>
              <div className="seat-grid-shell">
                {deckView === 'ALL' && hasUpperDeck ? (
                  <>
                    <div className="deck-section-title">
                      <span>LOWER DECK</span>
                      <span className="deck-tag">{lowerSeats[0]?.seatType === 'SLEEPER' ? 'Sleeper Berths' : 'Seater'}</span>
                    </div>
                    <div className="seat-grid">{renderSeatRows(lowerSeats)}</div>
                    <div className="deck-section-title" style={{ marginTop: '12px' }}>
                      <span>UPPER DECK</span>
                      <span className="deck-tag">Sleeper Berths</span>
                    </div>
                    <div className="seat-grid">{renderSeatRows(upperSeats)}</div>
                  </>
                ) : (
                  <div className="seat-grid">{renderSeatRows(displayedSeats)}</div>
                )}
              </div>
              <div className="seat-legend">
                <span><Armchair size={11} /> Seater</span>
                <span><BedDouble size={11} /> Sleeper</span>
                <span><i className="legend-dot green" /> Available</span>
                <span><i className="legend-dot blue" /> Selected</span>
                <span><i className="legend-dot red" /> Booked</span>
              </div>
              {seatMap?.availableSeats === 0 ? <div className="fully-booked-message"><AlertCircle size={17} /> This bus is fully booked for your date.</div> : <>
                <div className="selection-summary">
                  <div>
                    <span>SELECTED SEATS ({selectedSeats.length}/5)</span>
                    <strong>
                      {selectedSeats.length > 0 ? (
                        selectedSeats.map((s) => {
                          const st = seatMap?.seats.find((seat) => seat.seatNumber === s);
                          return `${s} (${st?.seatType === 'SLEEPER' ? 'Sleeper' : 'Seater'})`;
                        }).join(', ')
                      ) : 'Choose up to 5 seats'}
                    </strong>
                    {selectedSeats.length > 0 && (
                      <div className="selected-seats-tray">
                        {selectedSeats.map((seatNum) => {
                          const st = seatMap?.seats.find((seat) => seat.seatNumber === seatNum);
                          return (
                            <span key={seatNum} className="selected-seat-chip">
                              {st?.seatType === 'SLEEPER' ? <BedDouble size={11} /> : <Armchair size={11} />}
                              Seat {seatNum}
                              <button type="button" onClick={() => toggleSeat(seatNum)} aria-label={`Remove seat ${seatNum}`}><X size={10} /></button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div>
                    <span>TICKET FARE</span>
                    <strong>{money(selectedBus.fare * Math.max(1, selectedSeats.length))}</strong>
                    {selectedSeats.length > 1 && (
                      <small style={{ display: 'block', fontSize: '9px', color: '#687788' }}>
                        {selectedSeats.length} × {money(selectedBus.fare)}
                      </small>
                    )}
                  </div>
                </div>
                <button
                  className="button button-primary book-seat-button"
                  onClick={() => setShowPassengerModal(true)}
                  disabled={selectedSeats.length === 0 || bookingBusy || !seatMap || seatMap.availableSeats === 0}
                >
                  {selectedSeats.length === 0
                    ? 'Select up to 5 Seats to Book'
                    : <>Add Passenger Details ({selectedSeats.length} {selectedSeats.length === 1 ? 'seat' : 'seats'}) <ArrowRight size={17} /></>}
                </button>
                <p className="booking-hint"><ShieldCheck size={14} /> You can book up to 5 seats. No online payment is required.</p>
              </>}
            </>}
          </div>}
          <div className="support-note"><div className="support-icon"><CircleHelp size={17} /></div><div><strong>Need a hand?</strong><span>Good journeys start with clear answers.</span></div><ChevronRight size={16} /></div>
        </aside>
      </div>
      <section className="trust-strip"><div><span className="trust-icon"><ShieldCheck size={19} /></span><div><strong>Simple and secure</strong><span>Your account is protected.</span></div></div><div><span className="trust-icon"><Armchair size={19} /></span><div><strong>Your seat, your choice</strong><span>Choose up to 5 seats before booking.</span></div></div><div><span className="trust-icon"><Compass size={19} /></span><div><strong>More than a ride</strong><span>Make the journey count.</span></div></div></section>

      {showPassengerModal && selectedBus && (
        <PassengerDetailsModal
          bus={selectedBus}
          journeyDate={journeyDate}
          selectedSeats={selectedSeats}
          seatMap={seatMap}
          user={user}
          onClose={() => setShowPassengerModal(false)}
          onConfirm={confirmBooking}
          busy={bookingBusy}
        />
      )}
    </div>
  );
}

function PassengerDetailsModal({
  bus,
  journeyDate,
  selectedSeats,
  seatMap,
  user,
  onClose,
  onConfirm,
  busy,
}: {
  bus: Bus;
  journeyDate: string;
  selectedSeats: number[];
  seatMap: SeatMap | null;
  user: User;
  onClose: () => void;
  onConfirm: (passengers: Passenger[]) => Promise<void>;
  busy: boolean;
}) {
  const [passengers, setPassengers] = useState<Record<number, { name: string; age: string; gender: string }>>(() => {
    const initial: Record<number, { name: string; age: string; gender: string }> = {};
    selectedSeats.forEach((seatNum, idx) => {
      initial[seatNum] = {
        name: idx === 0 ? user.displayName : '',
        age: idx === 0 ? '25' : '',
        gender: 'MALE',
      };
    });
    return initial;
  });
  const [formError, setFormError] = useState<string | null>(null);

  const updateField = (seatNum: number, field: 'name' | 'age' | 'gender', value: string) => {
    setPassengers((prev) => ({
      ...prev,
      [seatNum]: {
        ...(prev[seatNum] || { name: '', age: '', gender: 'MALE' }),
        [field]: value,
      },
    }));
    setFormError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const list: Passenger[] = [];
    for (const seatNum of selectedSeats) {
      const p = passengers[seatNum] || { name: '', age: '', gender: 'MALE' };
      if (!p.name || p.name.trim().length < 2) {
        setFormError(`Please enter a valid passenger name (at least 2 letters) for Seat ${seatNum}.`);
        return;
      }
      const ageNum = parseInt(p.age, 10);
      if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
        setFormError(`Please enter a valid passenger age (1-120) for Seat ${seatNum}.`);
        return;
      }
      list.push({
        seatNumber: seatNum,
        name: p.name.trim(),
        age: ageNum,
        gender: p.gender || 'MALE',
      });
    }
    await onConfirm(list);
  };

  const totalFare = bus.fare * selectedSeats.length;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="passenger-modal" onClick={(e) => e.stopPropagation()}>
        <div className="passenger-modal-header">
          <div>
            <span className="form-kicker">STEP 03 · PASSENGER DETAILS</span>
            <h3>Add Passenger Details</h3>
            <p>{bus.name} · {bus.source} to {bus.destination} · {dateLabel(journeyDate)}</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close modal"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
          <div className="passenger-modal-body">
            <div className="passenger-trip-summary">
              <div>
                <strong>{bus.name} ({bus.code})</strong>
                <span>{bus.source} → {bus.destination} · Departure: {time(bus.departureTime)}</span>
                <span>Selected Seats: {selectedSeats.join(', ')} ({selectedSeats.length} {selectedSeats.length === 1 ? 'seat' : 'seats'})</span>
              </div>
              <div className="passenger-fare-total">
                <span>TOTAL FARE</span>
                <strong>{money(totalFare)}</strong>
                <small style={{ display: 'block', fontSize: '9px', color: '#167546' }}>No payment required</small>
              </div>
            </div>

            {formError && <div className="form-error"><AlertCircle size={15} /> {formError}</div>}

            {selectedSeats.map((seatNum, idx) => {
              const seatInfo = seatMap?.seats.find((s) => s.seatNumber === seatNum);
              const isSleeper = seatInfo?.seatType === 'SLEEPER';
              const details = passengers[seatNum] || { name: '', age: '', gender: 'MALE' };
              return (
                <div key={seatNum} className="passenger-card-item">
                  <div className="passenger-card-top">
                    <strong>Passenger {idx + 1}</strong>
                    <span className={`passenger-badge ${isSleeper ? 'badge-sleeper' : 'badge-seater'}`}>
                      {isSleeper ? <BedDouble size={12} /> : <Armchair size={12} />}
                      Seat {seatNum} · {isSleeper ? 'Sleeper Berth' : 'Seater'}
                    </span>
                  </div>
                  <div className="passenger-inputs-grid">
                    <div className="passenger-input-group">
                      <label>Full Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="Full Name"
                        value={details.name}
                        onChange={(e) => updateField(seatNum, 'name', e.target.value)}
                      />
                    </div>
                    <div className="passenger-input-group">
                      <label>Age *</label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        required
                        placeholder="Age"
                        value={details.age}
                        onChange={(e) => updateField(seatNum, 'age', e.target.value)}
                      />
                    </div>
                    <div className="passenger-input-group">
                      <label>Gender *</label>
                      <select
                        value={details.gender}
                        onChange={(e) => updateField(seatNum, 'gender', e.target.value)}
                      >
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="passenger-modal-footer">
            <button type="button" className="button button-secondary" onClick={onClose} disabled={busy}>
              Back to Seats
            </button>
            <button type="submit" className="button button-primary" disabled={busy}>
              {busy ? <><Loader /> Booking your seats…</> : <>Confirm Booking ({selectedSeats.length} {selectedSeats.length === 1 ? 'Seat' : 'Seats'}) <Check size={16} /></>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BusCard({ bus, selected, onSelect, index }: { bus: Bus; selected: boolean; onSelect: () => void; index: number }) {
  return <article className={`route-card ${selected ? 'route-card-selected' : ''}`} style={{ animationDelay: `${Math.min(index * 45, 200)}ms` }}>
    <div className="route-card-main"><div className="route-logo"><BusFront size={22} /></div><div className="route-bus-name"><h3>{bus.name}</h3><span>{bus.code} <span className="inline-dot">·</span> {bus.categoryLabel}</span></div><div className={`availability-badge availability-${bus.availability}`}><i />{availabilityLabel(bus.availability)}</div></div>
    <div className="route-card-timing"><div className="time-block"><strong>{time(bus.departureTime)}</strong><span>{bus.source}</span></div><div className="duration-block"><span><Clock3 size={12} /> Scheduled departure</span><div className="duration-line"><i /><span /><i /></div><span className="route-distance-label">MANGO ROUTE</span></div><div className="time-block time-end"><strong>{time(bus.arrivalTime)}</strong><span>{bus.destination}</span></div></div>
    <div className="route-card-bottom"><div className="route-availability-copy"><span className="available-count">{bus.availability === 'AVAILABLE' ? 'All' : bus.availableSeats}</span><span>{bus.availability === 'AVAILABLE' ? 'seats open' : bus.availability === 'FULL' ? 'fully booked' : 'seats available'}</span></div><div className="route-price"><span>ONE-WAY FARE</span><strong>{money(bus.fare)}</strong></div><button className={`button ${bus.availability === 'FULL' ? 'button-disabled' : selected ? 'button-selected' : 'button-secondary route-select-button'}`} disabled={bus.availability === 'FULL'} onClick={onSelect}>{bus.availability === 'FULL' ? 'Fully booked' : selected ? 'Seat map open' : 'Choose seat'} {!selected && bus.availability !== 'FULL' && <ChevronRight size={16} />}</button></div>
  </article>;
}

function SeatButton({ seat, selected, selectOrder, onSelect }: { seat: SeatMap['seats'][number]; selected: boolean; selectOrder?: number; onSelect: () => void }) {
  const booked = seat.status === 'BOOKED';
  const isSleeper = seat.seatType === 'SLEEPER';
  return (
    <button
      type="button"
      className={`seat-button ${isSleeper ? 'seat-sleeper' : 'seat-seater'} ${booked ? 'seat-booked' : 'seat-available'} ${selected ? 'seat-selected' : ''}`}
      disabled={booked}
      onClick={onSelect}
      aria-label={`Seat ${seat.seatNumber} (${isSleeper ? 'Sleeper Berth' : 'Seater'})${booked ? ', booked' : selected ? ', selected' : ', available'}`}
      title={booked ? 'Already booked' : `Choose ${isSleeper ? 'Sleeper Berth' : 'Seater'} ${seat.seatNumber}`}
    >
      {selected && selectOrder ? <span className="seat-order-tag">{selectOrder}</span> : null}
      {isSleeper ? <BedDouble size={13} /> : <Armchair size={13} />}
      <span>{seat.seatNumber}</span>
      <span className="seat-type-tag">{isSleeper ? 'SLEEPER' : 'SEATER'}</span>
    </button>
  );
}

function MyTrips({ flash }: { flash: (message: string, kind?: Notice['kind']) => void }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'CONFIRMED' | 'CANCELLED'>('ALL');

  const reload = useCallback(async () => {
    setLoading(true);
    try { setBookings(await api.myBookings()); }
    catch (error) { flash(error instanceof Error ? error.message : 'Could not load your journeys.', 'error'); }
    finally { setLoading(false); }
  }, [flash]);
  useEffect(() => { void reload(); }, [reload]);

  async function cancel(booking: Booking) {
    if (!window.confirm(`Cancel booking ${booking.bookingCode}? Seat ${booking.seatNumber} will become available again.`)) return;
    try { await api.cancelMyBooking(booking.bookingCode); flash(`Booking ${booking.bookingCode} was cancelled.`, 'success'); await reload(); }
    catch (error) { flash(error instanceof Error ? error.message : 'Could not cancel booking.', 'error'); }
  }

  const filtered = bookings.filter((booking) => filter === 'ALL' || booking.status === filter);
  return <section className="workspace-page">
    <PageHeading eyebrow="YOUR TRAVEL JOURNAL" title="My journeys" description="Every ticket in one place. Here's where your next story begins." action={<button className="button button-secondary" onClick={() => void reload()}><RefreshCw size={15} /> Refresh</button>} />
    <div className="stats-row compact-stats"><MiniStat icon={<Ticket size={17} />} value={bookings.filter((b) => b.status === 'CONFIRMED').length} label="Confirmed trips" /><MiniStat icon={<Compass size={17} />} value={bookings.filter((b) => b.status === 'CONFIRMED' && b.journeyDate >= localDatePlus(0)).length} label="Upcoming journeys" /><MiniStat icon={<CheckCircle2 size={17} />} value={bookings.filter((b) => b.status === 'CANCELLED').length} label="Cancelled" /></div>
    <div className="table-toolbar"><div className="filter-tabs">{(['ALL', 'CONFIRMED', 'CANCELLED'] as const).map((item) => <button className={filter === item ? 'active' : ''} key={item} onClick={() => setFilter(item)}>{item === 'ALL' ? 'All journeys' : item === 'CONFIRMED' ? 'Confirmed' : 'Cancelled'}</button>)}</div><span className="table-count">{filtered.length} {filtered.length === 1 ? 'journey' : 'journeys'}</span></div>
    {loading ? <LoadingPanel /> : filtered.length === 0 ? <EmptyPanel icon={<Ticket size={25} />} title="Your travel journal is waiting" description="Once you book a seat, your ticket and journey details will appear here." /> : <div className="booking-list">{filtered.map((booking) => <BookingCard key={booking.bookingCode} booking={booking} onCancel={() => void cancel(booking)} />)}</div>}
  </section>;
}

function BookingCard({ booking, onCancel }: { booking: Booking; onCancel: () => void }) {
  const isSleeper = booking.seatType === 'SLEEPER';
  return <article className="booking-card"><div className="booking-card-top"><div className="booking-code"><span className="ticket-icon"><Ticket size={17} /></span><div><span>BOOKING CODE</span><strong>{booking.bookingCode}</strong></div></div><span className={`status-pill status-${booking.status.toLowerCase()}`}><i />{booking.status === 'CONFIRMED' ? 'Confirmed' : 'Cancelled'}</span></div><div className="booking-route"><div><span>{time(booking.departureTime)}</span><strong>{booking.source}</strong></div><div className="booking-route-line"><span /><i /><span /></div><div><span>{time(booking.arrivalTime)}</span><strong>{booking.destination}</strong></div></div><div className="booking-card-bottom"><div><span>JOURNEY DATE</span><strong>{dateLabel(booking.journeyDate)}</strong></div><div><span>BUS & TYPE</span><strong>{booking.busName}</strong><small>{booking.categoryLabel}</small></div><div><span>PASSENGER</span><strong>{booking.passengerName || booking.displayName}</strong><small>{booking.passengerAge ? `Age ${booking.passengerAge} · ${booking.passengerGender}` : `@${booking.username}`}</small></div><div><span>SEAT & TYPE</span><strong>Seat {booking.seatNumber}</strong><small style={{ color: isSleeper ? '#bf4928' : '#1d7945', fontWeight: 700 }}>{isSleeper ? 'Sleeper Berth' : 'Seater'}</small></div><div><span>TICKET FARE</span><strong>{money(booking.fare)}</strong></div>{booking.status === 'CONFIRMED' && booking.journeyDate >= localDatePlus(0) && <button className="button button-quiet-danger" onClick={onCancel}>Cancel ticket</button>}</div></article>;
}

function AdminDashboard({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError('');
    Promise.all([api.dashboard(), api.adminBuses(localDatePlus(1)), api.allBookings()]).then(([nextStats, nextBuses, nextBookings]) => {
      if (!active) return;
      setStats(nextStats); setBuses(nextBuses); setBookings(nextBookings);
    }).catch((error: unknown) => {
      if (!active) return;
      setLoadError(error instanceof Error ? error.message : 'Could not load the operations overview.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reloadKey]);
  const recent = bookings.slice(0, 5);
  return <section className="workspace-page admin-workspace">
    <PageHeading eyebrow="MANGO OPERATIONS" title="Good day, administrator." description="A clear view of the fleet, bookings, and what's moving today." action={<button className="button button-primary" onClick={() => onNavigate('fleet')}><Plus size={16} /> Add a bus route</button>} />
    {loadError && <div className="dashboard-error" role="alert"><AlertCircle size={18} /><div><strong>We couldn't load the latest overview.</strong><span>{loadError}</span></div><button className="button button-secondary" onClick={() => setReloadKey((value) => value + 1)}><RefreshCw size={14} /> Try again</button></div>}
    <div className="dashboard-welcome"><div><span className="welcome-label"><Sparkles size={14} /> YOUR CONTROL ROOM</span><h2>Every journey, <em>in motion.</em></h2><p>Keep the fleet moving and the experience thoughtful, from first search to final stop.</p><button onClick={() => onNavigate('bookings')} className="welcome-link">Review latest reservations <ArrowRight size={15} /></button></div><div className="welcome-art"><div className="welcome-sun" /><div className="welcome-hill" /><div className="welcome-bus"><BusFront size={56} /></div><span className="welcome-art-label">MANGO / FLEET</span></div></div>
    <div className="section-title-row"><div><div className="form-kicker">AT A GLANCE</div><h2>Fleet overview</h2></div><span className="updated-note"><span /> {loading ? 'Updating insights' : 'Live from local data'}</span></div>
    <div className="stats-row">{loading ? <><div className="skeleton stat-skeleton" /><div className="skeleton stat-skeleton" /><div className="skeleton stat-skeleton" /><div className="skeleton stat-skeleton" /></> : <><StatCard icon={<BusFront size={19} />} value={stats?.activeRoutes ?? 0} label="Active routes" note={`${stats?.totalRoutes ?? 0} total in the fleet`} tint="green" /><StatCard icon={<Ticket size={19} />} value={stats?.confirmedBookings ?? 0} label="Confirmed bookings" note={`${stats?.upcomingBookings ?? 0} upcoming journeys`} tint="orange" /><StatCard icon={<Users size={19} />} value={stats?.totalUsers ?? 0} label="Registered travellers" note="Accounts on Mango" tint="blue" /><StatCard icon={<TrendingUp size={19} />} value={buses.filter((bus) => bus.enabled && bus.availability === 'AVAILABLE').length} label="Routes fully open" note="Tomorrow’s schedule" tint="purple" /></>}</div>
    <div className="admin-dashboard-grid"><section className="panel-card"><div className="panel-heading"><div><div className="form-kicker">THE FLEET</div><h3>Active bus routes</h3></div><button className="text-link" onClick={() => onNavigate('fleet')}>Manage fleet <ArrowRight size={14} /></button></div><div className="mini-route-list">{buses.filter((bus) => bus.enabled).slice(0, 5).map((bus) => <div className="mini-route-row" key={bus.id}><span className="mini-route-icon"><BusFront size={18} /></span><div className="mini-route-name"><strong>{bus.name}</strong><span>{bus.source} <ArrowRight size={11} /> {bus.destination}</span></div><div className="mini-route-time"><strong>{time(bus.departureTime)}</strong><span>{bus.code}</span></div><span className={`availability-badge tiny availability-${bus.availability}`}><i />{bus.availability === 'AVAILABLE' ? 'All open' : bus.availability === 'FULL' ? 'Full' : `${bus.availableSeats} open`}</span></div>)}{!loading && buses.filter((bus) => bus.enabled).length === 0 && <p className="inline-empty">No active routes. Add your first bus.</p>}</div></section>
      <section className="panel-card"><div className="panel-heading"><div><div className="form-kicker">RECENT ACTIVITY</div><h3>Latest reservations</h3></div><button className="text-link" onClick={() => onNavigate('bookings')}>All bookings <ArrowRight size={14} /></button></div><div className="recent-booking-list">{recent.map((booking) => <div className="recent-booking-row" key={booking.bookingCode}><span className={`recent-booking-avatar ${booking.status === 'CANCELLED' ? 'cancelled' : ''}`}>{booking.displayName?.charAt(0).toUpperCase() ?? 'T'}</span><div className="recent-booking-copy"><strong>{booking.displayName}</strong><span>{booking.source} to {booking.destination}</span></div><div className="recent-booking-money"><strong>{money(booking.fare)}</strong><span className={`tiny-status ${booking.status === 'CONFIRMED' ? 'ok' : 'off'}`}>{booking.status === 'CONFIRMED' ? 'Confirmed' : 'Cancelled'}</span></div></div>)}{!loading && recent.length === 0 && <p className="inline-empty">Your first booking will appear here.</p>}</div></section></div>
  </section>;
}

function AdminFleet({ flash }: { flash: (message: string, kind?: Notice['kind']) => void }) {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [editing, setEditing] = useState<Bus | null | 'NEW'>(null);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try { setBuses(await api.adminBuses(localDatePlus(1))); }
    catch (error) { flash(error instanceof Error ? error.message : 'Could not load the fleet.', 'error'); }
    finally { setLoading(false); }
  }, [flash]);
  useEffect(() => { void reload(); }, [reload]);

  const visible = useMemo(() => buses.filter((bus) => {
    const text = `${bus.name} ${bus.code} ${bus.source} ${bus.destination} ${bus.categoryLabel}`.toLowerCase();
    const matchesQuery = text.includes(query.toLowerCase());
    const matchesState = activeFilter === 'ALL' || (activeFilter === 'ACTIVE' ? bus.enabled : !bus.enabled);
    return matchesQuery && matchesState;
  }), [buses, query, activeFilter]);

  async function saveBus(payload: BusPayload, id?: number) {
    setSaving(true);
    try {
      if (id) await api.updateBus(id, payload); else await api.createBus(payload);
      flash(id ? 'Bus details updated successfully.' : 'New bus route added to the fleet.', 'success');
      setEditing(null); await reload();
    } catch (error) { flash(error instanceof Error ? error.message : 'Could not save bus details.', 'error'); }
    finally { setSaving(false); }
  }

  async function deleteBus(bus: Bus) {
    if (!window.confirm(`Remove ${bus.name} (${bus.code}) from active listings? Existing tickets are preserved.`)) return;
    try { const result = await api.deleteBus(bus.id); flash(result.message, 'success'); await reload(); }
    catch (error) { flash(error instanceof Error ? error.message : 'Could not remove route.', 'error'); }
  }

  return <section className="workspace-page">
    <PageHeading eyebrow="FLEET MANAGEMENT" title="The bus fleet" description="Keep routes, schedules, categories, and fares accurate for every traveller." action={<button className="button button-primary" onClick={() => setEditing('NEW')}><Plus size={16} /> Add bus route</button>} />
    <div className="fleet-intro"><div className="fleet-intro-icon"><Route size={22} /></div><div><strong>Thoughtful operations make better journeys.</strong><span>Update the route details here. Seat capacity is a fixed backend rule and is not editable from the fleet screen.</span></div><span className="fleet-intro-count">{buses.filter((b) => b.enabled).length}<small>active</small></span></div>
    <div className="fleet-toolbar"><div className="table-search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search buses, codes or routes…" /></div><div className="filter-tabs">{(['ACTIVE', 'INACTIVE', 'ALL'] as const).map((filter) => <button key={filter} className={activeFilter === filter ? 'active' : ''} onClick={() => setActiveFilter(filter)}>{filter === 'ACTIVE' ? 'Active' : filter === 'INACTIVE' ? 'Inactive' : 'All routes'}</button>)}</div><button className="icon-button border-button" onClick={() => void reload()} aria-label="Refresh fleet"><RefreshCw size={17} /></button></div>
    {loading ? <LoadingPanel /> : visible.length === 0 ? <EmptyPanel icon={<BusFront size={25} />} title="No routes match your search" description="Try another keyword, or add a new bus route to the fleet." action={<button className="button button-primary" onClick={() => setEditing('NEW')}><Plus size={16} /> Add bus route</button>} /> : <div className="fleet-table-wrap"><table className="data-table fleet-table"><thead><tr><th>BUS & ROUTE</th><th>BUS CATEGORY</th><th>SCHEDULE</th><th>FARE</th><th>AVAILABILITY</th><th>STATUS</th><th>MANAGE</th></tr></thead><tbody>{visible.map((bus) => <tr key={bus.id}><td><div className="table-bus"><span className="table-bus-icon"><BusFront size={19} /></span><span><strong>{bus.name}</strong><small>{bus.code}</small><small className="table-route-label">{bus.source} <ArrowRight size={10} /> {bus.destination}</small></span></div></td><td><span className="category-pill">{bus.categoryLabel}</span></td><td><div className="schedule-cell"><strong>{time(bus.departureTime)} <ArrowRight size={12} /> {time(bus.arrivalTime)}</strong><small>Daily schedule</small></div></td><td><strong className="fare-cell">{money(bus.fare)}</strong></td><td><span className={`availability-badge availability-${bus.availability}`}><i />{bus.availability === 'AVAILABLE' ? 'All open' : bus.availability === 'FULL' ? 'Fully booked' : `${bus.availableSeats} open`}</span></td><td><span className={`status-pill ${bus.enabled ? 'status-active' : 'status-inactive'}`}><i />{bus.enabled ? 'Active' : 'Inactive'}</span></td><td><div className="table-actions"><button className="icon-button small-icon-button" onClick={() => setEditing(bus)} title="Edit route" aria-label={`Edit ${bus.name}`}><Pencil size={15} /></button>{bus.enabled && <button className="icon-button small-icon-button danger-icon-button" onClick={() => void deleteBus(bus)} title="Delete route" aria-label={`Delete ${bus.name}`}><Trash2 size={15} /></button>}</div></td></tr>)}</tbody></table></div>}
    {editing && <BusModal bus={editing === 'NEW' ? null : editing} onClose={() => setEditing(null)} onSave={saveBus} saving={saving} />}
  </section>;
}

function BusModal({ bus, onClose, onSave, saving }: { bus: Bus | null; onClose: () => void; onSave: (payload: BusPayload, id?: number) => Promise<void>; saving: boolean }) {
  const [form, setForm] = useState<BusPayload>({
    name: bus?.name ?? '', code: bus?.code ?? '', source: bus?.source ?? '', destination: bus?.destination ?? '',
    departureTime: time(bus?.departureTime ?? '21:00'), arrivalTime: time(bus?.arrivalTime ?? '07:00'),
    category: bus?.category ?? 'AC_SLEEPER', fare: bus?.fare ?? 799, enabled: bus?.enabled ?? true,
  });
  const [formError, setFormError] = useState('');
  function update<K extends keyof BusPayload>(key: K, value: BusPayload[K]) { setForm((current) => ({ ...current, [key]: value })); }
  async function submit(event: FormEvent) {
    event.preventDefault(); setFormError('');
    if (form.source.trim().toLowerCase() === form.destination.trim().toLowerCase()) { setFormError('Source and destination must be different.'); return; }
    if (!form.fare || form.fare <= 0) { setFormError('Fare must be greater than zero.'); return; }
    await onSave({ ...form, name: form.name.trim(), code: form.code.trim().toUpperCase(), source: form.source.trim(), destination: form.destination.trim() }, bus?.id);
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><section className="bus-modal" role="dialog" aria-modal="true" aria-labelledby="bus-modal-title"><div className="modal-heading"><div><span className="form-kicker">{bus ? 'KEEP DETAILS CURRENT' : 'GROW THE FLEET'}</span><h2 id="bus-modal-title">{bus ? 'Edit bus route' : 'Add a bus route'}</h2><p>Accurate information helps travellers choose with confidence.</p></div><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={19} /></button></div><form onSubmit={submit} className="bus-form"><label className="field-label">Bus name<input className="form-control" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="e.g. Mango Nightliner" required maxLength={100} /></label><label className="field-label">Bus code<input className="form-control uppercase-input" value={form.code} onChange={(e) => update('code', e.target.value)} placeholder="MN-201" required maxLength={24} /></label><label className="field-label">Source city<input className="form-control" value={form.source} onChange={(e) => update('source', e.target.value)} placeholder="Departure city" required maxLength={80} /></label><label className="field-label">Destination city<input className="form-control" value={form.destination} onChange={(e) => update('destination', e.target.value)} placeholder="Arrival city" required maxLength={80} /></label><label className="field-label">Departure time<input className="form-control" type="time" value={form.departureTime} onChange={(e) => update('departureTime', e.target.value)} required /></label><label className="field-label">Arrival time<input className="form-control" type="time" value={form.arrivalTime} onChange={(e) => update('arrivalTime', e.target.value)} required /></label><label className="field-label form-wide">Bus category<select className="form-control" value={form.category} onChange={(e) => update('category', e.target.value as BusCategory)}>{categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label className="field-label">Ticket fare (₹)<input className="form-control" type="number" min="1" step="1" value={form.fare} onChange={(e) => update('fare', Number(e.target.value))} required /></label><label className="field-label status-switch"><span>Route status</span><span className="switch-row"><button type="button" className={`switch ${form.enabled ? 'switch-on' : ''}`} aria-pressed={form.enabled} onClick={() => update('enabled', !form.enabled)}><i /></button><span>{form.enabled ? 'Active and bookable' : 'Hidden from search'}</span></span></label><div className="form-rule-note form-wide"><ShieldCheck size={16} /><span>Seat capacity is enforced in the backend and cannot be changed from this form.</span></div>{formError && <div className="form-error form-wide"><AlertCircle size={16} />{formError}</div>}<div className="modal-actions form-wide"><button type="button" className="button button-secondary" onClick={onClose} disabled={saving}>Cancel</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? <Loader /> : <Check size={16} />}{bus ? 'Save changes' : 'Add bus route'}</button></div></form></section></div>;
}

function AdminBookings({ flash }: { flash: (message: string, kind?: Notice['kind']) => void }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'CONFIRMED' | 'CANCELLED'>('ALL');
  const reload = useCallback(async () => { setLoading(true); try { setBookings(await api.allBookings()); } catch (error) { flash(error instanceof Error ? error.message : 'Could not load reservations.', 'error'); } finally { setLoading(false); } }, [flash]);
  useEffect(() => { void reload(); }, [reload]);
  const filtered = bookings.filter((booking) => {
    const text = `${booking.bookingCode} ${booking.username} ${booking.displayName} ${booking.busName} ${booking.source} ${booking.destination}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (filter === 'ALL' || booking.status === filter);
  });
  async function cancel(booking: Booking) {
    if (!window.confirm(`Cancel booking ${booking.bookingCode} for ${booking.displayName}?`)) return;
    try { await api.cancelBooking(booking.bookingCode); flash(`Booking ${booking.bookingCode} cancelled.`, 'success'); await reload(); }
    catch (error) { flash(error instanceof Error ? error.message : 'Could not cancel booking.', 'error'); }
  }
  return <section className="workspace-page">
    <PageHeading eyebrow="RESERVATION MANAGEMENT" title="Every seat has a story." description="Find bookings, verify journey details, and help travellers when plans change." action={<button className="button button-secondary" onClick={() => void reload()}><RefreshCw size={15} /> Refresh</button>} />
    <div className="reservation-stats"><div><span className="stats-icon stats-green"><CheckCircle2 size={17} /></span><span><strong>{bookings.filter((b) => b.status === 'CONFIRMED').length}</strong><small>Confirmed reservations</small></span></div><div><span className="stats-icon stats-red"><X size={17} /></span><span><strong>{bookings.filter((b) => b.status === 'CANCELLED').length}</strong><small>Cancelled reservations</small></span></div><div><span className="stats-icon stats-orange"><Ticket size={17} /></span><span><strong>{bookings.length}</strong><small>Total tickets recorded</small></span></div></div>
    <div className="fleet-toolbar reservations-toolbar"><div className="table-search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search booking code, traveller or route…" /></div><div className="filter-tabs">{(['ALL', 'CONFIRMED', 'CANCELLED'] as const).map((item) => <button className={filter === item ? 'active' : ''} key={item} onClick={() => setFilter(item)}>{item === 'ALL' ? 'All' : item === 'CONFIRMED' ? 'Confirmed' : 'Cancelled'}</button>)}</div></div>
    {loading ? <LoadingPanel /> : filtered.length === 0 ? <EmptyPanel icon={<Ticket size={25} />} title="No reservations found" description="Bookings will appear here as travellers reserve seats on active routes." /> : <div className="fleet-table-wrap"><table className="data-table reservation-table"><thead><tr><th>BOOKING</th><th>PASSENGER / TRAVELLER</th><th>ROUTE</th><th>JOURNEY</th><th>SEAT & TYPE</th><th>FARE</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>{filtered.map((booking) => <tr key={booking.bookingCode}><td><strong className="booking-ref">{booking.bookingCode}</strong><small className="table-subtext">{booking.busCode}</small></td><td><strong>{booking.passengerName || booking.displayName}</strong><small className="table-subtext">{booking.passengerAge ? `Age ${booking.passengerAge} · ${booking.passengerGender}` : `@${booking.username}`}</small></td><td><div className="table-route-compact"><strong>{booking.source} <ArrowRight size={11} /> {booking.destination}</strong><small>{booking.busName}</small></div></td><td><strong>{dateLabel(booking.journeyDate, { day: 'numeric', month: 'short' })}</strong><small className="table-subtext">{time(booking.departureTime)}</small></td><td><span className={`seat-number-pill ${booking.seatType === 'SLEEPER' ? 'seat-pill-sleeper' : 'seat-pill-seater'}`}>{booking.seatNumber} <small style={{ fontSize: '7.5px', marginLeft: '2px', opacity: 0.85 }}>{booking.seatType === 'SLEEPER' ? 'SL' : 'ST'}</small></span></td><td><strong>{money(booking.fare)}</strong></td><td><span className={`status-pill status-${booking.status.toLowerCase()}`}><i />{booking.status === 'CONFIRMED' ? 'Confirmed' : 'Cancelled'}</span></td><td>{booking.status === 'CONFIRMED' && booking.journeyDate >= localDatePlus(0) ? <button className="button button-quiet-danger" onClick={() => void cancel(booking)}>Cancel</button> : <span className="no-action">—</span>}</td></tr>)}</tbody></table></div>}
  </section>;
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-heading"><div><div className="form-kicker">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action && <div className="page-heading-action">{action}</div>}</div>;
}

function StatCard({ icon, value, label, note, tint }: { icon: ReactNode; value: number; label: string; note: string; tint: string }) {
  return <div className="stat-card"><span className={`stat-icon stat-${tint}`}>{icon}</span><div className="stat-main"><strong>{value.toLocaleString('en-IN')}</strong><span>{label}</span></div><small>{note}</small></div>;
}

function MiniStat({ icon, value, label }: { icon: ReactNode; value: number; label: string }) {
  return <div className="mini-stat"><span>{icon}</span><strong>{value}</strong><small>{label}</small></div>;
}

function EmptyPanel({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return <div className="empty-state workspace-empty"><div className="empty-illustration">{icon}</div><h3>{title}</h3><p>{description}</p>{action}</div>;
}

function LoadingPanel() {
  return <div className="loading-panel"><Loader /><span>Loading Mango data…</span></div>;
}

function UserIcon() { return <Users size={17} />; }
function LockIcon() { return <ShieldCheck size={17} />; }
function Loader() { return <span className="button-loader" aria-label="Loading" />; }

export default App;
