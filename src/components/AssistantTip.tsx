import { motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import type { CSSProperties } from "react";
import type { AssistantTip, TipSeverity } from "../lib/assistant";
import { useT } from "../i18n";

/**
 * Is' tip, rendered in the notch.
 *
 * Deliberately short: one line, one colour per severity, one close button.
 * Is never takes over the screen — it only points things out.
 *
 * A tip has to *earn* the glance, though. A one-line message appearing at the
 * top of the screen while you stare at a terminal is easy to miss, so the
 * arrival is staged: two rings bloom out of the mascot, the row gets a brief
 * accent outline, and the severity dot keeps a slow heartbeat while the tip is
 * up. Everything is CSS, so it stays cheap and respects reduced motion.
 */

export const SEVERITY_COLOR: Record<TipSeverity, string> = {
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
  // Translated at render, not at pick time: switching language while a tip is
  // on screen re-reads it in the new language instead of leaving a relic.
  const t = useT();
  const message = t(tip.message.key, tip.message.params);

  return (
    <motion.div
      // Keyed by tip so the flare replays for each new message instead of being
      // reused from the previous one.
      key={tip.id}
      className="assistant-tip"
      data-severity={tip.severity}
      style={{ "--tip-accent": accent } as CSSProperties}
      role="status"
      aria-live="polite"
      initial={reduceMotion ? false : { opacity: 0, scale: 0.94, filter: "blur(4px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.04, filter: "blur(4px)" }}
      transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 26 }}
    >
      <span className="assistant-tip-avatar" aria-hidden>
        {/* Two rings expanding out of the mascot: the eye catches motion at the
            top of the screen long before it reads a line of text. */}
        <span className="assistant-tip-ring" />
        <span className="assistant-tip-ring assistant-tip-ring-late" />
        <img src="/islet.png" alt="" draggable={false} />
        <span className="assistant-tip-dot" />
      </span>

      <span className="assistant-tip-message" title={message}>
        {message}
      </span>

      <button
        type="button"
        className="assistant-tip-close"
        onClick={onDismiss}
        aria-label={t("tip.dismiss")}
      >
        <X size={11} strokeWidth={2.6} />
      </button>
    </motion.div>
  );
}
