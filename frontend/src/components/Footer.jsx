import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 mt-10">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-8 text-sm">
        <div>
          <h4 className="font-semibold text-white mb-1">Smart E-Fining System</h4>
          <p className="text-gray-500">Continuous Overspeed Detection and Automatic Penalty Management</p>
        </div>
        <div>
          <h5 className="text-gray-300 font-medium mb-2">System</h5>
          <ul className="space-y-1.5 text-gray-500">
            <li><Link to="/" className="hover:text-white">Home</Link></li>
            <li><Link to="/blacklist" className="hover:text-white">Blacklist</Link></li>
            <li><a href="/#how-it-works" className="hover:text-white">How It Works</a></li>
            <li><Link to="/blacklist" className="hover:text-white">Check Fine</Link></li>
          </ul>
        </div>
        <div>
          <h5 className="text-gray-300 font-medium mb-2">Support</h5>
          <ul className="space-y-1.5 text-gray-500">
            <li>Fine Payment</li>
            <li>Payment Status</li>
            <li>Contact</li>
          </ul>
        </div>
        <div>
          <h5 className="text-gray-300 font-medium mb-2">Legal</h5>
          <ul className="space-y-1.5 text-gray-500">
            <li>Privacy</li>
            <li>Terms</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 text-center text-xs text-gray-600 py-5">
        © 2026 Smart E-Fining System — Digital Traffic Enforcement Platform (Academic / Demo Prototype)
      </div>
    </footer>
  );
}
