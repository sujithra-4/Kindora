import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../services/api";

export default function TrackingPage() {
  const { id } = useParams();
  const [donation, setDonation] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await api.get(`/donations/${id}`);
      setDonation(data);
    })();
  }, [id]);

  if (!donation) return <div className="card">Loading...</div>;

  return (
    <div className="card">
      <h2>Donation Tracking</h2>
      <div className="meta-grid">
        <p><strong>Title:</strong> {donation.title}</p>
        <p><strong>Status:</strong> <span className="status-badge">{donation.status}</span></p>
        <p><strong>Donor:</strong> {donation.donor?.name || "-"}</p>
        <p><strong>Accepted By:</strong> {donation.acceptedBy?.name || "Not accepted yet"}</p>
      </div>
    </div>
  );
}
