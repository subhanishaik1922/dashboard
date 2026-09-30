"use client";

import { motion } from "framer-motion";

const SKILL_GROUPS = [
  {
    category: "Cloud Infrastructure & Multi-Cloud",
    skills: ["AWS (EC2, S3, VPC, IAM, EKS)", "Microsoft Azure", "Azure VMs", "Azure DevOps", "CloudFront", "Cloud Security"],
    summary: "Architecting, provisioning, and securing multi-cloud platforms across AWS and Microsoft Azure with high-availability network topologies.",
  },
  {
    category: "CI/CD & Source Control",
    skills: ["Git", "GitHub", "GitHub Actions", "Jenkins", "Declarative Pipelines", "Jenkinsfiles", "GitOps Workflows"],
    summary: "Automating end-to-end continuous integration and deployment pipelines, artifact isolation, static linting, and automated release gates.",
  },
  {
    category: "Containers & Orchestration",
    skills: ["Docker", "Kubernetes", "Minikube", "Managed Clusters (EKS)", "Deployments", "Services", "ConfigMaps", "Microservices"],
    summary: "Packaging containerized multi-tier applications and orchestrating container workloads within resilient, autoscaling Kubernetes clusters.",
  },
  {
    category: "Infrastructure as Code & Config",
    skills: ["Terraform", "Ansible", "Modular Playbooks", "Configuration Management", "Declarative IaC", "Cluster Parity"],
    summary: "Provisioning multi-cloud infrastructure through declarative Terraform configurations and enforcing Linux cluster baseline states via Ansible.",
  },
  {
    category: "Observability & Quality Assurance",
    skills: ["Prometheus", "Grafana", "Dynamic Dashboards", "Proactive Alerting", "Selenium WebDriver", "TestNG", "Cucumber BDD", "Postman API"],
    summary: "Implementing proactive telemetry monitoring, dynamic operational dashboards, and automated API and regression testing suites.",
  },
  {
    category: "Languages, Linux Admin & Methodologies",
    skills: ["Java", "Core Java", "Bash Scripting", "Linux (Ubuntu, CentOS, RHEL)", "JIRA", "SDLC / STLC", "Defect Life Cycle", "Agile Workflows"],
    summary: "Enterprise Linux server administration, shell scripting automation, defect lifecycle management, and agile SDLC procedures via enterprise JIRA.",
  },
];

const SkillsSection = () => {
  return (
    <section id="skills-section" className="w-full px-6 sm:px-12 lg:px-20 py-20 bg-bg text-fg">
      <div className="pj-head mb-10">
        <span className="pj-label">TECHNICAL ARSENAL</span>
        <h2 className="pj-title">skills &amp; proficiencies</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        {SKILL_GROUPS.map((group, idx) => (
          <motion.div
            key={group.category}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-20px" }}
            transition={{ duration: 0.6, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="skill-card group p-6 sm:p-8 rounded-2xl bg-bg-alt border border-theme-border hover:border-accent transition-all duration-300 flex flex-col justify-between shadow-sm hover:shadow-md hover:-translate-y-1"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-fg-muted uppercase tracking-widest">
                  0{idx + 1} // DOMAIN
                </span>
                <span className="w-2 h-2 rounded-full bg-accent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold mb-3 tracking-tight group-hover:text-accent transition-colors">
                {group.category}
              </h3>
              <p className="text-xs sm:text-sm text-fg-muted leading-relaxed mb-6">
                {group.summary}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-4 border-t border-theme-border/60">
              {group.skills.map((skill) => (
                <span
                  key={skill}
                  className="text-xs font-medium px-3 py-1 rounded-full bg-fg/5 text-fg group-hover:bg-accent/10 group-hover:text-accent transition-colors"
                >
                  {skill}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default SkillsSection;
