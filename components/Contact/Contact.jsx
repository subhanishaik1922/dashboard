"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const EMAIL_ADDRESS = "subhanishaik1922@gmail.com";
const PHONE_NUMBER = "+91 7989112990";
const LINKEDIN_URL = "https://www.linkedin.com/in/mahaboob-subhani-shaik-961a68228/";
const GITHUB_URL = "https://github.com/subhanishaik1922";

const ArrowUpRight = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M7 17 17 7" />
    <path d="M7 7h10v10" />
  </svg>
);

const Contact = () => {
  const sectionRef = useRef(null);
  const eyebrowRef = useRef(null);
  const headlineRef = useRef(null);
  const emailRef = useRef(null);
  const ctaRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const eyebrowChars = eyebrowRef.current?.querySelectorAll(".ct-char") ?? [];
      const headlineChars = headlineRef.current?.querySelectorAll(".ct-char") ?? [];

      gsap.from(eyebrowChars, {
        opacity: 0,
        y: 40,
        duration: 1.0,
        stagger: { amount: 0.4, from: "start" },
        ease: "power3.out",
        scrollTrigger: {
          trigger: eyebrowRef.current,
          start: "top 90%",
          toggleActions: "play none none reverse",
        },
      });

      gsap.from(headlineChars, {
        opacity: 0,
        y: 200,
        duration: 1.4,
        stagger: { amount: 0.6, from: "start" },
        ease: "power3.out",
        scrollTrigger: {
          trigger: headlineRef.current,
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      });

      gsap.from([emailRef.current, ctaRef.current], {
        autoAlpha: 0,
        y: 50,
        duration: 1,
        stagger: 0.15,
        ease: "power2.out",
        scrollTrigger: {
          trigger: emailRef.current,
          start: "top 95%",
          toggleActions: "play none none reverse",
        },
      });
    }, sectionRef.current);

    return () => ctx.revert();
  }, []);

  const splitChars = (text) =>
    text.split("").map((char, i) => (
      <span key={i} className="ct-char" style={{ display: "inline-block" }}>
        {char === " " ? "\u00A0" : char}
      </span>
    ));

  return (
    <section id="contact-section" ref={sectionRef}>
      <div id="ct-eyebrow" ref={eyebrowRef}>
        {splitChars("have an opportunity in mind?")}
      </div>

      <h2 id="ct-headline" ref={headlineRef}>
        {splitChars("let's talk.")}
      </h2>

      <a
        id="ct-email"
        href={`mailto:${EMAIL_ADDRESS}`}
        ref={emailRef}
        aria-label="Email Mahaboob Subhani Shaik"
      >
        subhanishaik1922@gmail.com
      </a>

      <div id="ct-actions" ref={ctaRef}>
        <a
          id="ct-btn"
          href={`mailto:${EMAIL_ADDRESS}`}
          target="_blank"
          rel="noreferrer"
        >
          <span>SEND EMAIL</span>
          <ArrowUpRight />
        </a>
        <a
          id="ct-btn-secondary"
          href={LINKEDIN_URL}
          target="_blank"
          rel="noreferrer"
        >
          <span>LINKEDIN</span>
          <ArrowUpRight />
        </a>
        <a
          id="ct-btn-secondary"
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer"
        >
          <span>GITHUB</span>
          <ArrowUpRight />
        </a>
        <a
          id="ct-btn-secondary"
          href={`tel:${PHONE_NUMBER}`}
        >
          <span>+91 7989112990</span>
          <ArrowUpRight />
        </a>
      </div>
    </section>
  );
};

export default Contact;
