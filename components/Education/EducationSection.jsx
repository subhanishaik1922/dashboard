"use client";

import React from "react";
import { motion } from "framer-motion";

const EDUCATION = [
  {
    degree: "B.Tech in Electronics & Communication Engineering",
    institution: "Vignan's Deemed University (VFSTR)",
    period: "2021 – 2024",
    location: "Guntur, Andhra Pradesh",
    score: "GPA: 7.15",
    description: "Specialized in Computer Networks, Embedded Systems, IoT Telemetry, Cloud Foundations, and Digital Communication Architectures.",
  },
  {
    degree: "Diploma in Electronics & Communication Engineering",
    institution: "VRS & YRN College of Technology",
    period: "2018 – 2021",
    location: "Chirala, Andhra Pradesh",
    score: "Score: 76.6%",
    description: "Rigorous coursework in analog & digital systems, microprocessors, electronic instrumentation, PCB design, and hardware troubleshooting.",
  },
  {
    degree: "Secondary School Certificate (Class X - ICSE)",
    institution: "St. Ann's School",
    period: "2017 – 2018",
    location: "Ponnur, Andhra Pradesh",
    score: "Score: 75%",
    description: "Distinguished academic record across mathematics, physical sciences, and computer applications under the ICSE curriculum.",
  },
];

const ACHIEVEMENTS = [
  {
    title: "Cloud Computing Specialization (12 Weeks)",
    platform: "NPTEL & Swayam • IIT Kharagpur",
    summary: "Successfully completed 12-week national certification covering cloud architectures, virtualization, storage models, and distributed resource provisioning.",
  },
  {
    title: "Industry 4.0 & Industrial Internet of Things",
    platform: "NPTEL & Swayam • IIT Kharagpur",
    summary: "Awarded 12-week national certification in cyber-physical systems, industrial sensor networks, telemetry pipelines, and smart automation.",
  },
  {
    title: "Srujanankara National Project Expo Finalist",
    platform: "VFSTR Innovation & Project Exhibition",
    summary: "Selected as finalist for presenting and defending the Battery Health Monitoring System using LoRaWAN before academic and industrial evaluators.",
  },
  {
    title: "Mahotsav National Festival Event Coordinator",
    platform: "VFSTR Student Leadership Committee",
    summary: "Appointed Student Coordinator managing multi-track technical events, stage operations, and logistics across university-wide gatherings.",
  },
];

const EducationSection = () => {
  return (
    <section id="education-section" className="w-full px-6 sm:px-12 lg:px-20 py-24 bg-bg text-fg">
      {/* Education Header */}
      <div className="pj-head mb-12">
        <span className="pj-label">ACADEMIC BACKGROUND</span>
        <h2 className="pj-title">education &amp; milestones</h2>
      </div>

      {/* Education Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-20">
        {EDUCATION.map((edu, idx) => (
          <motion.div
            key={edu.degree}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-30px" }}
            transition={{ duration: 0.6, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="edu-card p-6 sm:p-8 rounded-3xl bg-bg-alt border border-theme-border hover:border-accent transition-all duration-300 flex flex-col justify-between shadow-sm hover:shadow-xl hover:-translate-y-1"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-fg-muted uppercase tracking-widest">
                  0{idx + 1} // DEGREE
                </span>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-accent/10 text-accent">
                  {edu.score}
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-fg mb-2">
                {edu.degree}
              </h3>
              <h4 className="text-sm font-medium text-fg-muted mb-4">
                {edu.institution} • <span className="italic">{edu.location}</span>
              </h4>
              <p className="text-xs sm:text-sm text-fg-muted leading-relaxed">
                {edu.description}
              </p>
            </div>
            <div className="pt-4 mt-6 border-t border-theme-border/60 text-xs font-mono text-fg-muted">
              {edu.period}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Honors & Competitions */}
      <div className="pj-head mb-10">
        <span className="pj-label">RECOGNITION</span>
        <h2 className="pj-title">honors &amp; achievements</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        {ACHIEVEMENTS.map((ach, idx) => (
          <motion.div
            key={ach.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-30px" }}
            transition={{ duration: 0.6, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="edu-card p-6 sm:p-8 rounded-2xl bg-bg-alt border border-theme-border hover:border-accent transition-all duration-300 shadow-sm hover:shadow-lg flex flex-col justify-between"
          >
            <div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-fg/5 text-accent uppercase tracking-wider mb-3 inline-block">
                {ach.platform}
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-fg mb-2">
                {ach.title}
              </h3>
              <p className="text-xs sm:text-sm text-fg-muted leading-relaxed">
                {ach.summary}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default EducationSection;
