const steps = [
  { icon: "📡", title: "GPS Detection", desc: "ESP32 + GPS hardware continuously monitors vehicle speed on the road." },
  { icon: "⚠️", title: "Violation Logged", desc: "Overspeed events are automatically recorded and linked to the vehicle." },
  { icon: "🔎", title: "Public Lookup", desc: "Owners search or browse the portal to find their outstanding fine." },
  { icon: "💳", title: "Secure Payment", desc: "Fines are paid via Stripe TEST checkout — no account needed." },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="max-w-6xl mx-auto px-4 md:px-6 py-20">
      <h2 className="text-3xl font-bold mb-10 text-center">How It Works</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {steps.map((s) => (
          <div key={s.title} className="glass rounded-xl p-6 text-center">
            <div className="text-3xl mb-3">{s.icon}</div>
            <h3 className="font-semibold mb-2">{s.title}</h3>
            <p className="text-sm text-gray-400">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AboutSystem() {
  return (
    <section id="about" className="max-w-6xl mx-auto px-4 md:px-6 py-20">
      <div className="glass rounded-xl p-8 grid md:grid-cols-2 gap-8 items-center">
        <div>
          <h2 className="text-3xl font-bold mb-4">Digital, Transparent Enforcement</h2>
          <p className="text-gray-400">
            Every violation is tied to a verified vehicle and GPS device record. Fine data is
            served directly from the database — nothing on this page is hardcoded — and no fine
            can be marked paid without a verified payment confirmation from Stripe.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="border border-white/10 rounded-lg p-4">
            <p className="text-accent2 font-semibold text-lg">100%</p>
            <p className="text-gray-400">Server-verified payments</p>
          </div>
          <div className="border border-white/10 rounded-lg p-4">
            <p className="text-accent2 font-semibold text-lg">0</p>
            <p className="text-gray-400">Accounts required</p>
          </div>
        </div>
      </div>
    </section>
  );
}
