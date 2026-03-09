"use client";

import { motion, TargetAndTransition } from "framer-motion";
import { User, FileCheck, Building2, Wallet, ShieldCheck, ArrowRight } from "lucide-react";

export function FlowDiagram() {
    // Animation variants
    const pulse: TargetAndTransition = {
        scale: [1, 1.05, 1],
        opacity: [0.8, 1, 0.8],
        transition: { duration: 3, repeat: Infinity, ease: "easeInOut" },
    };

    const flowLine: TargetAndTransition = {
        pathLength: [0, 1],
        opacity: [0, 1, 0],
        transition: { duration: 2, repeat: Infinity, ease: "linear" },
    };

    const orbit = {
        rotate: 360,
        transition: { duration: 20, repeat: Infinity, ease: "linear" }
    };

    return (
        <div className="relative w-full h-[500px] flex items-center justify-center overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute inset-0 bg-gradient-radial from-primary/20 to-transparent opacity-30 blur-3xl" />

            {/* Central Hub (Omari) */}
            <motion.div
                animate={pulse}
                className="relative z-10 w-32 h-32 rounded-full bg-slate-950 border border-primary/50 shadow-[0_0_50px_rgba(var(--primary),0.3)] flex items-center justify-center"
            >
                <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping opacity-20" />
                <ShieldCheck className="w-16 h-16 text-primary" />
            </motion.div>

            {/* Orbiting Elements Container */}
            <div className="absolute inset-0">
                <svg className="absolute inset-0 w-full h-full text-primary/20" style={{ filter: "drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))" }}>
                    {/* Connection Lines - Defining paths for data flow */}

                    {/* Left (User) to Center */}
                    <motion.path
                        d="M 20% 50% Q 35% 50% 50% 50%"
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeDasharray="10 10" // Static dashed line
                    />
                    <motion.path
                        d="M 20% 50% Q 35% 50% 50% 50%"
                        fill="transparent"
                        stroke="url(#gradient-flow)"
                        strokeWidth="4"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: [0, 1, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
                    />

                    {/* Center to Top (Verify) */}
                    <motion.path
                        d="M 50% 50% Q 50% 35% 50% 20%"
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeDasharray="10 10"
                    />
                    <motion.path
                        d="M 50% 50% Q 50% 35% 50% 20%"
                        fill="transparent"
                        stroke="url(#gradient-flow)"
                        strokeWidth="4"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: [0, 1, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1, repeatDelay: 1 }}
                    />

                    {/* Center to Right (Bank) */}
                    <motion.path
                        d="M 50% 50% Q 65% 50% 80% 50%"
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeDasharray="10 10"
                    />
                    <motion.path
                        d="M 50% 50% Q 65% 50% 80% 50%"
                        fill="transparent"
                        stroke="url(#gradient-flow)"
                        strokeWidth="4"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: [0, 1, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 2, repeatDelay: 1 }}
                    />

                    {/* Definitions for Gradients */}
                    <defs>
                        <linearGradient id="gradient-flow" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="transparent" />
                            <stop offset="50%" stopColor="currentColor" stopOpacity="1" />
                            <stop offset="100%" stopColor="transparent" />
                        </linearGradient>
                    </defs>
                </svg>

                {/* Nodes - Positioned Absolutely based on percentages to match SVG paths */}

                {/* Node 1: User (Left) */}
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="absolute top-1/2 left-[15%] -translate-y-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
                >
                    <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center shadow-xl">
                        <User className="w-8 h-8 text-blue-400" />
                    </div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Applicant</span>
                </motion.div>

                {/* Node 2: Verification (Top) */}
                <motion.div
                    initial={{ opacity: 0, y: -50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="absolute top-[15%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2"
                >
                    <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center shadow-xl">
                        <FileCheck className="w-8 h-8 text-emerald-400" />
                    </div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">AI Analysis</span>
                </motion.div>

                {/* Node 3: Bank (Right) */}
                <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                    className="absolute top-1/2 right-[15%] -translate-y-1/2 translate-x-1/2 flex flex-col items-center gap-2"
                >
                    <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center shadow-xl">
                        <Building2 className="w-8 h-8 text-purple-400" />
                    </div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Disbursement</span>
                </motion.div>
            </div>

            {/* Floating Particles/Data Packets */}
            {/* You can add more small motion.divs here that follow the SVG paths if needed for more complexity */}
        </div>
    );
}
