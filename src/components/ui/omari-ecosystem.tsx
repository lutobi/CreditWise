"use client";

import { motion, useTime, useTransform } from "framer-motion";
import { ShieldCheck, Briefcase, Landmark, Zap, Banknote, Fingerprint } from "lucide-react";
import React from "react";

// --- OMARI CORE FEATURES (THE SATELLITES) ---
const FEATURES = [
    { icon: Fingerprint, label: "Identity Verified", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" },
    { icon: Briefcase, label: "Payroll Synced", color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/30" },
    { icon: Landmark, label: "Real-Time Clearing", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
    { icon: Zap, label: "Algorithmic Approval", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
    { icon: Banknote, label: "Instant Settlement", color: "text-teal-400", bg: "bg-teal-500/10", border: "border-teal-500/30" },
];

/**
 * MATHEMATICAL 3D ORBIT ENGINE
 * We use `useTime` from framer-motion to create an infinitely smooth ticker.
 * We map the time to a 360-degree angle over 25 seconds.
 * Then use basic Trigonometry (Cos for X, Sin for Y) to trace an ellipse.
 * We also map the Sin(angle) to the Scale and Z-Index, so items in the "front" (Sin > 0)
 * are larger and overlap the center hub, while items in the "back" (Sin < 0) shrink.
 */
function SatelliteNode({ feature, index, total }: { feature: typeof FEATURES[0], index: number, total: number }) {
    const time = useTime();

    // One full orbit every 25 seconds = pure elegance
    const DURATION = 25000;

    // Spread the satellites evenly across the 360 degree circle
    const angleOffset = (360 / total) * index;

    // 1. Calculate the current angle for this specific satellite
    const angle = useTransform(time, (t) => {
        const progress = (t % DURATION) / DURATION;
        return (progress * 360 + angleOffset) % 360;
    });

    // 2. Map Angle to X, Y coordinates (Circular Orbit)
    const RADIUS = 250;

    const x = useTransform(angle, (a) => Math.cos((a * Math.PI) / 180) * RADIUS);
    const y = useTransform(angle, (a) => Math.sin((a * Math.PI) / 180) * RADIUS);

    // 3. Map Y-position (Sin) to Scale (3D Depth Illusion)
    const scale = useTransform(angle, () => 1);

    // 4. Map Y-position to Z-Index
    // Ensure it always sits above the core
    const zIndex = useTransform(angle, () => 30);

    // 5. Opacity fade in the deep back to enhance depth
    const opacity = useTransform(angle, () => 1);

    const Icon = feature.icon;

    return (
        <motion.div
            style={{ x, y, scale, zIndex, opacity }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center gap-3"
        >
            {/* The Glassmorphic Circle Node */}
            <div className={`w-16 h-16 rounded-full flex items-center justify-center backdrop-blur-md md:backdrop-blur-xl border border-white/40 shadow-xl ${feature.bg}`}>
                <Icon className={`w-7 h-7 ${feature.color}`} />
            </div>

            {/* The Label Pill */}
            <div className={`px-4 py-2 rounded-full backdrop-blur-md md:backdrop-blur-xl border border-white/40 shadow-xl whitespace-nowrap bg-white/50`}>
                <span className="text-xs font-extrabold text-slate-900 tracking-wide">{feature.label}</span>
            </div>
        </motion.div>
    );
}

export function OmariEcosystem() {
    return (
        <div
            className="relative w-full h-[700px] flex items-center justify-center select-none xl:-mr-12 perspective-1000 overflow-visible"
        >

            {/* --- DEEP AMBIENT GLOWS --- */}
            {/* Creates a high-end void connecting the elements */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-violet-600/10 rounded-full blur-[150px] opacity-70 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-emerald-500/20 rounded-full blur-[120px] pointer-events-none" />


            {/* --- THE CENTRAL HUB (Omari Core) --- */}
            <motion.div
                animate={{ boxShadow: ["0 0 20px rgba(139,92,246,0.2)", "0 0 40px rgba(139,92,246,0.4)", "0 0 20px rgba(139,92,246,0.2)"] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="relative z-20 w-48 h-48 rounded-full border border-white/10 bg-slate-900/40 backdrop-blur-md md:backdrop-blur-2xl flex items-center justify-center shadow-2xl overflow-hidden"
            >
                {/* Subtle Inner Gradient representing pure logic */}
                <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/10 via-transparent to-emerald-500/10 rounded-full" />

                {/* Glowing Core Dot */}
                <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="w-12 h-12 rounded-full bg-violet-500/30 blur-md absolute"
                />

                {/* The Integrated Omari Logo (Breathing & Glowing) */}
                <motion.div
                    animate={{ scale: [1, 1.03, 1] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    className="relative z-10 w-24 h-24 rounded-full flex items-center justify-center bg-white/5 backdrop-blur-md md:backdrop-blur-3xl shadow-[inset_0_0_20px_rgba(255,255,255,0.2)] border border-white/10"
                >
                    {/* Inner glowing aura to blend the primary color with the background */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-violet-500/20 to-emerald-500/10 blur-md mix-blend-screen" />

                    {/* The Logo itself, slightly faded and seamlessly glowing */}
                    <motion.div
                        animate={{ opacity: [0.85, 1, 0.85] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-primary/90 text-primary-foreground font-bold text-3xl drop-shadow-[0_0_20px_rgba(139,92,246,0.5)] border border-primary/50"
                    >
                        O
                    </motion.div>
                </motion.div>
            </motion.div>


            {/* --- THE ORBIT PATHWAYS (Visual Rings) --- */}
            {/* A circle showing the flight path of the satellites */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border border-slate-300/40 border-dashed pointer-events-none z-10" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full border border-slate-200/30 pointer-events-none z-10" />


            {/* --- THE SATELLITES (Orbital Features) --- */}
            <div className="absolute inset-0 z-30">
                {FEATURES.map((feature, idx) => (
                    <SatelliteNode
                        key={idx}
                        feature={feature}
                        index={idx}
                        total={FEATURES.length}
                    />
                ))}
            </div>

        </div>
    );
}
