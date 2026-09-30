import { useSpring, a } from "@react-spring/web";
import React, { useEffect, useRef, useState } from "react";

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

const Menu = ({ open, onOutsideClick, onClose }) => {
  const ref = useRef();
  const handleChildClick = (event) => {
    if (ref.current && !ref.current.contains(event.target)) {
      onOutsideClick(event);
    }
  };

  useEffect(() => {
    document.addEventListener("click", handleChildClick);
    return () => {
      document.removeEventListener("click", handleChildClick);
    };
  }, []);

  const [contents, contentsApi] = useSpring(() => ({
    from: { y: 100, opacity: 0, transform: "rotate(20deg)" },
  }));

  const [news, newsApi] = useSpring(() => ({
    from: { y: 100, opacity: 0, transform: "rotate(-20deg)" },
  }));
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    if (open === false) {
      setTimeout(() => {
        setHidden(false);
      }, 500);
    } else {
      setHidden(true);
    }

    contentsApi.start({
      y: open ? 0 : 100,
      opacity: open ? 1 : 0,
      transform: open ? `rotate(0deg)` : `rotate(20deg)`,
    });

    newsApi.start({
      y: open ? 0 : 100,
      opacity: open ? 1 : 0,
      transform: open ? `rotate(0deg)` : `rotate(-20deg)`,
    });
  }, [open]);

  const navItems = [
    { label: "HOME", target: "top" },
    { label: "ABOUT", target: "about" },
    { label: "SKILLS", target: "skills-section" },
    { label: "WORK", target: "projects-section" },
    { label: "CERTIFICATES", target: "certificates-section" },
    { label: "EXPERIENCE", target: "experience-section" },
    { label: "EDUCATION", target: "education-section" },
    { label: "CONTACT", target: "contact-section" },
  ];

  const handleNavClick = (e, target) => {
    e.preventDefault();
    scrollToSection(target);
    if (typeof onClose === "function") onClose();
  };

  return (
    <>
      {hidden && (
        <div
          className="absolute top-[4rem] right-0 w-[22rem] max-h-[85vh] overflow-y-auto z-50 pr-1"
          ref={ref}
        >
          {/* Site navigation */}
          <a.div
            className="rounded-xl bg-bg-alt text-fg flex flex-col font-Aeonik text-2xl p-6 shadow-xl border border-fg/10"
            style={contents}
          >
            {navItems.map((item, i) => (
              <a
                key={item.target}
                href={item.target === "top" ? "#" : `#${item.target}`}
                onClick={(e) => handleNavClick(e, item.target)}
                className={`flex items-center justify-between transition-colors duration-200 hover:text-brblue cursor-pointer ${
                  i === 0 ? "pb-2.5" : i === navItems.length - 1 ? "pt-2.5" : "py-2.5"
                }`}
              >
                <span>{item.label}</span>
                <span className="text-fg-muted text-sm">•</span>
              </a>
            ))}
          </a.div>

          {/* Get in touch */}
          <a.div
            className="rounded-xl bg-bg-alt text-fg flex flex-col p-6 my-2 shadow-xl border border-fg/10"
            style={news}
          >
            <div className="font-Aeonik text-2xl leading-tight">
              Let&apos;s build
              <br />
              something great.
            </div>
            <div className="flex flex-col gap-2 mt-4">
              <a
                href="#contact-section"
                onClick={() => onClose && onClose()}
                className="flex items-center justify-between bg-fg text-bg rounded-xl px-4 py-2.5 text-xs tracking-widest font-semibold transition-transform duration-200 hover:-translate-y-0.5"
              >
                <span>GET IN TOUCH</span>
                <span aria-hidden="true">↗</span>
              </a>
              <a
                href={LINKEDIN_URL}
                target="_blank"
                rel="noreferrer"
                onClick={() => onClose && onClose()}
                className="flex items-center justify-between border-2 border-fg text-fg rounded-xl px-4 py-2.5 text-xs tracking-widest font-semibold transition-colors duration-200 hover:bg-accent-soft"
              >
                <span>LINKEDIN</span>
                <span aria-hidden="true">↗</span>
              </a>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                onClick={() => onClose && onClose()}
                className="flex items-center justify-between border-2 border-fg text-fg rounded-xl px-4 py-2.5 text-xs tracking-widest font-semibold transition-colors duration-200 hover:bg-accent-soft"
              >
                <span>GITHUB</span>
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          </a.div>
        </div>
      )}
    </>
  );
};

export default Menu;
