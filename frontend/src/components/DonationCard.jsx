import { Link } from "react-router-dom";

function left(expiry) {
  const d = new Date(expiry) - new Date();
  if (d <= 0) return "Expired";
  const h = Math.floor(d / 3600000);
  const m = Math.floor((d % 3600000) / 60000);
  return `${h}h ${m}m left`;
}

function urgencyTone(expiry) {
  const msLeft = new Date(expiry) - new Date();
  if (msLeft <= 0) return "danger";
  if (msLeft <= 2 * 3600000) return "warning";
  return "calm";
}

export default function DonationCard({
  donation,
  onAccept,
  onStatusChange,
  showAccept,
  compact = false,
  highlight = false
}) {
  const urgency = urgencyTone(donation.expiryTime);

  return (
    <article className={`card donation-card${compact ? " donation-card-compact" : ""}${highlight ? " donation-card-highlight" : ""}`}>
      <div className="donation-card-head">
        <div className="stack">
          <div className="row">
            <span className={`pill pill-${urgency}`}>{left(donation.expiryTime)}</span>
            <span className="pill pill-soft">{donation.foodType}</span>
            <span className="status-badge">{donation.status}</span>
          </div>
          <h3>{donation.title}</h3>
          <p className="muted">Serves {donation.quantity}</p>
        </div>
      </div>

      <div className="donation-meta">
        {donation.address && <p><strong>Pickup:</strong> {donation.address}</p>}
        {donation.donor?.name && <p><strong>Donor:</strong> {donation.donor.name}</p>}
        {donation.donor?.phone && <p><strong>Phone:</strong> {donation.donor.phone}</p>}
      </div>

      {donation.description && <p className="muted">{donation.description}</p>}

      <div className="row">
        <Link className="btn btn-secondary" to={`/track/${donation._id}`}>Track</Link>
        {showAccept && donation.status === "available" && (
          <button className="btn btn-primary" onClick={() => onAccept(donation._id)}>Accept</button>
        )}
        {donation.status === "accepted" && (
          <button className="btn btn-primary" onClick={() => onStatusChange(donation._id, "picked")}>Mark Picked</button>
        )}
        {donation.status === "picked" && (
          <button className="btn btn-primary" onClick={() => onStatusChange(donation._id, "delivered")}>Mark Delivered</button>
        )}
      </div>
    </article>
  );
}
