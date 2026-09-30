"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const SmoothScroll = ({ children }) => {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const isTouch =
      typeof window !== "undefined" &&
      (window.matchMedia("(hover: none), (pointer: coarse)").matches ||
        window.innerWidth < 1024);

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smooth: true,
      syncTouch: true,
      smoothTouch: true,
      touchMultiplier: 1.5,
    });

    // Expose the active Lenis instance globally so other components (e.g. the
    // navbar menu) can request smooth scroll-to-section animations through
    // the same engine that's already running. Falling back to native
    // window.scrollTo would fight Lenis and feel jumpy.
    if (typeof window !== "undefined") {
      window.__lenis = lenis;
    }

    lenis.on("scroll", ScrollTrigger.update);

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });

    gsap.ticker.lagSmoothing(0);

    // Refresh ScrollTrigger after initial mount and after preloader finishes
    setTimeout(() => ScrollTrigger.refresh(), 400);
    setTimeout(() => ScrollTrigger.refresh(), 1500);
    setTimeout(() => ScrollTrigger.refresh(), 3500);

    return () => {
      lenis.destroy();
      if (typeof window !== "undefined" && window.__lenis === lenis) {
        delete window.__lenis;
      }
    };
  }, []);

  return children;
};

export default SmoothScroll;
