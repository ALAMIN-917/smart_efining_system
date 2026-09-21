import { Link } from "react-router-dom";

const trustItems = [
  "GPS Based Monitoring",
  "Automated Violation Detection",
  "Digital Fine Management",
  "Secure Test Payment",
];

export default function Hero() {
  return (
    <section
      className="relative min-h-[92vh] flex items-center bg-cover bg-center"
      style={{
        backgroundImage:
          "linear-gradient(180deg, rgba(11,13,16,0.55), rgba(11,13,16,0.92)), url('https://images.unsplash.com/photo-1502877338535-766e1452684a?q=80&w=2000&auto=format&fit=crop')",
      }}
    >
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-24 fade-in">
        <span className="inline-block text-xs tracking-widest uppercase text-accent2 border border-accent2/40 bg-accent2/10 px-3 py-1 rounded-full mb-5">
          Demo / Test Environment
        </span>
        <h1 className="text-4xl md:text-6xl font-bold leading-tight max-w-3xl">
          Smart E-Fining System
        </h1>
        <p className="text-lg md:text-xl text-gray-200 mt-3 max-w-2xl">
          Continuous Overspeed Detection and Automatic Penalty Management
        </p>
        <p className="text-gray-400 mt-4 max-w-xl">
          Violations are detected automatically using GPS-enabled vehicle monitoring hardware.
          Look up your fine and pay it securely online — no account required.
        </p>

        <div className="flex flex-wrap gap-3 mt-8">
          <Link to="/blacklist" className="bg-accent hover:bg-accent/90 px-6 py-3 rounded-md font-medium transition-colors">
            Check &amp; Pay Fine
          </Link>
          <a href="#recent-fines" className="border border-white/20 hover:border-white/40 px-6 py-3 rounded-md font-medium transition-colors">
            View Blacklist
          </a>
        </div>

        <div className="flex flex-wrap gap-3 mt-10">
          {trustItems.map((t) => (
            <span key={t} className="text-xs text-gray-300 glass px-3 py-2 rounded-full">
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
