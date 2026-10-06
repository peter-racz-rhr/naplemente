"use client";
/**
 * Aceternity UI Floating Dock, adapted for Naplemente:
 * - the magnifying dock is used on phones too, driven by pointer events so
 *   it follows a dragging thumb as well as a mouse;
 * - items are Next links with an active state for the current tab.
 * Original: https://ui.aceternity.com/components/floating-dock
 **/

import { cn } from "@/lib/utils";
import {
  AnimatePresence,
  MotionValue,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";
import Link from "next/link";
import { useRef, useState } from "react";

export type DockItem = {
  title: string;
  icon: React.ReactNode;
  href: string;
  /** Passed to the link so pages can animate in the right direction. */
  transitionTypes?: string[];
};

export const FloatingDock = ({
  items,
  activeHref,
  className,
}: {
  items: DockItem[];
  activeHref?: string;
  className?: string;
}) => {
  const pointerX = useMotionValue(Infinity);
  const release = () => pointerX.set(Infinity);

  return (
    <motion.nav
      aria-label="Main"
      onPointerMove={(e) => pointerX.set(e.clientX)}
      onPointerLeave={release}
      onPointerUp={release}
      onPointerCancel={release}
      className={cn(
        "mx-auto flex h-[4.5rem] touch-none items-end gap-4 rounded-full border border-dusk-edge bg-dusk/85 px-4 pb-3 backdrop-blur-xl",
        className,
      )}
    >
      {items.map((item) => (
        <IconContainer
          pointerX={pointerX}
          key={item.title}
          active={item.href === activeHref}
          {...item}
        />
      ))}
    </motion.nav>
  );
};

const spring = { mass: 0.1, stiffness: 150, damping: 12 };

function IconContainer({
  pointerX,
  title,
  icon,
  href,
  transitionTypes,
  active,
}: DockItem & { pointerX: MotionValue<number>; active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  const distance = useTransform(pointerX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const size = useSpring(
    useTransform(distance, [-110, 0, 110], [48, 66, 48]),
    spring,
  );
  const iconSize = useSpring(
    useTransform(distance, [-110, 0, 110], [22, 30, 22]),
    spring,
  );

  const [pressed, setPressed] = useState(false);

  return (
    <Link
      href={href}
      transitionTypes={transitionTypes}
      aria-label={title}
      aria-current={active ? "page" : undefined}
      onPointerEnter={() => setPressed(true)}
      onPointerLeave={() => setPressed(false)}
      onPointerUp={() => setPressed(false)}
      className="rounded-full outline-offset-4 focus-visible:outline-2"
    >
      <motion.div
        ref={ref}
        style={{ width: size, height: size }}
        className={cn(
          "relative flex aspect-square items-center justify-center rounded-full transition-colors",
          // Outline icons straight on the glass; the current tab gets a soft lit disc.
          active ? "text-ink" : "text-ink/65",
        )}
      >
        {/* One shared disc that glides to whichever tab is current. */}
        {active && (
          <motion.span
            layoutId="dock-active-disc"
            aria-hidden
            className="absolute inset-0 rounded-full bg-white/14"
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          />
        )}
        <AnimatePresence>
          {pressed && (
            <motion.div
              initial={{ opacity: 0, y: 10, x: "-50%" }}
              animate={{ opacity: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, y: 2, x: "-50%" }}
              className="pointer-events-none absolute -top-9 left-1/2 w-fit rounded-lg border border-dusk-edge bg-dusk px-2.5 py-1 text-xs whitespace-pre text-ink"
            >
              {title}
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div
          style={{ width: iconSize, height: iconSize }}
          className="relative flex items-center justify-center [&_svg]:size-full"
        >
          {icon}
        </motion.div>
      </motion.div>
    </Link>
  );
}
