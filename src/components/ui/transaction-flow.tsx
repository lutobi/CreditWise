"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { ShieldCheck, Zap, Building2, User, Check, Lock } from "lucide-react";

const ProcessingNode = () => {
    return (
        <div className="relative flex flex-col items-center justify-center">
            {/* Pulse Effect */}
            <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 bg-primary/20 rounded-full blur-xl"
            />

            {/* Core */}
            <div className="relative z-10 w-20 h-20 bg-white rounded-2xl shadow-2xl border border-slate-100 flex items-center justify-center">
                <Lock className="w-8 h-8 text-primary" />
            </div>

            {/* Scanner Light */}
            <motion.div
                animate={{ top: ["0%", "100%", "0%"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent opacity-50 z-20"
            />
            <div className="mt-4 font-bold text-slate-700 text-xs tracking-widest uppercase">Security Core</div>
        </div>
    );
};

const TransactionParticle = ({ delay }: { delay: number }) => {
    return (
        <motion.div
            initial={{ x: -150, opacity: 0, scale: 0.5 }}
            animate={{
                x: [-150, 0, 0, 150], // Enter, Stop at Center, Exit
                opacity: [0, 1, 1, 0],
                scale: [0.5, 1, 1, 0.5]
            }}
            transition={{
                duration: 4,
                times: [0, 0.3, 0.7, 1], // Spend time in the middle branding
                repeat: Infinity,
                delay: delay,
                ease: "easeInOut"
            }}
            className="absolute top-1/2 -translate-y-1/2 z-0"
        >
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-lg border border-slate-100">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-mono text-slate-500 font-bold">N$ 5,000</span>
            </div>
        </motion.div>
    );
};

export function TransactionFlow() {
    return (
        <div className="w-full h-[400px] flex items-center justify-center relative overflow-hidden bg-slate-50/50 rounded-3xl border border-slate-200/50">
            {/* Grid Background */}
            <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)", backgroundSize: "30px 30px", opacity: 0.3 }}></div>

            {/* Connection Line */}
            <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-200 -translate-y-1/2 w-[80%] mx-auto" />

            {/* Left Node (User) */}
            <div className="absolute left-[10%] top-1/2 -translate-y-1/2 flex flex-col items-center gap-3 z-10">
                <div className="w-12 h-12 bg-white rounded-full shadow-md border border-slate-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-slate-400" />
                </div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Request</span>
            </div>

            {/* Right Node (Bank) */}
            <div className="absolute right-[10%] top-1/2 -translate-y-1/2 flex flex-col items-center gap-3 z-10">
                <div className="w-12 h-12 bg-white rounded-full shadow-md border border-slate-100 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-slate-400" />
                </div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Settlement</span>
            </div>

            {/* Particles Flowing */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <TransactionParticle delay={0} />
                <TransactionParticle delay={2} />
            </div>

            {/* Central Processor */}
            <div className="z-20">
                <ProcessingNode />
            </div>

            {/* Success Indicators floating up */}
            <motion.div
                animate={{ y: [0, -50], opacity: [1, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: 1.5 }}
                className="absolute top-[40%] left-[55%] z-0 pointer-events-none"
            >
                <Check className="w-6 h-6 text-green-500" />
            </motion.div>
        </div>
    );
}
