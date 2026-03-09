"use client";

import { motion, useAnimation } from "framer-motion";
import { useEffect } from "react";

// --- Colors & Styles ---
const colors = {
    machineBase: "#f1f5f9", // slate-100
    machineBorder: "#94a3b8", // slate-400
    accent: "#10b981", // emerald-500 (Green light/flow)
    accentGlow: "rgba(16, 185, 129, 0.4)",
    pipe: "#e2e8f0", // slate-200
    conveyor: "#cbd5e1", // slate-300
    text: "#334155", // slate-700
};

// --- Shapes ---

// 1. The Coin/Token (Loan Request)
const Token = ({ delay, path }: { delay: number; path: string }) => {
    return (
        <motion.g
            initial={{ offsetDistance: "0%", opacity: 0 }}
            animate={{
                offsetDistance: "100%",
                opacity: [0, 1, 1, 1, 0] // Fade in at start, out at very end
            }}
            transition={{
                duration: 4,
                repeat: Infinity,
                ease: "linear",
                delay: delay,
            }}
            style={{ offsetPath: path }}
        >
            <circle r="6" fill="white" stroke={colors.text} strokeWidth="1.5" />
            <text x="0" y="2" textAnchor="middle" fontSize="6" fill={colors.text} fontWeight="bold">$</text>
        </motion.g>
    );
};

// 2. The Machine Body (Isometric Block)
const MachineBody = () => (
    <g transform="translate(100, 50)">
        {/* Main Box - Front Face */}
        <rect x="0" y="20" width="100" height="80" fill="white" stroke={colors.text} strokeWidth="2" rx="4" />

        {/* Side Face (Depth) */}
        <path d="M 100 20 L 120 10 L 120 90 L 100 100 Z" fill={colors.machineBase} stroke={colors.text} strokeWidth="2" />

        {/* Top Face (Depth) */}
        <path d="M 0 20 L 20 10 L 120 10 L 100 20 Z" fill={colors.machineBase} stroke={colors.text} strokeWidth="2" />

        {/* Details - Vent Grills */}
        <line x1="10" y1="35" x2="90" y2="35" stroke={colors.conveyor} strokeWidth="2" />
        <line x1="10" y1="45" x2="90" y2="45" stroke={colors.conveyor} strokeWidth="2" />
        <line x1="10" y1="55" x2="90" y2="55" stroke={colors.conveyor} strokeWidth="2" />

        {/* Screen / Terminal */}
        <rect x="15" y="70" width="40" height="20" fill="#0f172a" rx="2" />
        <text x="20" y="83" fill="#22c55e" fontSize="8" fontFamily="monospace">PROCESSING...</text>

        {/* Status Light (Blinking) */}
        <circle cx="80" cy="80" r="5" fill={colors.text} />
        <motion.circle
            cx="80" cy="80" r="3"
            fill={colors.accent}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity }}
        />
    </g>
);

// 3. Conveyor Belt (Input)
const ConveyorBelt = () => (
    <g transform="translate(0, 80)">
        {/* Belt Structure */}
        <path d="M 0 20 L 100 20 L 120 10 L 20 10 Z" fill={colors.conveyor} stroke={colors.text} strokeWidth="2" />

        {/* Moving Rollers/Lines effect */}
        <defs>
            <pattern id="beltPattern" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="10" stroke="#94a3b8" strokeWidth="2" />
            </pattern>
        </defs>
        <path d="M 0 20 L 100 20 L 120 10 L 20 10 Z" fill="url(#beltPattern)" opacity="0.3">
            <animateTransform attributeName="transform" type="translate" from="-10 0" to="0 0" dur="0.5s" repeatCount="indefinite" />
        </path>
    </g>
);

// 4. Output Pipes
const OutputPipes = () => (
    <g transform="translate(180, 80)">
        {/* Pipe 1 (Top) */}
        <path d="M 0 10 Q 30 10 40 30 T 80 50" fill="none" stroke={colors.pipe} strokeWidth="8" />
        <path d="M 0 10 Q 30 10 40 30 T 80 50" fill="none" stroke={colors.text} strokeWidth="2" />

        {/* Pipe 2 (Middle) */}
        <path d="M 0 30 Q 30 30 40 50 T 80 80" fill="none" stroke={colors.pipe} strokeWidth="8" />
        <path d="M 0 30 Q 30 30 40 50 T 80 80" fill="none" stroke={colors.text} strokeWidth="2" />

        {/* Pipe 3 (Bottom) */}
        <path d="M 0 50 Q 30 50 40 80 T 80 110" fill="none" stroke={colors.pipe} strokeWidth="8" />
        <path d="M 0 50 Q 30 50 40 80 T 80 110" fill="none" stroke={colors.text} strokeWidth="2" />

        {/* Collection Bins */}
        <ellipse cx="80" cy="55" rx="10" ry="5" fill="white" stroke={colors.text} strokeWidth="2" />
        <ellipse cx="80" cy="85" rx="10" ry="5" fill="white" stroke={colors.text} strokeWidth="2" />
        <ellipse cx="80" cy="115" rx="10" ry="5" fill="white" stroke={colors.text} strokeWidth="2" />
    </g>
);


