import { Exam } from './types';

export const sampleExams: Exam[] = [
  {
    id: 'az-104',
    title: 'Azure AZ-104 Practice Exam',
    description: 'Microsoft Certified: Azure Administrator Associate',
    totalQuestions: 200,
    topics: [
      {
        id: 'identity',
        name: 'Manage Azure identities and governance',
        modules: ['Azure AD', 'Users and Groups', 'RBAC', 'Subscriptions', 'Azure Policy']
      },
      {
        id: 'storage',
        name: 'Implement and manage storage',
        modules: ['Storage Accounts', 'Blob Storage', 'File Storage', 'Storage Security', 'Data Transfer']
      },
      {
        id: 'compute',
        name: 'Deploy and manage Azure compute resources',
        modules: ['Virtual Machines', 'VM Extensions', 'Containers', 'App Services', 'Backup']
      },
      {
        id: 'networking',
        name: 'Configure and manage virtual networking',
        modules: ['Virtual Networks', 'Network Security', 'Load Balancing', 'VPN & ExpressRoute', 'DNS', 'Application Gateway']
      },
      {
        id: 'monitoring',
        name: 'Monitor and back up Azure resources',
        modules: ['Azure Monitor', 'Log Analytics', 'Alerts', 'Backup', 'Site Recovery']
      }
    ],
    questions: [
      {
        id: 1,
        topic: 'networking',
        module: 'Virtual Networks',
        category: 'Virtual Networks',
        type: 'single',
        question: 'You are planning a virtual network that must support 2000 virtual machines across multiple subnets. You want to minimize IP address waste while ensuring room for growth. What address space should you choose?',
        options: [
          '10.0.0.0/21 (2046 addresses)',
          '10.0.0.0/20 (4094 addresses)',
          '10.0.0.0/19 (8190 addresses)',
          '10.0.0.0/18 (16382 addresses)'
        ],
        correct: 2,
        explanation: 'For 2000 VMs with room for growth, /19 provides 8190 usable addresses (8192 - 2 reserved). This allows for proper subnetting while minimizing waste. /20 would be too small (4094), while /18 would be excessive for the requirement.',
        reasoning: {
          correct: 'A /19 subnet provides 8190 usable IP addresses (2^13 - 2 reserved addresses). This gives enough capacity for 2000 VMs with significant room for growth (4x capacity) while still being efficient. It allows for proper subnet segmentation across multiple subnets within the address space.',
          why_others_wrong: {
            '0': '/21 provides only 2046 addresses, which is barely enough for 2000 VMs with no room for growth or subnet overhead.',
            '1': '/20 provides 4094 addresses, which gives some growth but may be insufficient for long-term scaling and multiple subnet requirements.',
            '3': '/18 provides 16382 addresses, which is excessive and wastes IP address space unnecessarily for the stated requirement.'
          }
        },
        reference: {
          title: 'Plan virtual networks - Azure Virtual Network',
          url: 'https://docs.microsoft.com/en-us/azure/virtual-network/virtual-network-vnet-plan-design-arm'
        }
      },
      {
        id: 2,
        topic: 'networking',
        module: 'Network Security',
        category: 'Network Security Groups',
        type: 'single',
        question: 'You have a web application with the following NSG rules:\n- Priority 100: Allow HTTP (port 80) from Internet\n- Priority 200: Allow HTTPS (port 443) from Internet\n- Priority 300: Allow SSH (port 22) from 10.0.0.0/24\n- Priority 1000: Deny All\n\nYou need to block HTTP traffic from IP 203.0.113.50 while keeping HTTPS allowed. What should you do?',
        options: [
          'Create a rule with priority 50 to deny HTTP from 203.0.113.50',
          'Create a rule with priority 150 to deny HTTP from 203.0.113.50',
          'Create a rule with priority 1100 to deny HTTP from 203.0.113.50',
          'Modify the existing priority 100 rule to exclude the IP address'
        ],
        correct: 0,
        explanation: 'NSG rules are processed in priority order (lower numbers first). To block specific traffic before the general allow rule, create a deny rule with priority 50, which will be processed before the priority 100 allow rule.',
        reasoning: {
          correct: 'NSG rules are evaluated in ascending priority order (100, 200, 300, etc.). To block specific traffic that would otherwise be allowed by a general rule, you must place the deny rule with a lower priority number so it\'s evaluated first. Priority 50 will be processed before priority 100, effectively blocking HTTP from the specific IP.',
          why_others_wrong: {
            '1': 'Priority 150 would be processed after the allow rule at priority 100, so the traffic would already be allowed.',
            '2': 'Priority 1100 would be processed after the deny all rule at priority 1000, making it ineffective.',
            '3': 'NSG rules don\'t support exclude operations; you need separate deny rules with higher priority.'
          }
        },
        reference: {
          title: 'Network security groups - Azure Virtual Network',
          url: 'https://docs.microsoft.com/en-us/azure/virtual-network/network-security-groups-overview'
        }
      },
      {
        id: 3,
        topic: 'networking',
        module: 'Load Balancing',
        category: 'Azure Load Balancer',
        type: 'multiple',
        question: 'You are configuring a Standard Load Balancer for a multi-tier application. Which of the following features are available with Standard Load Balancer? (Select all that apply)',
        options: [
          'Availability Zones support',
          'Multiple frontend IP configurations',
          'HTTPS health probes',
          'Port 0 rules for all ports',
          'Outbound rules configuration'
        ],
        correct: [0, 1, 2, 4],
        explanation: 'Standard Load Balancer supports: Availability Zones, multiple frontend IPs, HTTPS health probes, and outbound rules configuration. Port 0 rules are not supported - you must specify explicit ports or port ranges.',
        reasoning: {
          correct: 'Standard Load Balancer is the premium SKU that provides zone redundancy across Availability Zones, supports multiple frontend IP configurations for different services, includes HTTPS health probes for application-layer health checking, and offers outbound rules for controlling egress traffic.',
          why_others_wrong: {
            '3': 'Standard Load Balancer does not support Port 0 rules. You must specify explicit ports or port ranges in load balancing rules.'
          }
        },
        reference: {
          title: 'Standard Load Balancer overview - Azure Load Balancer',
          url: 'https://docs.microsoft.com/en-us/azure/load-balancer/load-balancer-standard-overview'
        }
      },
      {
        id: 4,
        topic: 'storage',
        module: 'Storage Accounts',
        category: 'Storage Accounts',
        type: 'single',
        question: 'You need to create a storage account that provides the highest durability for critical business data and allows read access from a secondary region. Which replication option should you choose?',
        options: [
          'Locally Redundant Storage (LRS)',
          'Zone-Redundant Storage (ZRS)',
          'Geo-Redundant Storage (GRS)',
          'Read-Access Geo-Redundant Storage (RA-GRS)'
        ],
        correct: 3,
        explanation: 'RA-GRS provides the highest durability by replicating data to a secondary region (like GRS) and additionally allows read access to the secondary region during normal operations, providing business continuity options.',
        reasoning: {
          correct: 'RA-GRS provides 16 nines of durability (99.99999999999999%) by maintaining 6 copies of data: 3 in the primary region across fault domains and 3 in a geographically distant secondary region. Unlike GRS, RA-GRS allows read access to the secondary region during normal operations, enabling applications to read from the secondary region for load distribution and disaster recovery testing.',
          why_others_wrong: {
            '0': 'LRS only provides local redundancy within a single datacenter, offering the lowest durability.',
            '1': 'ZRS provides redundancy across availability zones but only within a single region.',
            '2': 'GRS provides geo-redundancy but doesn\'t allow read access to the secondary region during normal operations.'
          }
        },
        reference: {
          title: 'Azure Storage redundancy - Azure Storage',
          url: 'https://docs.microsoft.com/en-us/azure/storage/common/storage-redundancy'
        }
      },
      {
        id: 5,
        topic: 'compute',
        module: 'Virtual Machines',
        category: 'Availability',
        type: 'single',
        question: 'You need to deploy VMs that can tolerate a complete datacenter failure within an Azure region. The VMs should be distributed across physical locations. What should you configure?',
        options: [
          'Availability Sets with 3 fault domains',
          'Availability Zones across multiple zones',
          'Virtual Machine Scale Sets with zone balancing',
          'Both B and C provide the required protection'
        ],
        correct: 3,
        explanation: 'Both Availability Zones and VMSS with zone balancing protect against datacenter failures. Availability Zones distribute VMs across physically separate datacenters, and VMSS with zone balancing automatically distributes instances across zones.',
        reasoning: {
          correct: 'Availability Zones provide the highest level of fault tolerance within a region by distributing VMs across physically separate datacenters, each with independent power, cooling, and networking. VMSS with zone balancing automatically distributes instances across multiple Availability Zones, providing the same level of protection.',
          why_others_wrong: {
            '0': 'Availability Sets only protect against hardware failures within a single datacenter, not complete datacenter failures.'
          }
        },
        reference: {
          title: 'Availability options for Azure Virtual Machines',
          url: 'https://docs.microsoft.com/en-us/azure/virtual-machines/availability'
        }
      }
    ]
  },
  {
    id: 'az-305',
    title: 'Azure AZ-305 Practice Exam',
    description: 'Microsoft Certified: Azure Solutions Architect Expert',
    totalQuestions: 150,
    topics: [
      {
        id: 'identity',
        name: 'Design identity, governance, and monitoring solutions',
        modules: ['Azure AD', 'Governance', 'Monitoring']
      },
      {
        id: 'data-storage',
        name: 'Design data storage solutions',
        modules: ['Storage Accounts', 'Databases', 'Data Integration']
      },
      {
        id: 'business-continuity',
        name: 'Design business continuity solutions',
        modules: ['Backup', 'Disaster Recovery', 'High Availability']
      },
      {
        id: 'infrastructure',
        name: 'Design infrastructure solutions',
        modules: ['Compute', 'Networking', 'Migration']
      }
    ],
    questions: [
      {
        id: 1,
        topic: 'infrastructure',
        module: 'Compute',
        category: 'Architecture Design',
        type: 'single',
        question: 'You are designing a multi-tier application architecture for Azure. The application requires high availability, scalability, and cost optimization. Which compute service combination would you recommend?',
        options: [
          'Azure Virtual Machines with Availability Sets',
          'Azure App Service with Azure Functions for background processing',
          'Azure Container Instances with Azure Kubernetes Service',
          'Azure Virtual Machine Scale Sets with Azure Load Balancer'
        ],
        correct: 1,
        explanation: 'Azure App Service provides built-in high availability, auto-scaling, and cost optimization through consumption-based pricing for Azure Functions, making it ideal for multi-tier applications.',
        reasoning: {
          correct: 'Azure App Service provides built-in high availability across zones, automatic scaling based on demand, and managed platform services that reduce operational overhead. Combined with Azure Functions for background processing, this offers consumption-based pricing where you only pay for actual execution time, providing excellent cost optimization.',
          why_others_wrong: {
            '0': 'Azure VMs with Availability Sets provide high availability but require manual scaling configuration and constant compute costs regardless of actual usage.',
            '2': 'While containerized, Azure Container Instances don\'t provide built-in high availability and auto-scaling like App Service. AKS adds complexity and management overhead.',
            '3': 'VMSS with Load Balancer provides good availability and scaling but still requires infrastructure management and doesn\'t offer the cost optimization of consumption-based pricing.'
          }
        },
        reference: {
          title: 'Azure App Service overview',
          url: 'https://docs.microsoft.com/en-us/azure/app-service/overview'
        }
      }
    ]
  }
];
