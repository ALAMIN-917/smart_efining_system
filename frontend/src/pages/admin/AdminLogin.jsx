import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminLogin } from "../../services/api";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await adminLogin(username, password);
      localStorage.setItem("efine_admin_token", res.data.token);
      navigate("/admin/dashboard");
    } catch (err) {
      setError(err.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto px-4 py-24">
      <div className="glass rounded-2xl p-8">
        <h1 className="text-xl font-bold mb-1">Super Admin</h1>
        <p className="text-gray-400 text-sm mb-6">Restricted access — Smart E-Fining backend</p>

        <form onSubmit={submit} className="space-y-4">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            className="w-full bg-black/30 border border-white/10 rounded-md px-4 py-2.5 text-sm outline-none focus:border-accent/50"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full bg-black/30 border border-white/10 rounded-md px-4 py-2.5 text-sm outline-none focus:border-accent/50"
          />
          {error && <p className="text-accent text-sm">{error}</p>}
          <button
            disabled={loading}
            className="w-full bg-accent hover:bg-accent/90 disabled:opacity-60 px-4 py-2.5 rounded-md text-sm font-medium"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
