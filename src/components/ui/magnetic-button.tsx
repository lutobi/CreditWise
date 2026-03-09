"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";

export function MagneticButton({ children, className = "", magneticStrength = 0.3 }: { children: React.ReactNode, className?: string, magneticStrength?: number }) {
    const ref = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });

    const handleMouse = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!ref.current) return;
        const { clientX, clientY } = e;
        const { height, width, left, top } = ref.current.getBoundingClientRect();

        // Find the center point of the button
        const middleX = clientX - (left + width / 2);
        const middleY = clientY - (top + height / 2);

        // Set position to pull slightly toward the mouse
        setPosition({ x: middleX * magneticStrength, y: middleY * magneticStrength });
    };

    const reset = () => {
        setPosition({ x: 0, y: 0 });
    };

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMouse}
            onMouseLeave={reset}
            animate={{ x: position.x, y: position.y }}
            // High stiffness and low mass creates a tactile, snappy physical feel
            transition={{ type: "spring", stiffness: 300, damping: 20, mass: 0.5 }}
            className={`inline-block ${className}`}
        >
            {children}
        </motion.div>
    );
}
