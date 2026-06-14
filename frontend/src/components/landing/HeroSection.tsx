import { motion } from "framer-motion";
import { ArrowDown, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { InteractivePropertyDemo } from "./InteractivePropertyDemo";

const reveal = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

export function HeroSection() {
  const scrollToDemo = () => {
    document.getElementById("live-demo")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="landing-hero" aria-labelledby="hero-title">
      <div className="hanoi-backdrop" aria-hidden="true" />

      <motion.div
        className="hero-copy"
        initial="hidden"
        animate="visible"
        transition={{ staggerChildren: 0.08, delayChildren: 0.08 }}
      >
        <motion.div className="hero-kicker" variants={reveal}>
          NỀN TẢNG ĐỊNH GIÁ BẤT ĐỘNG SẢN HÀ NỘI
        </motion.div>
        <motion.h1 id="hero-title" variants={reveal}>
          HanoiNest
        </motion.h1>
        <motion.h2 variants={reveal}>
          Nền tảng định giá bất động sản Hà Nội
        </motion.h2>
        <motion.p variants={reveal}>
          Định giá tài sản, so sánh mặt bằng khu vực và đọc vị trí thị trường qua
          một trải nghiệm trực quan, minh bạch.
        </motion.p>
        <motion.div className="hero-actions" variants={reveal}>
          <Link className="button-primary" to="/dashboard">
            Bắt đầu định giá <ArrowUpRight size={18} />
          </Link>
          <button className="button-ghost" type="button" onClick={scrollToDemo}>
            Xem cách hoạt động <ArrowDown size={18} />
          </button>
        </motion.div>
        <motion.div className="hero-trust" variants={reveal}>
          <span><CheckCircle2 size={15} /> Dữ liệu Hà Nội</span>
          <span><CheckCircle2 size={15} /> So sánh minh bạch</span>
          <span><CheckCircle2 size={15} /> Kết quả trong vài giây</span>
        </motion.div>
      </motion.div>

      <InteractivePropertyDemo />
    </section>
  );
}
