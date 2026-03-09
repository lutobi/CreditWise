"use client";

import { motion, useInView, Variants } from "framer-motion";
import { useRef } from "react";

interface ScrollRevealProps {
    children: React.ReactNode;
    delay?: number;
    duration?: number;
    yOffset?: number;
    xOffset?: number;
    className?: string;
    staggerChildren?: number;
}

export function ScrollReveal({
    children,
    delay = 0,
    duration = 0.5,
    yOffset = 30,
    xOffset = 0,
    className = "",
    staggerChildren = 0,
}: ScrollRevealProps) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "0px 0px -50px 0px" });

    const variants: Variants = {
        hidden: { opacity: 0, y: yOffset, x: xOffset },
        visible: {
            opacity: 1,
            y: 0,
            x: 0,
            transition: {
                duration,
                delay,
                ease: "easeOut",
                staggerChildren: staggerChildren,
            },
        },
    };

    return (
        <motion.div
            ref={ref}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            variants={variants}
            className={className}
        >
            {children}
        </motion.div>
    );
}
