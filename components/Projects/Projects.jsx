"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const PROJECTS = [
  {
    name: "Personal DevOps Portfolio & Cloud Automation",
    href: "https://github.com/subhanishaik1922",
    github: "https://github.com/subhanishaik1922",
    role: "Terraform • AWS S3 & CloudFront • Azure VNets • Ansible • Linux",
    kind: "Cloud Infrastructure",
    note: "Designed and hosted an online personal portfolio platform utilizing highly resilient AWS S3 architectures and CloudFront distribution paths. Automated the deployment of cloud networking schemas with modular configurations for AWS VPCs and Azure Virtual Networks, and enforced baseline consistency across Linux clusters using Ansible playbooks.",
  },
  {
    name: "End-to-End Automated CI/CD Pipelines",
    href: null,
    github: "https://github.com/subhanishaik1922",
    role: "GitHub Actions • Jenkins • Docker • Artifact Isolation • GitOps",
    kind: "CI/CD Automation",
    note: "Engineered robust Declarative Jenkinsfiles to automate standard package execution, static lint checks, and artifact isolation scripts. Integrated GitHub Actions configurations to seamlessly deploy verified versioned container structures to production registries upon pull request completion.",
  },
  {
    name: "Containerized Architecture & Infrastructure Monitoring",
    href: null,
    github: "https://github.com/subhanishaik1922",
    role: "Kubernetes • Docker • Prometheus • Grafana • Alerting",
    kind: "Cloud Native & Observability",
    note: "Constructed explicit Kubernetes manifest blueprints to configure scaling targets, service boundaries, and storage attachments for microservices. Deployed comprehensive Prometheus instrumentation layers and dynamic Grafana visualizations to capture host metrics and minimize target operational downtime.",
  },
  {
    name: "Battery Health Monitoring System using LoRaWAN",
    href: null,
    github: "https://github.com/subhanishaik1922",
    role: "IoT Sensors • LoRaWAN • Postman API Testing • Telemetry • VFSTR",
    kind: "IoT & Systems",
    note: "Developed a wireless tracking architecture to monitor real-time battery parameters including temperature, voltage, and electrical current profiles. Validated telemetry pipelines by utilizing Postman suite execution to verify data consistency across backend tracking layers.",
  },
];

const VENTURES = [
  {
    name: "Multi-Cloud Infrastructure Automation",
    role: "AWS • Azure • Terraform Modules • Cloud Security",
    href: null,
    kind: "Core Competency",
    note: "Automated provisioning and governance of resilient multi-cloud environments across AWS (EC2, S3, VPC, IAM, EKS) and Microsoft Azure using reusable, versioned Terraform configurations.",
  },
  {
    name: "Continuous Integration & Delivery Pipelines",
    role: "GitHub Actions • Declarative Jenkins • GitOps",
    href: null,
    kind: "Core Competency",
    note: "End-to-end CI/CD pipeline automation from source code commit to container image building, automated test suites, quality gates, and automated deployment.",
  },
  {
    name: "Container Orchestration & Cluster Management",
    role: "Docker • Kubernetes • Deployments • Microservices",
    href: null,
    kind: "Core Competency",
    note: "Containerizing distributed services with Docker and orchestrating them within high-availability Kubernetes clusters with ConfigMaps, Services, and ingress rules.",
  },
  {
    name: "Observability & Proactive Monitoring",
    role: "Prometheus • Dynamic Grafana Dashboards • Alerting",
    href: null,
    kind: "Core Competency",
    note: "Full-stack observability instrumentation, dynamic dashboard design, host metric collection, and automated threshold alerts to ensure high system uptime.",
  },
];

const ArrowIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="100%"
    height="100%"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M7 17 17 7" />
    <path d="M8 7h9v9" />
  </svg>
);

const Row = ({ item, index }) => {
  const hasLink = Boolean(item.href || item.github);
  const primaryUrl = item.href || item.github;

  return (
    <li className="pj-row">
      <div className="pj-link group">
        <span className="pj-num">{String(index + 1).padStart(2, "0")}</span>
        
        <div className="pj-meta">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="pj-name text-fg group-hover:text-accent transition-colors">
              {item.name}
            </span>
            {item.href && (
              <a
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-semibold tracking-wider uppercase px-3 py-1 rounded-full bg-accent/10 text-accent hover:bg-accent hover:text-white transition-colors flex items-center gap-1"
                title="Open Live Project"
              >
                <span>Live Demo</span>
                <span aria-hidden="true">↗</span>
              </a>
            )}
            {item.github && (
              <a
                href={item.github}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-semibold tracking-wider uppercase px-3 py-1 rounded-full border border-fg/20 text-fg-muted hover:text-fg hover:border-fg transition-colors flex items-center gap-1"
                title="View GitHub Repository"
              >
                <span>Source</span>
                <span aria-hidden="true">↗</span>
              </a>
            )}
          </div>
          {item.role && <span className="pj-role">{item.role}</span>}
          {item.note && <span className="pj-note leading-relaxed">{item.note}</span>}
        </div>

        <span className="pj-kind">{item.kind}</span>
        <span className="pj-arrow" aria-hidden="true">
          {hasLink ? (
            <a
              href={primaryUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open ${item.name}`}
              className="text-fg group-hover:text-accent transition-colors"
            >
              <ArrowIcon />
            </a>
          ) : (
            <span className="pj-dot">•</span>
          )}
        </span>
      </div>
    </li>
  );
};

const Projects = () => {
  const sectionRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const rows = sectionRef.current.querySelectorAll(".pj-row");
      gsap.fromTo(
        rows,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.08,
          ease: "power3.out",
          clearProps: "all",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 85%",
            once: true,
          },
        }
      );

      const titles = sectionRef.current.querySelectorAll(".pj-title");
      gsap.fromTo(
        titles,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.1,
          ease: "power3.out",
          clearProps: "all",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 85%",
            once: true,
          },
        }
      );

      const fallbackTimer = setTimeout(() => {
        rows.forEach((r) => {
          r.style.opacity = "1";
          r.style.transform = "none";
        });
      }, 2500);

      return () => clearTimeout(fallbackTimer);
    }, sectionRef.current);

    return () => ctx.revert();
  }, []);

  return (
    <section id="projects-section" ref={sectionRef}>
      <div className="pj-head">
        <span className="pj-label">PROJECTS</span>
        <h2 className="pj-title">selected work</h2>
      </div>

      <ul className="pj-list">
        {PROJECTS.map((p, i) => (
          <Row key={p.name} item={p} index={i} />
        ))}
      </ul>

      <div id="ventures" className="pj-head pj-head--secondary">
        <span className="pj-label">WHAT I BUILD</span>
        <h2 className="pj-title">systems &amp; solutions</h2>
      </div>

      <ul className="pj-list">
        {VENTURES.map((v, i) => (
          <Row key={v.name} item={v} index={i} />
        ))}
      </ul>
    </section>
  );
};

export default Projects;
