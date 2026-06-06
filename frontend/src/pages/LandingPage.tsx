import { motion } from "framer-motion";
import { ArrowUpRight, Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import { FeatureGrid } from "../components/landing/FeatureGrid";
import { HeroSection } from "../components/landing/HeroSection";
import { ValuationDemo } from "../components/landing/ValuationDemo";

export function LandingPage() {
  return (
    <motion.div
      className="landing-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <header className="landing-nav">
        <Link className="landing-brand" to="/" aria-label="Dự đoán giá nhà Hà Nội">
          <span>
            <Building2 size={18} />
          </span>
          <b>Dự đoán giá nhà Hà Nội</b>
        </Link>
        <nav aria-label="Điều hướng chính">
          <a href="#live-demo">Demo</a>
          <a href="#technology">Công nghệ</a>
          <Link className="nav-launch" to="/dashboard">
            Mở dashboard <ArrowUpRight size={16} />
          </Link>
        </nav>
      </header>

      <main>
        <HeroSection />
        <ValuationDemo />
        <div id="technology">
          <FeatureGrid />
        </div>
        <section className="landing-cta section-shell">
          <div>
            <span className="section-kicker">READY TO VALUE</span>
            <h2>Biến thông tin căn nhà thành một phân tích có cơ sở dữ liệu.</h2>
          </div>
          <Link className="button-primary" to="/dashboard">
            Bắt đầu định giá <ArrowUpRight size={18} />
          </Link>
        </section>
      </main>

      <footer className="landing-footer">
        <span>DỰ ĐOÁN GIÁ NHÀ HÀ NỘI · AI VALUATION</span>
        <span>Dữ liệu listing Hà Nội · Snapshot 06/2025</span>
      </footer>
    </motion.div>
  );
}
