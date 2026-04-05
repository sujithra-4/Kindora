import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../services/AuthContext";
import { api } from "../services/api";

const highlights = [
  {
    title: "Fast food rescue",
    text: "Restaurants, events, and home kitchens can post extra meals before they go to waste.",
  },
  {
    title: "Trusted NGO pickup",
    text: "Verified organizations browse available donations and claim pickups that match their route.",
  },
  {
    title: "Live delivery tracking",
    text: "Both sides can follow the status from listing to handoff with transparent updates.",
  },
];

const steps = [
  {
    id: "01",
    title: "List available food",
    text: "Share quantity, timing, and pickup details in a few taps.",
  },
  {
    id: "02",
    title: "Match with NGOs",
    text: "Nearby organizations see active donations and accept what they can distribute quickly.",
  },
  {
    id: "03",
    title: "Track the handoff",
    text: "Stay informed until the food reaches the people it was meant for.",
  },
];

const metrics = [
  { value: "Same day", label: "pickup workflow built for urgent donations" },
  { value: "2 roles", label: "designed for donors and NGOs in one platform" },
  { value: "Live status", label: "updates across listing, claim, and delivery" },
];

export default function HomePage() {
  const { user } = useAuth();
  const dashboardPath = user?.role === "ngo" ? "/ngo" : "/donor";
  const [availableDonations, setAvailableDonations] = useState([]);
  const [loadingDonations, setLoadingDonations] = useState(true);

  useEffect(() => {
    let active = true;

    const loadAvailableDonations = async () => {
      try {
        const { data } = await api.get("/donations/public");
        if (active) setAvailableDonations(Array.isArray(data) ? data : []);
      } catch (_err) {
        if (active) setAvailableDonations([]);
      } finally {
        if (active) setLoadingDonations(false);
      }
    };

    loadAvailableDonations();
    return () => {
      active = false;
    };
  }, []);

  const formatExpiry = value => {
    const hoursLeft = Math.max(0, Math.round((new Date(value).getTime() - Date.now()) / 3600000));
    if (hoursLeft < 1) return "Expires soon";
    if (hoursLeft === 1) return "Expires in 1 hour";
    return `Expires in ${hoursLeft} hours`;
  };

  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="hero-copy">
          <span className="eyebrow">Food donation platform</span>
          <h1>Turn extra food into timely help for nearby communities.</h1>
          <p className="hero-text">
            Kindora connects donors and NGOs through a simple workflow for posting surplus food,
            claiming pickups, and tracking each donation until it reaches people who need it.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary" to={user ? dashboardPath : "/register"}>
              {user ? "Open dashboard" : "Start donating"}
            </Link>
            <Link className="btn btn-secondary" to={user ? dashboardPath : "/login"}>
              {user ? "View activity" : "NGO login"}
            </Link>
          </div>
          <div className="hero-metrics">
            {metrics.map(item => (
              <div className="metric-card" key={item.label}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="hero-panel card">
          <div className="hero-panel-top">
            <span className="eyebrow">Why this matters</span>
            <h3>Less waste. More dignity. Better coordination.</h3>
          </div>
          <div className="impact-list">
            {highlights.map(item => (
              <div className="impact-item" key={item.title}>
                <div className="impact-dot" />
                <div>
                  <h4>{item.title}</h4>
                  <p className="muted">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="hero-note">
            <span>Donors save food from being discarded.</span>
            <span>NGOs get a clearer, faster pickup pipeline.</span>
          </div>
        </div>
      </section>

      <section className="info-section">
        <div className="section-heading">
          <span className="eyebrow">How it works</span>
          <h2>A simple flow built for real-world food rescue.</h2>
          <p className="muted">
            The platform keeps the experience lightweight so teams can respond quickly when food is available.
          </p>
        </div>
        <div className="steps-grid">
          {steps.map(step => (
            <article className="card step-card" key={step.id}>
              <span className="step-id">{step.id}</span>
              <h3>{step.title}</h3>
              <p className="muted">{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="info-section">
        <div className="section-heading">
          <span className="eyebrow">Available now</span>
          <h2>Live donation listings on the platform right now.</h2>
          <p className="muted">
            A quick preview of active food donations that NGOs can respond to before pickup windows close.
          </p>
        </div>
        {loadingDonations && <p className="muted">Loading available donations...</p>}
        {!loadingDonations && availableDonations.length === 0 && (
          <div className="card">
            <p className="muted">No active donations are listed right now. Check back soon or post one to get started.</p>
          </div>
        )}
        {availableDonations.length > 0 && (
          <div className="home-donations-grid">
            {availableDonations.map(donation => (
              <article className="card home-donation-card" key={donation._id}>
                <div className="row">
                  <span className="pill pill-soft">{donation.foodType}</span>
                  <span className="status-badge">{donation.status}</span>
                </div>
                <h3>{donation.title}</h3>
                <p className="muted">Serves {donation.quantity}</p>
                {donation.address && <p className="muted"><strong>Pickup:</strong> {donation.address}</p>}
                <p className="home-donation-expiry">{formatExpiry(donation.expiryTime)}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="story-section card">
        <div className="story-copy">
          <span className="eyebrow">Built for both sides</span>
          <h2>One platform for people giving food and people moving it efficiently.</h2>
          <p className="muted">
            Donors need a quick way to post extra meals. NGOs need visibility, speed, and confidence before
            sending volunteers. Kindora brings both together in one shared workflow.
          </p>
        </div>
        <div className="audience-grid">
          <div className="audience-card">
            <h3>For donors</h3>
            <p className="muted">Create listings, monitor pickup progress, and reduce avoidable waste.</p>
          </div>
          <div className="audience-card">
            <h3>For NGOs</h3>
            <p className="muted">Discover available donations, claim them quickly, and coordinate delivery.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
