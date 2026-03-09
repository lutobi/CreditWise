"use client";

import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";

interface AnimatedNumberProps {
    value: number;
    className?: string;
    prefix?: string;
}

export function AnimatedNumber({ value, className = "", prefix = "" }: AnimatedNumberProps) {
    const spring = useSpring(value, {
        mass: 0.8,
        stiffness: 75,
        damping: 15
    });

    const display = useTransform(spring, (current) => {
        return `${prefix}${Intl.NumberFormat("en-NA", { maximumFractionDigits: 0 }).format(Math.round(current))}`;
    });

    useEffect(() => {
        spring.set(value);
    }, [spring, value]);

    return (
        <motion.span className={className}>
            {display}
        </motion.span>
    );
}
