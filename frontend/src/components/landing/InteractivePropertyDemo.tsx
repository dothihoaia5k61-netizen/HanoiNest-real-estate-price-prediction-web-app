import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { BarChart3, BrainCircuit, Building2, MousePointer2, ScanLine } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { Scene3D, type AnalysisPhase } from "./Scene3D";

const analysisCards = [
  { label: "Diện tích", value: "90 m²", icon: Building2, className: "demo-float-area" },
  { label: "Khu vực", value: "Cầu Giấy", icon: ScanLine, className: "demo-float-location" },
  { label: "Listing đối chiếu", value: "222", icon: BarChart3, className: "demo-float-listings" },
];

export function InteractivePropertyDemo() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef({ x: 0, y: 0 });
  const timersRef = useRef<number[]>([]);
  const reducedMotion = useReducedMotion() ?? false;
  const inView = useInView(wrapperRef, { amount: 0.12, initial: true });
  const [phase, setPhase] = useState<AnalysisPhase>("idle");
  const [showCards, setShowCards] = useState(false);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const runDemo = () => {
    clearTimers();
    setPhase("analyzing");
    setShowCards(false);

    const cardDelay = reducedMotion ? 80 : 620;
    const resultDelay = reducedMotion ? 260 : 1850;
    timersRef.current.push(
      window.setTimeout(() => setShowCards(true), cardDelay),
      window.setTimeout(() => setPhase("result"), resultDelay),
    );
  };

  const updateTilt = (event: PointerEvent<HTMLDivElement>) => {
    if (reducedMotion || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    tiltRef.current = {
      x: ((event.clientX - rect.left) / rect.width - 0.5) * 2,
      y: -((event.clientY - rect.top) / rect.height - 0.5) * 2,
    };
  };

  const resetTilt = () => {
    tiltRef.current = { x: 0, y: 0 };
  };

  return (
    <div
      ref={wrapperRef}
      className={`interactive-property-demo demo-phase-${phase}`}
      data-phase={phase}
      onPointerMove={updateTilt}
      onPointerLeave={resetTilt}
    >
      <div className="hero-scene" aria-hidden="true">
        <Scene3D
          active={inView}
          phase={phase}
          reducedMotion={reducedMotion}
          tiltRef={tiltRef}
        />
      </div>

      <button
        className="property-object-trigger"
        type="button"
        onClick={runDemo}
        aria-label={
          phase === "idle"
            ? "Phân tích ngôi nhà mẫu"
            : phase === "analyzing"
              ? "AI đang phân tích ngôi nhà mẫu"
              : "Phân tích lại ngôi nhà mẫu"
        }
      >
        <span className="object-trigger-label">
          {phase === "idle" && <MousePointer2 size={15} />}
          {phase === "analyzing" && <BrainCircuit size={15} />}
          {phase === "result" && <ScanLine size={15} />}
          {phase === "idle"
            ? "Chạm để phân tích"
            : phase === "analyzing"
              ? "AI đang phân tích"
              : "Phân tích lại"}
        </span>
      </button>

      <AnimatePresence>
        {showCards &&
          analysisCards.map(({ label, value, icon: Icon, className }, index) => (
            <motion.div
              className={`demo-floating-card ${className}`}
              key={label}
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ delay: reducedMotion ? 0 : index * 0.1, duration: 0.28 }}
            >
              <Icon size={15} />
              <span>{label}</span>
              <strong>{value}</strong>
            </motion.div>
          ))}
      </AnimatePresence>

      <AnimatePresence>
        {phase === "result" && (
          <motion.div
            className="interactive-result"
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0.01 : 0.38 }}
          >
            <span>Dự đoán giá nhà</span>
            <strong>20,32 tỷ VNĐ</strong>
            <small>Khoảng tham khảo 18,9 – 21,7 tỷ · Chạm ngôi nhà để chạy lại</small>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
