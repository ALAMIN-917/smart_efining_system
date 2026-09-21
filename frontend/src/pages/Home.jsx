import Hero from "../components/Hero";
import Stats from "../components/Stats";
import RecentFines from "../components/RecentFines";
import { HowItWorks, AboutSystem } from "../components/HowItWorks";

export default function Home() {
  return (
    <div>
      <Hero />
      <Stats />
      <RecentFines />
      <HowItWorks />
      <AboutSystem />
    </div>
  );
}
