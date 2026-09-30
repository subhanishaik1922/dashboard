"use client";

import React from "react";

const Icon = ({ children }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

const MailIcon = () => (
  <Icon>
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </Icon>
);

const PhoneIcon = () => (
  <Icon>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </Icon>
);

const LinkedinIcon = () => (
  <Icon>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </Icon>
);

const GithubIcon = () => (
  <Icon>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </Icon>
);

const SiteFooter = () => {
  return (
    <footer id="main-footer">
      <div className="footer-top">
        <div className="footer-brand">
          <h1 className="f-logo">SUBHANI</h1>
          <p className="f-desc">
            DevOps &amp; Cloud Engineer | Automated Infrastructure, CI/CD &amp; Kubernetes. <br />
            Designing scalable multi-cloud architectures, resilient GitOps pipelines, and high-availability container systems.
          </p>
          <div className="f-socials">
            <a
              href="https://www.linkedin.com/in/mahaboob-subhani-shaik-961a68228/"
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn"
              title="LinkedIn"
            >
              <LinkedinIcon />
            </a>
            <a
              href="https://github.com/subhanishaik1922"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
              title="GitHub"
            >
              <GithubIcon />
            </a>
            <a
              href="mailto:subhanishaik1922@gmail.com"
              aria-label="Email"
              title="Email"
            >
              <MailIcon />
            </a>
            <a
              href="tel:+91 7989112990"
              aria-label="Phone"
              title="Phone"
            >
              <PhoneIcon />
            </a>
          </div>
        </div>
        <div className="footer-links">
          <div className="f-col">
            <h3>FEATURED PROJECTS</h3>
            <a href="#projects-section">DevOps Portfolio &amp; Cloud Automation</a>
            <a href="#projects-section">End-to-End Automated CI/CD Pipelines</a>
            <a href="#projects-section">Containerized Architecture &amp; Monitoring</a>
            <a href="#projects-section">LoRaWAN Battery Health Monitoring</a>
          </div>
          <div className="f-col">
            <h3>PORTFOLIO MAP</h3>
            <a href="#about">About &amp; Overview</a>
            <a href="#skills-section">Technical Arsenal</a>
            <a href="#certificates-section">Verified Credentials</a>
            <a href="#experience-section">Career Journey</a>
            <a href="#education-section">Education &amp; Honors</a>
            <a href="#contact-section">Get in touch</a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} Mahaboob Subhani Shaik. All rights reserved.</p>
        <p>Built with Next.js &amp; Tailwind CSS</p>
      </div>
    </footer>
  );
};

export default SiteFooter;
