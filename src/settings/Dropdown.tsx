import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  align?: "left" | "right";
}

/** La liste ouverte, placée par rapport à son bouton. */
interface Placement {
  /** Distance du haut de la fenêtre à la liste. */
  top: number | null;
  /** Distance du bas de la fenêtre à la liste, quand elle s'ouvre vers le haut. */
  bottom: number | null;
  left: number | null;
  right: number | null;
  width: number;
}

/**
 * Une liste dépliante qui ne se fait pas avaler par son panneau.
 *
 * Posée dans le flux, la liste était rognée par le premier conteneur qui défile
 * ou qui masque ses débordements : les réglages sont pleins de ces conteneurs,
 * et la liste des langues disparaissait sous la carte. Elle est donc rendue à la
 * racine du document, en position fixe, à l'endroit exact où son bouton se
 * trouve. Les deux références sont écoutées ensemble : sans cela, un clic dans
 * la liste serait lu comme un clic à l'extérieur, et refermerait la liste avant
 * d'avoir pu choisir.
 */
export function Dropdown({ value, options, onChange, placeholder, align = "right" }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    // Vers le bas par défaut ; vers le haut quand le bas de la fenêtre est trop
    // proche, ce qui arrive sur le dernier réglage d'un onglet.
    const spaceBelow = window.innerHeight - rect.bottom;
    const flip = spaceBelow < 200 && rect.top > spaceBelow;
    setPlacement({
      top: flip ? null : rect.bottom + 6,
      bottom: flip ? window.innerHeight - rect.top + 6 : null,
      left: align === "left" ? rect.left : null,
      right: align === "right" ? window.innerWidth - rect.right : null,
      width: rect.width,
    });
  }, [align]);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    // Le moindre défilement déplace le bouton sans déplacer la liste : on ferme
    // plutôt que de laisser une liste flottant à côté de son bouton.
    const close = () => setOpen(false);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const selected = options.find((option) => option.value === value);

  return (
    <div className="dropdown" ref={triggerRef}>
      <button
        type="button"
        className={`dropdown-trigger ${open ? "open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((previous) => !previous)}
      >
        <span className="dropdown-trigger-label">{selected?.label ?? placeholder ?? value}</span>
        <ChevronDown size={12} strokeWidth={2.5} className="dropdown-chevron" />
      </button>
      {open &&
        placement &&
        createPortal(
          <div
            ref={menuRef}
            className={`dropdown-menu dropdown-menu--portal dropdown-menu--${align}`}
            role="listbox"
            style={{
              top: placement.top ?? undefined,
              bottom: placement.bottom ?? undefined,
              left: placement.left ?? undefined,
              right: placement.right ?? undefined,
              minWidth: placement.width,
            }}
          >
            {options.map((option) => (
              <button
                type="button"
                key={option.value}
                role="option"
                aria-selected={option.value === value}
                className={`dropdown-item ${option.value === value ? "selected" : ""}`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span>{option.label}</span>
                {option.value === value && <Check size={12} strokeWidth={2.5} />}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
