import { useEffect, useMemo, useRef, useState } from "react";
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { io } from "socket.io-client";
import { api } from "../services/api";
import { useAuth } from "../services/AuthContext";
import DonationCard from "../components/DonationCard";

function MapLocationPicker({ position, onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    }
  });
  if (!position) return null;
  return <CircleMarker center={position} radius={10} pathOptions={{ color: "#c96f3a" }} />;
}

function Recenter({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, 13);
  }, [map, position]);
  return null;
}

function hoursLeft(expiryTime) {
  return Math.max(0, (new Date(expiryTime).getTime() - Date.now()) / 3600000);
}

function formatRelativeTime(dateString) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffMin = Math.max(1, Math.round(diffMs / 60000));
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  return `${Math.round(diffHours / 24)} day ago`;
}

export default function NGODashboard() {
  const { user } = useAuth();
  const [lat, setLat] = useState(() => String(user?.location?.latitude || ""));
  const [lng, setLng] = useState(() => String(user?.location?.longitude || ""));
  const [radiusKm, setRadiusKm] = useState(20);
  const [foodFilter, setFoodFilter] = useState("all");
  const [sortBy, setSortBy] = useState("priority");
  const [addressQuery, setAddressQuery] = useState("");
  const [list, setList] = useState([]);
  const [myPickups, setMyPickups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const socketRef = useRef(null);
  const triedAutoLocationRef = useRef(false);
  const hasManualLocationRef = useRef(false);

  useEffect(() => {
    if (!user?.location) return;
    setLat(current => current || String(user.location.latitude));
    setLng(current => current || String(user.location.longitude));
  }, [user]);

  const load = async () => {
    if (!lat || !lng) return;
    setLoading(true);
    try {
      const [nearbyRes, myRes] = await Promise.all([
        api.get("/donations/nearby", { params: { lat, lng, maxDistanceKm: radiusKm } }),
        api.get("/donations/mine")
      ]);
      setList(nearbyRes.data);
      setMyPickups(myRes.data);
    } finally {
      setLoading(false);
    }
  };

  const useMyLocation = () => {
    hasManualLocationRef.current = true;
    if (!navigator.geolocation) {
      alert("Geolocation is not supported in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLat(String(pos.coords.latitude));
        setLng(String(pos.coords.longitude));
      },
      () => {
        alert("Unable to access your location. Please allow location permission.");
      }
    );
  };

  useEffect(() => {
    if (triedAutoLocationRef.current) return;
    triedAutoLocationRef.current = true;

    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      pos => {
        if (hasManualLocationRef.current) return;
        setLat(String(pos.coords.latitude));
        setLng(String(pos.coords.longitude));
      },
      () => {
        triedAutoLocationRef.current = false;
      }
    );
  }, [lat, lng, user]);

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
      hasManualLocationRef.current = true;
      setLat(String(data[0].lat));
      setLng(String(data[0].lon));
    } catch (_err) {
      alert("Address lookup failed. Please enter latitude and longitude manually.");
    }
  };

  useEffect(() => {
    load();
  }, [lat, lng, radiusKm]);

  const selectedPosition = lat && lng ? [Number(lat), Number(lng)] : null;
  const defaultCenter = [13.0827, 80.2707];
  const socketUrl = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");

  const onAccept = async id => {
    await api.post(`/donations/${id}/accept`);
    load();
  };

  const onStatusChange = async (id, status) => {
    await api.put(`/donations/${id}/status`, { status });
    load();
  };

  useEffect(() => {
    const socket = io(socketUrl, { transports: ["websocket"] });
    socketRef.current = socket;
    socket.on("donationPostedForNgo", payload => {
      setNotifications(prev => [
        {
          id: `all-${Date.now()}-${payload.donationId}`,
          title: payload.title,
          message: `New ${payload.foodType} donation posted`,
          time: new Date().toISOString()
        },
        ...prev.slice(0, 4)
      ]);
      load();
    });
    socket.on("nearbyDonationCreated", payload => {
      setNotifications(prev => [
        {
          id: `${Date.now()}-${payload.donationId}`,
          title: payload.title,
          message: "New nearby donation available",
          time: new Date().toISOString()
        },
        ...prev.slice(0, 4)
      ]);
      load();
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [socketUrl]);

  useEffect(() => {
    if (lat && lng && socketRef.current) {
      socketRef.current.emit("registerClient", { role: "ngo", lat, lng });
    }
  }, [lat, lng]);

  const filteredNearby = useMemo(() => {
    const next = list.filter(item => {
      if (foodFilter === "all") return true;
      return item.foodType === foodFilter;
    });

    const sorters = {
      priority: (a, b) => (a.priority || 0) - (b.priority || 0),
      quantity: (a, b) => (b.quantity || 0) - (a.quantity || 0),
      expiry: (a, b) => new Date(a.expiryTime) - new Date(b.expiryTime)
    };

    return [...next].sort(sorters[sortBy] || sorters.priority);
  }, [foodFilter, list, sortBy]);

  const urgentNearby = filteredNearby.filter(item => hoursLeft(item.expiryTime) <= 3).slice(0, 3);
  const activePickups = myPickups.filter(item => item.status === "accepted" || item.status === "picked");
  const completedToday = myPickups.filter(item => {
    const stamp = item.updatedAt || item.createdAt;
    return item.status === "delivered" && stamp && new Date(stamp).toDateString() === new Date().toDateString();
  });

  const stats = [
    { label: "Nearby available", value: filteredNearby.length, tone: "warm" },
    { label: "Urgent pickups", value: urgentNearby.length, tone: "alert" },
    { label: "Active pickups", value: activePickups.length, tone: "calm" },
    { label: "Delivered today", value: completedToday.length, tone: "soft" }
  ];

  return (
    <div className="ngo-dashboard">
      <section className="dashboard-hero card">
        <div className="dashboard-hero-copy">
          <span className="eyebrow">NGO operations</span>
          <h2>Coordinate pickups, spot urgent donations, and move faster with live updates.</h2>
          <p className="muted">
            Use location-based discovery to find nearby food donations, prioritize expiring listings, and manage
            your accepted pickups from one workspace.
          </p>
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
          <div className="card">
            <div className="section-title-row">
              <div>
                <h3>Service area</h3>
                <p className="muted">Set the area you want to monitor and refresh matching donation listings.</p>
              </div>
              <button className="btn btn-primary" type="button" onClick={load}>
                Refresh listings
              </button>
            </div>

            <div className="map-wrap">
              <MapContainer center={selectedPosition || defaultCenter} zoom={12} className="map-box">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapLocationPicker
                  position={selectedPosition}
                  onPick={(pickedLat, pickedLng) => {
                    hasManualLocationRef.current = true;
                    setLat(String(pickedLat));
                    setLng(String(pickedLng));
                  }}
                />
                <Recenter position={selectedPosition} />
              </MapContainer>
            </div>

            <div className="form-grid">
              <input value={lat} placeholder="Latitude" readOnly />
              <input value={lng} placeholder="Longitude" readOnly />
              <input
                className="full"
                value={addressQuery}
                onChange={e => setAddressQuery(e.target.value)}
                placeholder="Set service area by address (e.g. T Nagar, Chennai)"
              />
              <select value={radiusKm} onChange={e => setRadiusKm(Number(e.target.value))}>
                <option value={5}>Within 5 km</option>
                <option value={10}>Within 10 km</option>
                <option value={20}>Within 20 km</option>
                <option value={30}>Within 30 km</option>
              </select>
              <select value={foodFilter} onChange={e => setFoodFilter(e.target.value)}>
                <option value="all">All food types</option>
                <option value="veg">Veg only</option>
                <option value="non-veg">Non-veg only</option>
              </select>
              <select className="full" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="priority">Sort by best match</option>
                <option value="expiry">Sort by earliest expiry</option>
                <option value="quantity">Sort by highest quantity</option>
              </select>
            </div>

            <div className="row">
              <button className="btn btn-secondary" type="button" onClick={useMyLocation}>
                Use my location
              </button>
              <button className="btn btn-secondary" type="button" onClick={searchByAddress}>
                Set area by address
              </button>
            </div>

            {loading && <p className="muted">Loading nearby donations...</p>}
          </div>

          <div className="card">
            <div className="section-title-row">
              <div>
                <h3>Urgent donations</h3>
                <p className="muted">Prioritize these first so food gets picked up before expiry.</p>
              </div>
            </div>
            {urgentNearby.length === 0 && <p className="muted">No urgent donations in the selected area right now.</p>}
            <div className="stack">
              {urgentNearby.map(donation => (
                <DonationCard
                  key={donation._id}
                  donation={donation}
                  showAccept
                  onAccept={onAccept}
                  onStatusChange={onStatusChange}
                  compact
                  highlight
                />
              ))}
            </div>
          </div>

          <div className="card">
            <div className="section-title-row">
              <div>
                <h3>Nearby opportunities</h3>
                <p className="muted">
                  {filteredNearby.length} available donation{filteredNearby.length === 1 ? "" : "s"} matched to your filters.
                </p>
              </div>
            </div>
            {filteredNearby.length === 0 && <p className="muted">No nearby donations found for this location.</p>}
            <div className="stack">
              {filteredNearby.map(donation => (
                <DonationCard
                  key={donation._id}
                  donation={donation}
                  showAccept
                  onAccept={onAccept}
                  onStatusChange={onStatusChange}
                />
              ))}
            </div>
          </div>
        </div>

        <aside className="stack">
          <div className="card">
            <div className="section-title-row">
              <div>
                <h3>Activity feed</h3>
                <p className="muted">Live nearby alerts from your current location.</p>
              </div>
            </div>
            {notifications.length === 0 && <p className="muted">New nearby donations will appear here.</p>}
            <div className="stack">
              {notifications.map(item => (
                <div className="feed-item" key={item.id}>
                  <strong>{item.title}</strong>
                  <span>{item.message}</span>
                  <small>{formatRelativeTime(item.time)}</small>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="section-title-row">
              <div>
                <h3>Active pickups</h3>
                <p className="muted">Accepted donations that still need pickup or delivery updates.</p>
              </div>
            </div>
            {activePickups.length === 0 && <p className="muted">No active pickups assigned yet.</p>}
            <div className="stack">
              {activePickups.map(donation => (
                <DonationCard
                  key={donation._id}
                  donation={donation}
                  onStatusChange={onStatusChange}
                  compact
                />
              ))}
            </div>
          </div>

          <div className="card">
            <div className="section-title-row">
              <div>
                <h3>Team notes</h3>
                <p className="muted">A quick guide for daily coordination.</p>
              </div>
            </div>
            <div className="guidance-list">
              <div className="guidance-item">
                <strong>Start with urgent listings</strong>
                <span>Anything under 3 hours remaining should be reviewed first.</span>
              </div>
              <div className="guidance-item">
                <strong>Keep location updated</strong>
                <span>Your current pin controls which new nearby donation alerts you receive.</span>
              </div>
              <div className="guidance-item">
                <strong>Close the loop</strong>
                <span>Mark pickups as picked and delivered so donors see reliable status updates.</span>
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