export function OmariMachine() {
    // Define motion paths strings
    // Path 1: Input (Belt) -> Machine -> Pipe 1
    const path1 = 'path("M 10 95 L 110 95 L 150 70 L 180 90 Q 210 90 220 110 T 260 130")';
    // Path 2: Input (Belt) -> Machine -> Pipe 2
    const path2 = 'path("M 10 95 L 110 95 L 150 70 L 180 110 Q 210 110 220 130 T 260 160")';
    // Path 3: Input (Belt) -> Machine -> Pipe 3
    const path3 = 'path("M 10 95 L 110 95 L 150 70 L 180 130 Q 210 130 220 160 T 260 190")';

    return (
        <div className="w-full h-[300px] flex items-center justify-center relative bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Background Grid */}
            <div className="absolute inset-0 z-0 opacity-[0.2]" style={{ backgroundImage: "radial-gradient(#94a3b8 1px, transparent 1px)", backgroundSize: "20px 20px" }} />

            <div className="relative z-10 scale-[0.8] md:scale-100 origin-center">
                <svg width="350" height="250" viewBox="0 0 350 250" className="overflow-visible">
                    {/* 1. Input Side: Conveyor */}
                    <ConveyorBelt />

                    {/* 2. Central Unit: The Machine */}
                    <MachineBody />

                    {/* 3. Output Side: Pipes */}
                    <OutputPipes />

                    {/* 4. Moving Tokens (HTML/Motion layered on top via Portal or just straight in SVG if simple) */}
                    {/* Note: offset-path in SVG doesn't work well in all browsers with simple props, 
                    using CSS offset-path via motion style is better but needs specific coord matching.
                    For robustness, we'll use framer's animate along path or approximate via keyframes if path is tricky. 
                    Here I used standard SVG paths above roughly mapped to visual coordinates. 
                    Let's use a simpler visual simulation since precise SVG path following in React can be complex without dedicated libs.
                 */}
                </svg>

                {/* Overlay Motion Divs for Tokens - Using CSS Offset Path which is widely supported in modern browsers for this effect */}
                {/* We map the movement visually: 
                Start: (Left belt) 
                Mid: (Machine Center)
                End: (Pipe Out)
            */}

                {/* Flow 1 */}
                <motion.div
                    className="absolute w-4 h-4 bg-white border-2 border-slate-700 rounded-full flex items-center justify-center z-20 shadow-sm"
                    initial={{ left: "10px", top: "105px", scale: 0.8, opacity: 0 }}
                    animate={{
                        left: ["10px", "110px", "140px", "190px", "260px"],
                        top: ["105px", "105px", "80px", "95px", "135px"],
                        scale: [0.8, 1, 0, 1, 0.8], // "Disappear" inside machine then reappear
                        opacity: [1, 1, 0, 1, 0]
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: 0 }}
                >
                    <span className="text-[8px] font-bold text-slate-700">$</span>
                </motion.div>

                {/* Flow 2 */}
                <motion.div
                    className="absolute w-4 h-4 bg-white border-2 border-slate-700 rounded-full flex items-center justify-center z-20 shadow-sm"
                    initial={{ left: "10px", top: "105px", scale: 0.8, opacity: 0 }}
                    animate={{
                        left: ["10px", "110px", "140px", "190px", "260px"],
                        top: ["105px", "105px", "80px", "115px", "165px"],
                        scale: [0.8, 1, 0, 1, 0.8],
                        opacity: [1, 1, 0, 1, 0]
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: 1 }}
                >
                    <span className="text-[8px] font-bold text-slate-700">$</span>
                </motion.div>

                {/* Flow 3 */}
                <motion.div
                    className="absolute w-4 h-4 bg-white border-2 border-slate-700 rounded-full flex items-center justify-center z-20 shadow-sm"
                    initial={{ left: "10px", top: "105px", scale: 0.8, opacity: 0 }}
                    animate={{
                        left: ["10px", "110px", "140px", "190px", "260px"],
                        top: ["105px", "105px", "80px", "135px", "195px"],
                        scale: [0.8, 1, 0, 1, 0.8],
                        opacity: [1, 1, 0, 1, 0]
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: 2 }}
                >
                    <span className="text-[8px] font-bold text-slate-700">$</span>
                </motion.div>
            </div>
        </div>
    );
}
