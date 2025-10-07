import Header from './Header';
import Hero from "./Hero";
import About from "./About";
import FeatureCard from "./FeatureCard";
import Testimonials from "./Testimonials";
import Footer from "./Footer";

export default function HomePage() {
  return (
    <div className="font-sans bg-gray-50">
      <Header />
      <Hero />
      <About />
      <FeatureCard />
      <Testimonials />
      <Footer />
    </div>
  );
}
