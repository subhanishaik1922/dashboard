"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CertificateModal from "./CertificateModal";

const CERTIFICATES = [
  {
    id: "nptel-cloud-computing",
    title: "Cloud Computing Specialization",
    issuer: "NPTEL & Swayam • IIT Kharagpur",
    category: "TECHNICAL & CLOUD",
    date: "Jan 2023 – Apr 2023",
    credentialId: "NPTEL23CS37-CLOUD",
    image: "/certificates/nptel-cloud-computing.svg",
    description: "12-week national elite certification covering multi-tenant cloud architectures, virtualization layers, distributed storage systems, and cloud resource provisioning.",
  },
  {
    id: "nptel-industry-4-iiot",
    title: "Industry 4.0 & Industrial Internet of Things",
    issuer: "NPTEL & Swayam • IIT Kharagpur",
    category: "TECHNICAL & CLOUD",
    date: "Jan 2024 – Apr 2024",
    credentialId: "NPTEL24CS18-IIOT",
    image: "/certificates/nptel-industry-4-iiot.svg",
    description: "12-week advanced technical certification in cyber-physical architectures, smart industrial automation, wireless telemetry pipelines, and sensor integration.",
  },
  {
    id: "surya-tech-network",
    title: "Network Engineer Trainee Internship",
    issuer: "Surya Tech Solutions Pvt Ltd",
    category: "INTERNSHIPS",
    date: "Jan 2024 – May 2024",
    credentialId: "STS-HYD-NET-2024",
    image: "/certificates/surya-tech-network-trainee.svg",
    description: "5-month industrial internship completion certifying technical expertise in physical network layers, localized LAN deployment, Cat5/Cat6 cabling, and structural connectivity validations.",
  },
  {
    id: "vfstr-soft-skills",
    title: "Soft Skills & Mock Interview Essentials",
    issuer: "VFSTR (Deemed to be University)",
    category: "ACHIEVEMENTS",
    date: "2023",
    credentialId: "VFSTR-SS-2023",
    image: "/certificates/vfstr-soft-skills.svg",
    description: "Certificate of Appreciation awarded for exemplary communication clarity, technical problem articulation, dynamic discourse, and professional interview readiness.",
  },
  {
    id: "vfstr-digital-marketing",
    title: "Digital Marketing & Communications",
    issuer: "Media Dept • VFSTR",
    category: "ACHIEVEMENTS",
    date: "2022 – 2023",
    credentialId: "VFSTR-MEDIA-2023",
    image: "/certificates/vfstr-digital-marketing.svg",
    description: "Certified for managing technical communications, event documentation, and digital campaign dissemination across university forums and technical expos.",
  },
];

const CATEGORIES = ["ALL", "INTERNSHIPS", "TECHNICAL & CLOUD", "ACHIEVEMENTS"];

const Certificates = () => {
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [selectedCert, setSelectedCert] = useState(null);

  const filteredCerts =
    activeCategory === "ALL"
      ? CERTIFICATES
      : CERTIFICATES.filter((c) => c.category.toLowerCase() === activeCategory.toLowerCase());

  return (
    <section id="certificates-section" className="w-full px-6 sm:px-12 lg:px-20 py-24 bg-bg text-fg">
      <div className="pj-head mb-8">
        <span className="pj-label">VERIFIED CREDENTIALS</span>
        <h2 className="pj-title">certifications &amp; honors</h2>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-10 no-scrollbar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeCategory === cat
                ? "bg-fg text-bg shadow-sm"
                : "bg-fg/5 text-fg-muted hover:text-fg hover:bg-fg/10"
            }`}
          >
            {cat} {cat === "ALL" ? `(${CERTIFICATES.length})` : ""}
          </button>
        ))}
      </div>

      {/* Certificates Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        <AnimatePresence mode="popLayout">
          {filteredCerts.map((cert, idx) => (
            <motion.div
              key={cert.id}
              layout
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.35, delay: idx * 0.03 }}
              onClick={() => setSelectedCert(cert)}
              className="cert-card group p-5 rounded-2xl bg-bg-alt border border-theme-border hover:border-accent transition-all duration-300 flex flex-col justify-between cursor-pointer hover:-translate-y-1.5 shadow-sm hover:shadow-xl"
            >
              <div>
                {/* Thumbnail Container */}
                <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden mb-4 bg-black/5 border border-theme-border group-hover:border-accent/40 transition-colors flex items-center justify-center">
                  <img
                    src={cert.image}
                    alt={cert.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-bg/90 backdrop-blur-sm text-fg text-xs font-semibold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1">
                      <span>Inspect</span>
                      <span aria-hidden="true">↗</span>
                    </span>
                  </div>
                </div>

                {/* Tag & Date */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-accent/10 text-accent font-semibold tracking-wider uppercase">
                    {cert.category}
                  </span>
                  <span className="text-[11px] text-fg-muted font-medium">{cert.date}</span>
                </div>

                {/* Title & Issuer */}
                <h3 className="text-base sm:text-lg font-semibold tracking-tight text-fg group-hover:text-accent transition-colors line-clamp-2 mb-1.5">
                  {cert.title}
                </h3>
                <p className="text-xs font-medium text-fg-muted/90 mb-2">
                  {cert.issuer}
                </p>
                <p className="text-xs text-fg-muted line-clamp-2 leading-relaxed">
                  {cert.description}
                </p>
              </div>

              {/* Bottom bar */}
              <div className="pt-4 mt-4 border-t border-theme-border/60 flex items-center justify-between text-xs font-medium">
                <span className="text-fg-muted group-hover:text-fg transition-colors">
                  {cert.credentialId ? `ID: ${cert.credentialId.slice(0, 20)}` : "Verified Credential"}
                </span>
                <span className="text-accent group-hover:translate-x-1 transition-transform">
                  ➔
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Fullscreen Lightbox Modal */}
      <CertificateModal
        cert={selectedCert}
        isOpen={Boolean(selectedCert)}
        onClose={() => setSelectedCert(null)}
      />
    </section>
  );
};

export default Certificates;
