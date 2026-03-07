"use client";

import { useEffect, useRef, useState } from "react";
import { useScroll, useSpring, useMotionValueEvent } from "framer-motion";

const FRAME_COUNT = 120; //Number of frames you have 
const DOMAIN = "dnqj83gfp"; // Your Cloudinary cloud name

// Generate the specific Cloudinary URL for a frame
function getFrameUrl(index: number) {
    // E.g., index 1 becomes "001"
    const padded = String(index).padStart(3, "0");

    // f_auto = automatic format (WebP/AVIF instead of JPG for huge size savings)
    // q_auto = automatic quality
    // w_1920 = scale down to 1920px width max so it loads instantly even if original is 4K
    return `https://res.cloudinary.com/${DOMAIN}/image/upload/f_auto,q_auto,w_1920/v1/ezgif-frame-${padded}.jpg`;
}

export function ScrollImageSequence() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imagesRef = useRef<(HTMLImageElement | null)[]>([]);
    const [imagesLoaded, setImagesLoaded] = useState(0);

    // Framer Motion hooks for smooth scrolling
    const { scrollYProgress } = useScroll();
    const smoothProgress = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001,
    });

    // Preload frames when the component mounts
    useEffect(() => {
        // 1. Prepare an empty array to store our Image objects
        const loadedImages: (HTMLImageElement | null)[] = new Array(FRAME_COUNT).fill(null);

        // 2. Loop through all your frames and start loading them in the background
        for (let i = 1; i <= FRAME_COUNT; i++) {
            const img = new window.Image();
            img.src = getFrameUrl(i);

            // When an image finishes loading, draw it if it's the very first frame
            img.onload = () => {
                loadedImages[i - 1] = img;
                setImagesLoaded((prev) => prev + 1);

                // Draw the first frame immediately so the screen isn't black
                if (i === 1) {
                    drawFrame(0, loadedImages);
                }
            };
        }

        // Save to generic ref for use in scrolling later
        imagesRef.current = loadedImages;
    }, []);

    // Update canvas when the user scrolls
    useMotionValueEvent(smoothProgress, "change", (latestScroll) => {
        // Determine which frame index to show based on scroll percentage (0.0 to 1.0)
        const frameIndex = Math.min(
            FRAME_COUNT - 1,
            Math.max(0, Math.floor(latestScroll * FRAME_COUNT))
        );
        drawFrame(frameIndex, imagesRef.current);
    });

    // Helper inside the component to draw the specific frame to the <canvas>
    const drawFrame = (index: number, imagesArray: (HTMLImageElement | null)[]) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        const img = imagesArray[index];

        if (ctx && img) {
            // Set the canvas internal size to match the image dimensions
            canvas.width = img.width;
            canvas.height = img.height;

            // Draw the image exactly on the canvas 
            ctx.drawImage(img, 0, 0, img.width, img.height);
        }
    };

    return (
        <div className="fixed inset-0 w-full h-full -z-10 bg-black pointer-events-none">
            {/* 
        This is a loader that shows at the top right if frames are currently downloading 
        Feel free to remove it if you don't like it
      */}
            {imagesLoaded < FRAME_COUNT && (
                <div className="absolute top-4 right-4 z-50 text-white/50 text-xs font-mono">
                    Loading HD frames: {Math.round((imagesLoaded / FRAME_COUNT) * 100)}%
                </div>
            )}

            {/* The actual canvas where the "video" plays dynamically */}
            <canvas
                ref={canvasRef}
                className="w-full h-full object-cover opacity-[0.65]"
            />

            {/* The dark gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/60" />
        </div>
    );
}
