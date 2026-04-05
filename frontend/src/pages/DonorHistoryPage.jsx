import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

export default function DonorHistoryPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/donations/mine");
        setList(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const history = useMemo(
    () => list.filter(item => ["delivered", "cancelled"].includes(item.status)),
    [list]
  );

  return (
    <div className="stack">
      <section className="card">
        <div className="section-title-row">
          <div>
            <span className="eyebrow">Donor history</span>
            <h2>Donation history</h2>
            <p className="muted">Review completed and cancelled donations in a separate, cleaner space.</p>
          </div>
          <Link className="btn btn-secondary" to="/donor">
            Back to dashboard
          </Link>
        </div>
      </section>

      <section className="card">
        <div className="section-title-row">
          <div>
            <h3>Past donations</h3>
            <p className="muted">{history.length} record{history.length === 1 ? "" : "s"} available.</p>
          </div>
        </div>
        {loading && <p className="muted">Loading donation history...</p>}
        {!loading && history.length === 0 && <p className="muted">Completed and cancelled donations will appear here.</p>}
        <div className="history-grid">
          {history.map(item => (
            <article className="history-card" key={item._id}>
              <div className="row">
                <strong>{item.title}</strong>
                <span className="status-badge">{item.status}</span>
              </div>
              <p className="muted">
                {item.foodType} | Serves {item.quantity}
              </p>
              {item.address && <p className="muted">Pickup: {item.address}</p>}
              <p className="muted">Updated: {formatDateTime(item.updatedAt || item.createdAt)}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
