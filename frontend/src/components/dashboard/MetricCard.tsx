import { Info } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

type MetricCardProps = {
  label: string;
  value: string;
  meta?: string;
  icon: LucideIcon;
  tone?: "cyan" | "violet" | "neutral" | "success";
  help?: string;
};

export function MetricCard({
  label,
  value,
  meta,
  icon: Icon,
  tone = "neutral",
  help,
}: MetricCardProps) {
  return (
    <motion.article
      className={`premium-metric metric-${tone}`}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <div className="premium-metric-head">
        <span>
          {label}
          {help && (
            <span className="metric-help" tabIndex={0} aria-label={help}>
              <Info size={13} />
              <span role="tooltip">{help}</span>
            </span>
          )}
        </span>
        <Icon size={18} />
      </div>
      <strong>{value}</strong>
      {meta && <small>{meta}</small>}
    </motion.article>
  );
}
