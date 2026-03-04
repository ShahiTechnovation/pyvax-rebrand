"use client";

import { useState } from "react";
import Image from "next/image";
import {
    useScroll,
    useSpring,
    useMotionValueEvent,
} from "framer-motion";

const FRAME_COUNT = 192; // you measured this

function frameSrc(index: number) {
    const padded = String(index).padStart(4, "0");
    return `/pyvax-frames/frame_${padded}.jpg`;
}

export function ScrollImageSequence() {
    const [currentFrame, setCurrentFrame] = useState(1);

    const { scrollYProgress } = useScroll();

    const smoothProgress = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001,
    });

    useMotionValueEvent(smoothProgress, "change", (v) => {
        const index = Math.min(
            FRAME_COUNT - 1,
            Math.max(0, Math.round(v * (FRAME_COUNT - 1)))
        );
        setCurrentFrame(index + 1);
    });

    return (
        <div className="fixed inset-0 w-full h-full -z-10 bg-black pointer-events-none">
            <Image
                src={frameSrc(currentFrame)}
                alt="PyVax story sequence background"
                fill
                priority
                className="object-cover opacity-[0.65]"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/60" />
        </div>
    );
}
