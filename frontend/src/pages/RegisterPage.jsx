import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../services/AuthContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "donor" });

  const submit = async e => {
    e.preventDefault();
    try {
      await register(form);
      nav(form.role === "ngo" ? "/ngo" : "/donor");
    } catch (err) {
      alert(err.response?.data?.message || "Register failed");
    }
  };

  return (
    <section className="auth-shell">
      <form className="card auth-card" onSubmit={submit}>
        <h2>Create Account</h2>
        <p className="muted">Join as a donor or NGO and start reducing food waste.</p>
        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Name" required />
        <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email" required />
        <input value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Password" type="password" required />
        <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
          <option value="donor">Donor</option>
          <option value="ngo">NGO</option>
        </select>
        <button className="btn btn-primary" type="submit">Create account</button>
        <p className="muted">Already have an account? <Link to="/login">Login</Link></p>
      </form>
    </section>
  );
}
