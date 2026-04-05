import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { io } from "socket.io-client";
import { api } from "../services/api";
import DonationCard from "../components/DonationCard";
import { useAuth } from "../services/AuthContext";

function MapLocationPicker({ position, onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    }
  });
  if (!position) return null;
  return <CircleMarker center={position} radius={10} pathOptions={{ color: "#3b82f6" }} />;
}

function Recenter({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, 13);
  }, [map, position]);
  return null;
}

function formatRelativeTime(dateString) {
  if (!dateString) return "just now";
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMin = Math.max(1, Math.round(diffMs / 60000));
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  return `${Math.round(diffHours / 24)} day ago`;
}

const trackingSteps = ["available", "accepted", "picked", "delivered"];

export default function DonorDashboard() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [addressQuery, setAddressQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [liveEvents, setLiveEvents] = useState([]);
  const socketRef = useRef(null);
  const [form, setForm] = useState({
    title: "",
    foodType: "veg",
    quantity: 10,
    cookedTime: "",
    expiryTime: "",
    latitude: "",
    longitude: "",
    address: "",
    description: ""
  });

  const load = async () => {
    const { data } = await api.get("/donations/mine");
    setList(data);
  };
  useEffect(() => {
    load();
  }, []);

  const socketUrl = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");

  useEffect(() => {
    if (!user?._id) return;

    const socket = io(socketUrl, { transports: ["websocket"] });
    socketRef.current = socket;

    const refreshMine = async payload => {
      const donorId = typeof payload.donor === "string" ? payload.donor : payload.donor?._id;
      if (donorId !== user._id) return;

      await load();

      setLiveEvents(prev => [
        {
          id: `${Date.now()}-${payload._id}-${payload.status}`,
          title: payload.title,
          status: payload.status,
          time: new Date().toISOString()
        },
        ...prev.slice(0, 5)
      ]);
    };

    socket.on("donationUpdated", payload => {
      refreshMine(payload);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [socketUrl, user?._id]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
      setForm(prev => ({
          ...prev,
          latitude: String(pos.coords.latitude),
          longitude: String(pos.coords.longitude)
        }));
      },
      () => {
        alert("Unable to access your location. Please allow location permission.");
      }
    );
  };

  const searchByAddress = async () => {
    if (!addressQuery.trim()) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(addressQuery)}`
      );
      const data = await res.json();
      if (!Array.isArray(data) || !data.length) {
        alert("Location not found. Try a more specific address.");
        return;
      }
      setForm(prev => ({ ...prev, latitude: String(data[0].lat), longitude: String(data[0].lon), address: addressQuery }));
    } catch (_err) {
      alert("Address lookup failed. Try again.");
    }
  };

  const submit = async e => {
    e.preventDefault();
    if (!form.latitude || !form.longitude) {
      alert("Pick a location on map, use current location, or search address.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/donations", form);
      setForm({
        title: "",
        foodType: "veg",
        quantity: 10,
        cookedTime: "",
        expiryTime: "",
        latitude: "",
        longitude: "",
        address: "",
        description: ""
      });
      setAddressQuery("");
      load();
    } finally {
      setSubmitting(false);
    }
  };

  const onStatusChange = async (id, status) => {
    await api.put(`/donations/${id}/status`, { status });
    load();
  };

  const activeDonations = useMemo(
    () => list.filter(item => ["available", "accepted", "picked"].includes(item.status)),
    [list]
  );
  const completedDonations = useMemo(
    () => list.filter(item => ["delivered", "cancelled"].includes(item.status)),
    [list]
  );
  const urgentDonations = useMemo(
    () =>
      list.filter(item => {
        const left = new Date(item.expiryTime).getTime() - Date.now();
        return left > 0 && left <= 3 * 3600000;
      }),
    [list]
  );

  const stats = [
    { label: "Total listed", value: list.length, tone: "warm" },
    { label: "Active donations", value: activeDonations.length, tone: "calm" },
    { label: "Urgent expiry", value: urgentDonations.length, tone: "alert" },
    { label: "Completed", value: completedDonations.length, tone: "soft" }
  ];

  const selectedPosition =
    form.latitude && form.longitude ? [Number(form.latitude), Number(form.longitude)] : [13.0827, 80.2707];
  const liveTrackedDonations = useMemo(
    () => list.filter(item => ["accepted", "picked"].includes(item.status)),
    [list]
  );

  return (
    <div className="donor-dashboard">
      <section className="dashboard-hero card">
        <div className="dashboard-hero-copy">
          <span className="eyebrow">Donor workspace</span>
          <h2>{user?.name ? `${user.name}, keep your donations organized and visible to NGOs.` : "Manage every donation from one polished dashboard."}</h2>
          <p className="muted">
            Publish surplus food quickly, share the exact pickup location, and follow every donation from listing to delivery.
          </p>
          <div className="row">
            <Link className="btn btn-secondary" to="/donor/history">
              View donation history
            </Link>
          </div>
        </div>
        <div className="stats-grid">
          {stats.map(item => (
            <div className={`stat-card stat-${item.tone}`} key={item.label}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-layout">
        <div className="stack">
          <form className="card" onSubmit={submit}>
            <div className="section-title-row">
              <div>
                <h3>Create a donation</h3>
                <p className="muted">Fill in food details, set pickup timing, and pin the exact location.</p>
              </div>
              <button className="btn btn-primary" type="submit" disabled={submitting}>
                {submitting ? "Posting..." : "Post donation"}
              </button>
            </div>

            <div className="map-wrap">
              <MapContainer center={selectedPosition} zoom={12} className="map-box">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapLocationPicker
                  position={form.latitude && form.longitude ? [Number(form.latitude), Number(form.longitude)] : null}
                  onPick={(pickedLat, pickedLng) =>
                    setForm(prev => ({ ...prev, latitude: String(pickedLat), longitude: String(pickedLng) }))
                  }
                />
                <Recenter position={form.latitude && form.longitude ? [Number(form.latitude), Number(form.longitude)] : null} />
              </MapContainer>
            </div>

            <div className="form-grid">
              <label className="field-group">
                <span>Donation Title</span>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Donation title" required />
              </label>
              <label className="field-group">
                <span>Food Type</span>
                <select value={form.foodType} onChange={e => setForm({ ...form, foodType: e.target.value })}>
                  <option value="veg">Veg</option>
                  <option value="non-veg">Non-Veg</option>
                </select>
              </label>
              <label className="field-group">
                <span>Serves</span>
                <input
                  type="number"
                  min="1"
                  value={form.quantity}
                  onChange={e => setForm({ ...form, quantity: Number(e.target.value) })}
                  placeholder="Serves"
                  required
                />
              </label>
              <label className="field-group">
                <span>Prepared Time</span>
                <input type="datetime-local" value={form.cookedTime} onChange={e => setForm({ ...form, cookedTime: e.target.value })} required />
              </label>
              <label className="field-group">
                <span>Expiry Time</span>
                <input type="datetime-local" value={form.expiryTime} onChange={e => setForm({ ...form, expiryTime: e.target.value })} required />
              </label>
              <label className="field-group">
                <span>Latitude</span>
                <input value={form.latitude} placeholder="Latitude" readOnly />
              </label>
              <label className="field-group">
                <span>Longitude</span>
                <input value={form.longitude} placeholder="Longitude" readOnly />
              </label>
              <label className="field-group full">
                <span>Search Address</span>
                <input
                  value={addressQuery}
                  onChange={e => setAddressQuery(e.target.value)}
                  placeholder="Search address (e.g. Karur, Tamil Nadu)"
                />
              </label>
              <label className="field-group full">
                <span>Pickup Address</span>
                <input
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  placeholder="Pickup address"
                />
              </label>
              <label className="field-group full">
                <span>Notes</span>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Add notes like packaging, pickup instructions, or portion details"
                  rows={4}
                />
              </label>
            </div>

            <div className="row">
              <button className="btn btn-secondary" type="button" onClick={useMyLocation}>
                Use my location
              </button>
              <button className="btn btn-secondary" type="button" onClick={searchByAddress}>
                Search address
              </button>
            </div>
          </form>

          <div className="card">
            <div className="section-title-row">
              <div>
                <h3>Active donations</h3>
                <p className="muted">These listings are live or currently moving through pickup and delivery.</p>
              </div>
            </div>
            {activeDonations.length === 0 && <p className="muted">No active donations yet.</p>}
            <div className="stack">
              {activeDonations.map(donation => (
                <DonationCard key={donation._id} donation={donation} onStatusChange={onStatusChange} />
              ))}
            </div>
          </div>

        </div>

        <aside className="stack">
          <div className="card">
            <div className="section-title-row">
              <div>
                <h3>Real-time tracking</h3>
                <p className="muted">Watch live status changes as NGOs accept, pick up, and deliver your food.</p>
              </div>
            </div>
            {liveTrackedDonations.length === 0 && <p className="muted">Live tracking will appear here once an NGO accepts a donation.</p>}
            <div className="tracking-list">
              {liveTrackedDonations.map(donation => (
                <article className="tracking-card" key={donation._id}>
                  <div className="row">
                    <strong>{donation.title}</strong>
                    <span className="status-badge">{donation.status}</span>
                  </div>
                  <div className="timeline-steps">
                    {trackingSteps.map(step => {
                      const currentIndex = trackingSteps.indexOf(donation.status);
                      const stepIndex = trackingSteps.indexOf(step);
                      const isDone = currentIndex >= stepIndex;
                      return (
                        <div className={`timeline-step${isDone ? " timeline-step-done" : ""}`} key={step}>
                          <span className="timeline-dot" />
                          <small>{step}</small>
                        </div>
                      );
                    })}
                  </div>
                  <p className="muted">
                    {donation.status === "accepted" ? "An NGO has accepted this donation and is preparing pickup." : "Food has been picked up and is on the way."}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="section-title-row">
              <div>
                <h3>Live updates</h3>
                <p className="muted">Instant status events from your donation activity.</p>
              </div>
            </div>
            {liveEvents.length === 0 && <p className="muted">When a donation status changes, you’ll see it here immediately.</p>}
            <div className="stack">
              {liveEvents.map(event => (
                <div className="feed-item" key={event.id}>
                  <strong>{event.title}</strong>
                  <span>Status changed to {event.status}</span>
                  <small>{formatRelativeTime(event.time)}</small>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="section-title-row">
              <div>
                <h3>Quick checklist</h3>
                <p className="muted">Small details that help NGOs accept donations faster.</p>
              </div>
            </div>
            <div className="guidance-list">
              <div className="guidance-item">
                <strong>Add a clear title</strong>
                <span>Use names like “Lunch boxes” or “Fresh rice and curry” instead of generic labels.</span>
              </div>
              <div className="guidance-item">
                <strong>Set realistic expiry time</strong>
                <span>Accurate timing helps NGOs prioritize pickups and reduce spoilage risk.</span>
              </div>
              <div className="guidance-item">
                <strong>Share pickup notes</strong>
                <span>Mention gate entry, contact person, or packaging details in the notes field.</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="section-title-row">
              <div>
                <h3>Urgent attention</h3>
                <p className="muted">Donations expiring soon so you can follow up if needed.</p>
              </div>
            </div>
            {urgentDonations.length === 0 && <p className="muted">No urgent donations right now.</p>}
            <div className="stack">
              {urgentDonations.map(donation => (
                <DonationCard key={donation._id} donation={donation} onStatusChange={onStatusChange} compact highlight />
              ))}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
