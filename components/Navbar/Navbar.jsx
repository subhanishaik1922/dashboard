"use client";

import React, { useEffect, useState } from "react";
import { animated, useSpring } from "@react-spring/web";
import { Trail } from "./TrailText";

import LetsTalk from "./LetsTalk";
import MenuButton from "./MenuButton";
import Link from "next/link";
import MusicButton from "./MusicButton";

const EMAIL = "subhanishaik1922@gmail.com";
const PHONE = "tel:+91 7989112990";
const LINKEDIN_URL = "https://www.linkedin.com/in/mahaboob-subhani-shaik-961a68228/";
const GITHUB_URL = "https://github.com/subhanishaik1922";

const scrollToSection = (id) => {
  if (typeof window === "undefined") return;
  const target = id === "top" ? 0 : document.getElementById(id);
  if (target == null) return;
  const lenis = window.__lenis;
  if (lenis && typeof lenis.scrollTo === "function") {
    lenis.scrollTo(target, { offset: 0, duration: 1.4 });
    return;
  }
  if (target === 0) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};

const MOBILE_NAV_ITEMS = [
  { label: "HOME", target: "top" },
  { label: "ABOUT", target: "about" },
  { label: "SKILLS", target: "skills-section" },
  { label: "WORK", target: "projects-section" },
  { label: "CERTIFICATES", target: "certificates-section" },
  { label: "EXPERIENCE", target: "experience-section" },
  { label: "EDUCATION", target: "education-section" },
  { label: "CONTACT", target: "contact-section" },
];

function Navbar() {
  const [rotate, setRotate] = useSpring(() => ({
    transform: `rotate(0deg)`,
    config: { tension: 300, friction: 20, mass: 1 },
  }));

  const [open, set] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    set(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onScroll = () => {
      setScrolled(window.scrollY > 60);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [mobileOpen]);

  const handleMobileNav = (e, target) => {
    e.preventDefault();
    setMobileOpen(false);
    setRotate({ transform: "rotate(0deg)" });
    setTimeout(() => scrollToSection(target), 50);
  };

  return (
    <>
      {/* Navbar small screen */}
      <div className={`fixed top-0 left-0 z-[100001] w-full py-5 lg:hidden px-5 transition-all duration-300 ${scrolled ? 'bg-bg/85 backdrop-blur-md shadow-sm' : ''}`}>
        <div className="flex items-center justify-between w-full font-extrabold">
          <Link
            href="/"
            aria-label="Home"
            onClick={(e) => handleMobileNav(e, "top")}
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-85 transition-opacity"
          >
            <img
              src="/avatar.png"
              alt="Shaik Mahaboob Subhani"
              className="w-8 h-8 rounded-full object-cover border border-fg/10"
            />
            <span className={`tracking-wider font-semibold text-lg transition-colors duration-200 ${scrolled ? 'text-fg' : 'text-[#060607]'}`} style={{ letterSpacing: "-0.03em" }}>
              SUBHANI
            </span>
          </Link>
          <div className="flex items-center">
            <MusicButton />
            <button
              type="button"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              className="nav_btn_sm flex items-center justify-center cursor-pointer"
              onMouseEnter={() => !mobileOpen && setRotate({ transform: "rotate(90deg)" })}
              onMouseLeave={() => !mobileOpen && setRotate({ transform: "rotate(0deg)" })}
              onClick={() => {
                const next = !mobileOpen;
                setMobileOpen(next);
                setRotate({ transform: next ? "rotate(45deg)" : "rotate(0deg)" });
              }}
            >
              <animated.div className="text-[0.55rem] leading-none" style={rotate}>
                {mobileOpen ? "✕" : "⬤ ⬤"}
              </animated.div>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu overlay */}
      <div
        className={`fixed inset-0 z-[100000] lg:hidden transition-opacity duration-300 ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!mobileOpen}
      >
        <div
          className="absolute inset-0 bg-bg"
          onClick={() => {
            setMobileOpen(false);
            setRotate({ transform: "rotate(0deg)" });
          }}
        />
        <div className="relative z-10 h-full w-full flex flex-col pt-20 pb-8 px-6 overflow-y-auto">
          <nav className="flex flex-col gap-0.5">
            {MOBILE_NAV_ITEMS.map((item, i) => (
              <a
                key={item.target}
                href={item.target === "top" ? "#" : `#${item.target}`}
                onClick={(e) => handleMobileNav(e, item.target)}
                className="flex items-center justify-between py-3 border-b border-theme-border text-fg text-2xl font-semibold transition-colors duration-200 hover:text-brblue"
                style={{
                  letterSpacing: "-0.03em",
                  transform: mobileOpen ? "translateY(0)" : "translateY(20px)",
                  opacity: mobileOpen ? 1 : 0,
                  transition: `transform 0.4s ease ${0.03 + i * 0.04}s, opacity 0.4s ease ${
                    0.03 + i * 0.04
                  }s, color 0.2s ease`,
                }}
              >
                <span>{item.label}</span>
                <span className="text-fg-muted text-xs">0{i + 1}</span>
              </a>
            ))}
          </nav>

          <div className="mt-6 pt-6 border-t border-theme-border flex flex-col gap-2.5">
            <p className="text-fg-muted text-[10px] tracking-[0.2em] uppercase">Connect directly</p>
            <a
              href={`mailto:${EMAIL}`}
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-between bg-fg text-bg rounded-full px-5 py-3 text-xs tracking-[0.2em] font-semibold"
            >
              <span>EMAIL</span>
              <span aria-hidden="true">↗</span>
            </a>
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-between border-2 border-fg text-fg rounded-full px-5 py-3 text-xs tracking-[0.2em] font-semibold"
            >
              <span>LINKEDIN</span>
              <span aria-hidden="true">↗</span>
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-between border-2 border-fg text-fg rounded-full px-5 py-3 text-xs tracking-[0.2em] font-semibold"
            >
              <span>GITHUB</span>
              <span aria-hidden="true">↗</span>
            </a>
            <a
              href={PHONE}
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-between border-2 border-fg text-fg rounded-full px-5 py-3 text-xs tracking-[0.2em] font-semibold"
            >
              <span>+91 7989112990</span>
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </div>

      {/* Navbar large screen */}
      <div className={`fixed top-0 left-0 w-full px-6 lg:px-20 z-[100001] transition-all duration-300 ${scrolled ? 'bg-bg/85 backdrop-blur-md shadow-sm pt-4 pb-4' : 'pt-14 pb-10'}`}>
        <div className="items-start justify-between hidden lg:flex">
          <div className="flex items-center">
            <Link href="/" aria-label="Home" className="flex items-center gap-3 hover:opacity-85 transition-opacity">
              <img
                src="/avatar.png"
                alt="Shaik Mahaboob Subhani"
                className="w-10 h-10 rounded-full object-cover border border-fg/10"
              />
              <span className={`font-AeonikMedium text-2xl tracking-wider uppercase transition-colors duration-200 ${scrolled ? 'text-fg' : 'text-[#060607]'}`}>SUBHANI.</span>
            </Link>
          </div>
          <div className="hidden lg:flex items-center justify-around font-AeonikMedium">
            <Trail open={open} className="flex">
              <MusicButton />
              <LetsTalk />
              <MenuButton />
            </Trail>
          </div>
        </div>
      </div>
    </>
  );
}

export default Navbar;
