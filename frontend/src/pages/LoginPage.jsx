import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../services/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = async e => {
    e.preventDefault();
    try {
      const payload = { email, password };
      await login(payload);
      const role = JSON.parse(localStorage.getItem("lf_user") || "null")?.role;
      nav(role === "ngo" ? "/ngo" : "/donor");
    } catch (err) {
      alert(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <section className="auth-shell">
      <form className="card auth-card" onSubmit={submit}>
        <h2>Welcome Back</h2>
        <p className="muted">Login to manage donations and track delivery status.</p>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required />
        <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type="password" required />
        <button className="btn btn-primary" type="submit">Login</button>
        <p className="muted">New here? <Link to="/register">Register</Link></p>
      </form>
    </section>
  );
}
