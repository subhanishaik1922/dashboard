"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { motion } from "framer-motion";

const HeroSection = () => {
  const sectionRef = useRef(null);
  const mediaContainerRef = useRef(null);
  const videoRef = useRef(null);
  const loaderRef = useRef(null);
  const [loaderDone, setLoaderDone] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentText, setCurrentText] = useState("సుభాని పోర్ట్‌ఫోలియో");

  useEffect(() => {
    if (typeof window === "undefined") return;

    document.body.style.overflow = "hidden";

    // Initial hidden state setup for hero visual
    gsap.set(mediaContainerRef.current, { autoAlpha: 0, scale: 1.05 });

    const tl = gsap.timeline({
      onComplete: () => {
        setLoaderDone(true);
        document.body.style.overflow = "";
      },
    });

    // Loader slide up reveal
    tl.to(
      loaderRef.current,
      {
        y: "-100%",
        duration: 1.1,
        ease: "power3.out",
      },
      "start+=3.0"
    );

    // Hero visual reveal
    tl.to(
      mediaContainerRef.current,
      {
        autoAlpha: 1,
        scale: 1,
        duration: 1.2,
        ease: "power2.out",
      },
      "start+=3.2"
    );

    // Multilingual transition: Telugu -> Hindi -> English
    const t1 = setTimeout(() => setCurrentText("सुभानी पोर्टफोलियो"), 1000);
    const t2 = setTimeout(() => setCurrentText("SHAIK MAHABOOB SUBHANI"), 2000);

    return () => {
      tl.kill();
      clearTimeout(t1);
      clearTimeout(t2);
      document.body.style.overflow = "";
    };
  }, []);

  const handleScrollToWork = (e) => {
    e.preventDefault();
    const target = document.getElementById("projects-section") || document.getElementById("about");
    if (target) {
      const lenis = window.__lenis;
      if (lenis && typeof lenis.scrollTo === "function") {
        lenis.scrollTo(target, { offset: 0, duration: 1.4 });
      } else {
        target.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.muted = false;
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.log("Video unmuted play failed, falling back to muted play:", err);
          videoRef.current.muted = true;
          videoRef.current.play();
          setIsPlaying(true);
        });
    }
  };

  // Framer Motion reveal variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 2.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  };

  return (
    <>
      {/* Loader Overlay */}
      <div
        id="loader"
        ref={loaderRef}
        style={{
          backgroundColor: "#0d0d11",
          zIndex: 100002,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col items-center justify-center text-center px-4"
        >
          {/* Logo Avatar */}
          <img
            src="/avatar.png"
            alt="Shaik Mahaboob Subhani"
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border border-white/10 mb-6 object-cover shadow-2xl ring-2 ring-accent/30"
          />

          {/* Language Text Animating */}
          <div className="h-10 flex items-center justify-center overflow-hidden">
            <motion.div
              key={currentText}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="text-[#F5F1EA] text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-widest uppercase"
              style={{ fontFamily: "'Neue Montreal', 'Inter', sans-serif" }}
            >
              {currentText}
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Hero Section Container */}
      <section
        id="hero-section"
        ref={sectionRef}
        className="relative w-full h-screen min-h-[600px] overflow-hidden select-none transition-colors duration-300"
        style={{
          backgroundColor: "var(--color-bg)",
          color: "var(--color-text)",
        }}
      >
        {/* Background Visual Media: Image by default, Video with audio when playing */}
        <div
          ref={mediaContainerRef}
          className="absolute inset-0 w-full h-full z-0 overflow-hidden bg-white dark:bg-[#0A0A0C]"
        >
          {/* Animated Hero Image (Visible when NOT playing) */}
          <img
            src="/hero-image.png"
            onError={(e) => {
              if (e.currentTarget.src.indexOf("Hero%20Image.png") === -1) {
                e.currentTarget.src = "/Hero Image.png";
              }
            }}
            alt="Mahaboob Subhani Shaik"
            className={`absolute inset-0 w-full h-full object-cover object-[center_top] md:object-[60%_top] transition-opacity duration-700 ease-in-out ${
              isPlaying ? "opacity-0 pointer-events-none" : "opacity-100"
            }`}
          />

          {/* User's Animated Video with Audio (Plays and becomes visible when playing) */}
          <video
            ref={videoRef}
            src="/hero-talking-video.mp4"
            onError={(e) => {
              if (e.currentTarget.src.indexOf("Hero%20Talking%20Video.mp4") === -1) {
                e.currentTarget.src = "/Hero Talking Video.mp4";
                e.currentTarget.load();
              }
            }}
            loop
            playsInline
            preload="auto"
            onEnded={() => setIsPlaying(false)}
            className={`absolute inset-0 w-full h-full object-cover object-[center_top] md:object-[60%_top] transition-opacity duration-700 ease-in-out ${
              isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          />

          {/* No overlays or boxes: video is fully visible, crisp, and unblocked */}
        </div>

        {/* Content Corner Overlay - Vertically Centered in the Middle-Left: Pure text, no border or box */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={loaderDone ? "visible" : "hidden"}
          className="absolute top-1/2 -translate-y-1/2 left-6 sm:left-12 lg:left-20 z-10 max-w-[540px] flex flex-col items-start text-left pointer-events-auto"
        >
          <motion.span
            variants={itemVariants}
            className="text-[10px] sm:text-xs font-semibold tracking-[0.25em] text-[#060607]/80 uppercase mb-2"
            style={{ fontFamily: "'Neue Montreal', 'Inter', sans-serif" }}
          >
            HELLO, I&apos;M SUBHANI
          </motion.span>
          
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-1.5 mb-6"
          >
            <div className="w-12 h-[1.5px] bg-accent" />
            <div className="w-2 h-2 rounded-full bg-accent" />
          </motion.div>
          
          <motion.h1
            variants={itemVariants}
            className="text-4xl sm:text-5xl lg:text-[3.1rem] font-black uppercase leading-[1.05] tracking-tight text-[#060607] mb-6"
            style={{ fontFamily: "'AeonikBold', 'Neue Montreal', sans-serif" }}
          >
            DEVOPS &amp; CLOUD <br />
            INFRASTRUCTURE <br />
            <span className="text-accent font-bold">ENGINEER</span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-xs sm:text-sm text-[#2A2B33] font-medium leading-relaxed mb-8 max-w-[42ch]"
            style={{ fontFamily: "'Neue Montreal', 'Inter', sans-serif" }}
          >
            Engineering automated multi-cloud infrastructure, resilient CI/CD pipelines, and high-availability container orchestration across AWS and Azure.
          </motion.p>

          {/* View Work & Download CV Buttons */}
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-5 flex-wrap"
          >
            <a
              href="#projects-section"
              onClick={handleScrollToWork}
              className="px-6 py-3.5 bg-[#060607] text-[#F9F8FF] hover:bg-accent hover:text-white rounded-full flex items-center gap-2 text-xs font-semibold tracking-wide transition-all duration-200 active:scale-95 shadow-md cursor-pointer"
              style={{ fontFamily: "'Neue Montreal', 'Inter', sans-serif" }}
            >
              <span>View My Work</span>
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="7" y1="17" x2="17" y2="7"/>
                <polyline points="7 7 17 7 17 17"/>
              </svg>
            </a>

            <a
              href="/Resume.pdf"
              target="_blank"
              rel="noopener noreferrer"
              download="Mahaboob_Subhani_Shaik_Resume.pdf"
              className="text-xs font-semibold text-[#060607] hover:text-accent flex items-center gap-1.5 pb-0.5 border-b-2 border-[#060607]/30 hover:border-accent transition-all"
              style={{ fontFamily: "'Neue Montreal', 'Inter', sans-serif" }}
            >
              <span>Download Resume</span>
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <polyline points="19 12 12 19 5 12"/>
              </svg>
            </a>
          </motion.div>

          {/* Social Links on Bottom-Left */}
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-5 mt-8 text-[#060607]/80"
          >
            <a
              href="https://github.com/subhanishaik1922"
              target="_blank"
              rel="noopener noreferrer"
              title="GitHub"
              aria-label="GitHub"
              className="hover:text-accent transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
              </svg>
            </a>
            <a
              href="https://www.linkedin.com/in/mahaboob-subhani-shaik-961a68228/"
              target="_blank"
              rel="noopener noreferrer"
              title="LinkedIn"
              aria-label="LinkedIn"
              className="hover:text-accent transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
            </a>
            <a
              href="mailto:subhanishaik1922@gmail.com"
              title="Email Subhani"
              aria-label="Email Subhani"
              className="hover:text-accent transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </a>
            <a
              href="tel:+91 7989112990"
              title="Call Subhani"
              aria-label="Call Subhani"
              className="hover:text-accent transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </a>
          </motion.div>
        </motion.div>

        {/* Floating Sparkle + Play/Pause Video Button matching reference */}
        <div className="absolute bottom-8 right-8 sm:bottom-12 sm:right-12 z-20 flex flex-col items-center gap-3 pointer-events-auto">
          {/* Reference Sparkle Icon */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={loaderDone ? { opacity: 0.75, scale: 1 } : { opacity: 0, scale: 0.5 }}
            transition={{ duration: 1, delay: 2.4 }}
            className="text-black/30 hover:text-black/60 transition-colors pointer-events-none"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current animate-pulse">
              <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
            </svg>
          </motion.div>

          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={loaderDone ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.8, delay: 2.6, ease: [0.16, 1, 0.3, 1] }}
            onClick={togglePlay}
            className="flex items-center gap-3 bg-white/90 border border-black/15 hover:border-black/30 px-4 py-2.5 rounded-full text-[#060607] hover:bg-[#060607] hover:text-white transition-all active:scale-95 shadow-md group cursor-pointer backdrop-blur-sm"
            style={{ fontFamily: "'Neue Montreal', 'Inter', sans-serif" }}
          >
            <span className="w-7 h-7 rounded-full bg-fg/10 group-hover:bg-bg/10 flex items-center justify-center transition-colors">
              {isPlaying ? (
                /* Pause Icon */
                <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                /* Play Icon */
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current translate-x-[1px]">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </span>
            <span className="text-[11px] font-bold tracking-[0.18em] uppercase pr-2">
              {isPlaying ? "PAUSE VIDEO" : "PLAY VIDEO"}
            </span>
          </motion.button>
        </div>
      </section>
    </>
  );
};

export default HeroSection;
