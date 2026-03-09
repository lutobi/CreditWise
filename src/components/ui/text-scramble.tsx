"use client";

import { useEffect, useState } from "react";

const CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";

interface TextScrambleProps {
    phrases: string[];
    className?: string;
}

export function TextScramble({ phrases, className = "" }: TextScrambleProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [displayText, setDisplayText] = useState(phrases[0]);

    useEffect(() => {
        let frame = 0;
        const targetText = phrases[currentIndex];
        const currentLength = Math.max(targetText.length, displayText.length); // Pad if necessary

        const scrambleInterval = setInterval(() => {
            let scrambled = "";
            for (let i = 0; i < currentLength; i++) {
                // Once the frame passes a character's index * factor, it locks in place 
                if (frame >= i * 2 && i < targetText.length) {
                    scrambled += targetText[i];
                } else if (i < targetText.length) {
                    scrambled += CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
                }
            }
            setDisplayText(scrambled);
            frame++;

            // Stop scrambling once all characters are decoded
            if (frame > currentLength * 2 + 5) {
                clearInterval(scrambleInterval);
            }
        }, 40);

        // Next phrase rotation
        const phraseTimeout = setTimeout(() => {
            setCurrentIndex((prev) => (prev + 1) % phrases.length);
        }, 4000);

        return () => {
            clearInterval(scrambleInterval);
            clearTimeout(phraseTimeout);
        };
    }, [currentIndex, phrases]);

    return (
        <span className={`inline-block ${className}`}>
            {displayText}
        </span>
    );
}
