import { motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import type { AssistantTip, TipSeverity } from "../lib/assistant";

/**
 * Is' tip, rendered in the notch.
 *
 * Deliberately short: one line, one colour per severity, one close button.
 * Is never takes over the screen — it only points things out.
 */

const SEVERITY_COLOR: Record<TipSeverity, string> = {
  info: "#64D2FF",
  warn: "#FFD60A",
  critical: "#FF453A",
};

interface AssistantTipViewProps {
  tip: AssistantTip;
  onDismiss: () => void;
}

export function AssistantTipView({ tip, onDismiss }: AssistantTipViewProps) {
  const accent = SEVERITY_COLOR[tip.severity];
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="assistant-tip"
      role="status"
      aria-live="polite"
      initial={reduceMotion ? false : { opacity: 0, scale: 0.94, filter: "blur(4px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.04, filter: "blur(4px)" }}
      transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 26 }}
    >
      <span className="assistant-tip-avatar" aria-hidden>
        <img src="/islet.png" alt="" draggable={false} />
        <span className="assistant-tip-dot" style={{ background: accent }} />
      </span>

      <span className="assistant-tip-message" title={tip.title}>
        {tip.title}
      </span>

      <button
        type="button"
        className="assistant-tip-close"
        onClick={onDismiss}
        aria-label="Dismiss tip"
      >
        <X size={11} strokeWidth={2.6} />
      </button>
    </motion.div>
  );
}
