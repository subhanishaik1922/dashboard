import React from 'react';

const SERVICES = [
  {
    title: 'Cloud Infrastructure & Multi-Cloud',
    body:
      'Provisioning resilient, scalable architectures on Amazon Web Services (EC2, S3, VPC, IAM, EKS) and Microsoft Azure (VMs, VNets, Azure DevOps).',
  },
  {
    title: 'CI/CD & GitOps Automation',
    body:
      'Designing declarative Jenkinsfiles, automated GitHub Actions workflows, package artifact isolation, and zero-downtime deployment pipelines.',
  },
  {
    title: 'Containers & Observability',
    body:
      'Multi-tier microservices containerization with Docker, Kubernetes cluster orchestration, and host telemetry monitoring via Prometheus & Grafana.',
  },
  {
    title: 'Infrastructure as Code & Systems Admin',
    body:
      'Modular Terraform blueprints, declarative Ansible configuration playbooks, Linux server administration, shell scripting, and network infrastructure.',
  },
];

const SubHeader = () => {
  return (
    <div className='w-full flex flex-col items-start text-left px-4 md:px-0'>
      <div className='w-full text-base md:text-lg lg:text-xl flex flex-col gap-3 md:gap-4 leading-relaxed text-left text-fg'>
        <p className="font-medium">
          Hi, I&apos;m <span className="text-accent font-semibold">Mahaboob Subhani Shaik</span>, a passionate DevOps Engineer with a solid foundation in Electronics &amp; Communication Engineering from VFSTR (Vignan&apos;s Deemed University).
        </p>
        <p className="text-fg-muted">
          I bridge the gap between automated multi-cloud infrastructure and continuous software delivery. From architecting reusable Terraform configurations and declarative Jenkins CI/CD pipelines to orchestrating Kubernetes clusters and monitoring host metrics via Prometheus and Grafana, I build scalable, reliable, and production-ready systems.
        </p>
      </div>

      <div className='about-inline-services w-full mt-8 md:mt-12 h-auto'>
        <div className='about-inline-services__head'>
          <span className='about-inline-services__label'>CORE EXPERTISE</span>
          <span className='text-xs text-fg-muted font-medium tracking-wider uppercase'>TECHNICAL HIGHLIGHTS</span>
        </div>
        <div className='about-inline-services__grid'>
          {SERVICES.map((service) => (
            <article key={service.title} className='about-inline-services__item'>
              <h4>{service.title}</h4>
              <p>{service.body}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SubHeader;
