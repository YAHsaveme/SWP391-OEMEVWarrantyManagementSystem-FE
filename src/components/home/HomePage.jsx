import Hero from "./Hero";
import About from "./About";
import FeatureCard from "./FeatureCard";
import Testimonials from "./Testimonials";
import Footer from "./Footer";
import Navbar from './Navbar'

export default function HomePage() {
  return (
    <div className="font-sans bg-gray-50">
      <Navbar />
      <Hero />
      <About />
      <FeatureCard />
      <Testimonials />
      <Footer />
    </div>
  );
}
