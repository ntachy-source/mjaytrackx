import { useState, useRef, useCallback, useEffect } from "react";
import { GripHorizontal } from "lucide-react";

interface MobileBottomSheetProps {
  children: React.ReactNode;
}

type SnapPoint = "peek" | "half" | "full";

const PEEK_HEIGHT = 72;
const HEADER_HEIGHT = 48; // mobile status bar

const MobileBottomSheet = ({ children }: MobileBottomSheetProps) => {
  const [snap, setSnap] = useState<SnapPoint>("peek");
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  const getSnapHeight = useCallback((point: SnapPoint) => {
    const vh = window.innerHeight - HEADER_HEIGHT;
    switch (point) {
      case "peek": return PEEK_HEIGHT;
      case "half": return vh * 0.45;
      case "full": return vh - 8;
    }
  }, []);

  const currentHeight = getSnapHeight(snap) + (dragging ? -dragOffset : 0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
    startHeightRef.current = getSnapHeight(snap);
    setDragging(true);
  }, [snap, getSnapHeight]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging) return;
    const dy = e.touches[0].clientY - startYRef.current;
    setDragOffset(dy);
  }, [dragging]);

  const handleTouchEnd = useCallback(() => {
    setDragging(false);
    const finalHeight = startHeightRef.current - dragOffset;
    const vh = window.innerHeight - HEADER_HEIGHT;

    // Snap to closest point
    const points: SnapPoint[] = ["peek", "half", "full"];
    const heights = points.map((p) => getSnapHeight(p));
    let closest = points[0];
    let closestDist = Math.abs(finalHeight - heights[0]);
    for (let i = 1; i < points.length; i++) {
      const dist = Math.abs(finalHeight - heights[i]);
      if (dist < closestDist) {
        closest = points[i];
        closestDist = dist;
      }
    }

    // Also check velocity: if dragged down fast, go to peek; if up fast, expand
    if (dragOffset > 80) {
      closest = snap === "full" ? "half" : "peek";
    } else if (dragOffset < -80) {
      closest = snap === "peek" ? "half" : "full";
    }

    setDragOffset(0);
    setSnap(closest);
  }, [dragging, dragOffset, snap, getSnapHeight]);

  // Also support mouse for testing
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    startYRef.current = e.clientY;
    startHeightRef.current = getSnapHeight(snap);
    setDragging(true);

    const handleMouseMove = (ev: MouseEvent) => {
      const dy = ev.clientY - startYRef.current;
      setDragOffset(dy);
    };
    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      // Trigger end logic via state
      setDragging(false);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [snap, getSnapHeight]);

  // Resolve snap on mouse drag end
  useEffect(() => {
    if (!dragging && dragOffset !== 0) {
      const finalHeight = startHeightRef.current - dragOffset;
      const points: SnapPoint[] = ["peek", "half", "full"];
      let closest = points[0];
      let closestDist = Math.abs(finalHeight - getSnapHeight(points[0]));
      for (let i = 1; i < points.length; i++) {
        const dist = Math.abs(finalHeight - getSnapHeight(points[i]));
        if (dist < closestDist) {
          closest = points[i];
          closestDist = dist;
        }
      }
      if (dragOffset > 80) {
        closest = snap === "full" ? "half" : "peek";
      } else if (dragOffset < -80) {
        closest = snap === "peek" ? "half" : "full";
      }
      setDragOffset(0);
      setSnap(closest);
    }
  }, [dragging]);

  const clampedHeight = Math.max(PEEK_HEIGHT, Math.min(currentHeight, window.innerHeight - HEADER_HEIGHT - 8));

  return (
    <div
      ref={sheetRef}
      className="absolute left-0 right-0 bottom-0 z-30 bg-card/95 backdrop-blur-md border-t border-border rounded-t-2xl overflow-hidden"
      style={{
        height: clampedHeight,
        transition: dragging ? "none" : "height 0.3s cubic-bezier(0.25, 1, 0.5, 1)",
      }}
    >
      {/* Drag handle */}
      <div
        className="flex items-center justify-center py-2 cursor-grab active:cursor-grabbing touch-none select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        <div className="w-10 h-1 rounded-full bg-muted-foreground/40" />
      </div>

      {/* Content */}
      <div className="overflow-y-auto" style={{ height: clampedHeight - 28 }}>
        {children}
      </div>
    </div>
  );
};

export default MobileBottomSheet;
