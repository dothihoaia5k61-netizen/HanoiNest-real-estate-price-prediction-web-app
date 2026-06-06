import { motion } from "framer-motion";
import { ArrowDown, ArrowUpRight, BrainCircuit, Database, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { InteractivePropertyDemo } from "./InteractivePropertyDemo";

const reveal = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function HeroSection() {
  const scrollToDemo = () => {
    document.getElementById("live-demo")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="landing-hero" aria-labelledby="hero-title">
      <div className="hero-lighting" />
      <InteractivePropertyDemo />

      <motion.div
        className="hero-copy"
        initial="hidden"
        animate="visible"
        transition={{ staggerChildren: 0.1, delayChildren: 0.12 }}
      >
        <motion.div className="hero-kicker" variants={reveal}>
          <span className="live-dot" />
          HỆ THỐNG ĐỊNH GIÁ NHÀ Ở HÀ NỘI
        </motion.div>
        <motion.h1 id="hero-title" variants={reveal}>
          Dự đoán giá nhà
          <br />
          Hà Nội
        </motion.h1>
        <motion.h2 variants={reveal}>Định giá bằng AI, đối chiếu bằng dữ liệu thị trường.</motion.h2>
        <motion.p variants={reveal}>
          Ước tính giá trị bất động sản, vị trí trên thị trường và các listing tương
          đồng chỉ trong vài giây.
        </motion.p>
        <motion.div className="hero-actions" variants={reveal}>
          <Link className="button-primary" to="/dashboard">
            Mở dashboard định giá <ArrowUpRight size={18} />
          </Link>
          <button className="button-ghost" type="button" onClick={scrollToDemo}>
            Xem cách hoạt động <ArrowDown size={18} />
          </button>
        </motion.div>
      </motion.div>

      <div className="hero-signals">
        <div>
          <Database size={16} />
          <span>61.417</span>
          <small>bản ghi huấn luyện</small>
        </div>
        <div>
          <BrainCircuit size={16} />
          <span>0,806</span>
          <small>R² validation</small>
        </div>
        <div>
          <ShieldCheck size={16} />
          <span>Hà Nội</span>
          <small>phạm vi dữ liệu</small>
        </div>
      </div>
    </section>
  );
}
