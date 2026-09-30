"use client";

import { motion } from "framer-motion";

const EXPERIENCES = [
  {
    company: "Surya Tech Solutions",
    role: "Network Engineer Trainee",
    period: "Jan 2024 – May 2024",
    location: "Hyderabad, India",
    bullets: [
      "Gained practical infrastructure experience managing physical network layers, cable routing installations, and structural connectivity validations.",
      "Handled localized LAN deployments using Cat5/Cat6 cabling profiles alongside diagnostic network validation routines.",
      "Performed infrastructure verification, network troubleshooting, and layer diagnostics to ensure reliable host connectivity.",
    ],
    tech: ["Network Infrastructure", "LAN Deployments", "Cat5/Cat6 Cabling", "Diagnostic Testing", "Network Troubleshooting"],
  },
  {
    company: "VFSTR University — Embedded & IoT Engineering",
    role: "Wireless Telemetry & IoT Project Lead",
    period: "2022 – 2023",
    location: "Guntur, Andhra Pradesh",
    bullets: [
      "Spearheaded design and engineering of the Battery Health Monitoring System using LoRaWAN wireless technology under faculty supervision.",
      "Integrated multi-channel sensor arrays for real-time voltage, current, and temperature telemetry with long-range radio transceivers.",
      "Validated telemetry communication pipelines by executing automated Postman API suites to ensure data consistency across backend tracking layers.",
    ],
    tech: ["LoRaWAN", "IoT Sensors", "Postman API Testing", "Microcontrollers", "Telemetry Systems"],
  },
  {
    company: "VFSTR University Media Cell & Student Leadership",
    role: "Technical Operations & Student Coordinator",
    period: "2022 – 2024",
    location: "Guntur, Andhra Pradesh",
    bullets: [
      "Appointed Student Coordinator for Mahotsav National Festival, directing operational scheduling, technical stage requirements, and large-scale event logistics.",
      "Coordinated digital communications, technical exhibition schedules, and media dissemination across university forums and project expos.",
      "Defended hardware project architecture at Srujanankara National Project Expo, presenting live telemetry data to expert academic evaluators.",
    ],
    tech: ["Leadership", "Project Management", "Digital Communications", "Event Logistics"],
  },
];

const ExperienceSection = () => {
  return (
    <section id="experience-section" className="w-full px-6 sm:px-12 lg:px-20 py-24 bg-bg text-fg">
      <div className="pj-head mb-12">
        <span className="pj-label">CAREER JOURNEY</span>
        <h2 className="pj-title">internships &amp; research</h2>
      </div>

      <div className="flex flex-col gap-10">
        {EXPERIENCES.map((exp, idx) => (
          <motion.div
            key={exp.company}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-30px" }}
            transition={{ duration: 0.6, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="exp-item p-6 sm:p-8 lg:p-10 rounded-3xl bg-bg-alt border border-theme-border hover:border-accent/60 transition-all duration-300 shadow-sm hover:shadow-xl relative overflow-hidden"
          >
            {/* Top row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-theme-border">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-accent/10 text-accent font-semibold tracking-wider uppercase">
                    0{idx + 1} // INTERNSHIP
                  </span>
                  <span className="text-xs text-fg-muted font-medium">{exp.location}</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-fg">
                  {exp.role}
                </h3>
                <h4 className="text-base sm:text-lg font-medium text-fg-muted mt-1">
                  {exp.company}
                </h4>
              </div>
              <div className="text-sm font-semibold tracking-wider text-fg-muted md:text-right bg-fg/5 px-4 py-2 rounded-full self-start md:self-center">
                {exp.period}
              </div>
            </div>

            {/* Bullets */}
            <ul className="mt-6 flex flex-col gap-3 text-sm sm:text-base text-fg-muted font-medium leading-relaxed">
              {exp.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-accent text-base mt-0.5 font-bold shrink-0">➔</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            {/* Tech Tags */}
            <div className="flex flex-wrap gap-2 pt-6 mt-6 border-t border-theme-border/60">
              {exp.tech.map((t) => (
                <span
                  key={t}
                  className="text-xs font-medium px-3 py-1 rounded-full bg-fg/5 text-fg hover:bg-accent/10 hover:text-accent transition-colors"
                >
                  {t}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default ExperienceSection;
