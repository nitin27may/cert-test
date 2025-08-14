const fs = require('fs');
const path = require('path');

const EXAMS_JSON = '/workspace/exam/public/data/exams.json';
const SPA_JSON = '/workspace/spa/data.json';
const MIN_PER_MODULE = 3;

function readJson(filePath) {
	return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, dataObj) {
	fs.writeFileSync(filePath, JSON.stringify(dataObj, null, 2) + '\n', 'utf8');
}

function backupFile(filePath) {
	const backupPath = filePath + '.bak';
	fs.copyFileSync(filePath, backupPath);
	return backupPath;
}

function getQuestionKey(q) {
	// Use question text as dedup key; include module to reduce accidental collisions across modules with similar stems
	return `${q.module || ''}__${(q.question || '').trim()}`;
}

function mergeSpaQuestionsIntoExam(exam, spaExam) {
	if (!spaExam || !Array.isArray(spaExam.questions)) return 0;
	const existingKeys = new Set(exam.questions.map(getQuestionKey));
	let maxId = exam.questions.reduce((m, q) => Math.max(m, Number(q.id) || 0), 0);
	let added = 0;
	for (const q of spaExam.questions) {
		const key = getQuestionKey(q);
		if (existingKeys.has(key)) continue;
		// Clone and normalize minimal fields
		const newQ = { ...q };
		newQ.id = ++maxId;
		// Ensure presence of required fields
		if (!newQ.topic && typeof q.topic === 'string') newQ.topic = q.topic;
		if (!newQ.module && typeof q.module === 'string') newQ.module = q.module;
		if (!newQ.type) newQ.type = Array.isArray(q.correct) ? 'multiple' : 'single';
		// Difficulty will be assigned later in balancing step
		exam.questions.push(newQ);
		existingKeys.add(key);
		added++;
	}
	return added;
}

// Seed catalog of high-quality questions for missing/underrepresented modules
const SEED_QUESTIONS = {
  'az-305': {
    'Azure AD': [
      {
        topic: 'identity',
        module: 'Azure AD',
        category: 'Privileged Access',
        type: 'single',
        difficulty: 'medium',
        question: 'You need to grant time-bound privileged access to Azure subscriptions with approval workflow and audit trail. What should you implement?',
        options: [
          'Azure AD Privileged Identity Management with eligible role assignments',
          'Azure RBAC permanent assignments with custom roles',
          'Azure Policy to deny privileged operations',
          'Management groups with deny assignments'
        ],
        correct: 0,
        explanation: 'PIM provides just-in-time elevation, approvals, MFA, and auditing for privileged roles.',
        reasoning: {
          correct: 'PIM supports eligible roles, activation with approval, MFA, and access reviews for least privilege.',
          why_others_wrong: {
            '1': 'Permanent assignments do not provide JIT, approval, or time-bound access.',
            '2': 'Azure Policy cannot provide on-demand elevation for human identities.',
            '3': 'Deny assignments at management groups do not solve JIT elevation needs.'
          }
        },
        reference: {
          title: 'What is Azure AD Privileged Identity Management?',
          url: 'https://learn.microsoft.com/azure/active-directory/privileged-identity-management/pim-configure'
        }
      },
      {
        topic: 'identity',
        module: 'Azure AD',
        category: 'Conditional Access',
        type: 'multiple',
        difficulty: 'easy',
        question: 'Which risk signals can be used in Conditional Access to require MFA? (Select all that apply)',
        options: [
          'User risk',
          'Sign-in risk',
          'Device compliance state',
          'Named locations'
        ],
        correct: [0, 1],
        explanation: 'Risk-based policies use User risk and Sign-in risk signals from Azure AD Identity Protection.',
        reasoning: {
          correct: 'Risk signals (user and sign-in risk) are part of Identity Protection and can trigger MFA or block.',
          why_others_wrong: {
            '2': 'Device compliance is an access condition, not a risk signal.',
            '3': 'Named locations are not risk signals; they are location conditions.'
          }
        },
        reference: {
          title: 'Conditional Access: Identity Protection integration',
          url: 'https://learn.microsoft.com/azure/active-directory/conditional-access/howto-conditional-access-policy-risk'
        }
      },
      {
        topic: 'identity',
        module: 'Azure AD',
        category: 'B2B Collaboration',
        type: 'single',
        difficulty: 'difficult',
        question: 'You must allow contractors from an external Azure AD tenant to access only one internal application using their identities. What is the best approach?',
        options: [
          'Azure AD B2B collaboration with guest users and app assignment',
          'Create new cloud-only user accounts for each contractor',
          'Establish AD DS forest trust between tenants',
          'Use Azure Lighthouse'
        ],
        correct: 0,
        explanation: 'B2B collaboration brings external users as guests to your tenant and limits access via app assignment.',
        reasoning: {
          correct: 'Guest users authenticate with their home tenant and receive least-privilege access to specific apps.',
          why_others_wrong: {
            '1': 'Cloud-only accounts duplicate identities and increase overhead.',
            '2': 'Forest trusts do not apply to Azure AD tenants.',
            '3': 'Lighthouse is for cross-tenant management, not end-user app access.'
          }
        },
        reference: {
          title: 'What is Azure AD B2B collaboration?',
          url: 'https://learn.microsoft.com/azure/active-directory/external-identities/what-is-b2b'
        }
      }
    ],
    'Backup': [
      {
        topic: 'business-continuity',
        module: 'Backup',
        category: 'Azure Backup',
        type: 'single',
        difficulty: 'easy',
        question: 'You need app-consistent backups for Azure VMs with daily retention for 35 days. What should you configure?',
        options: [
          'Recovery Services vault with a backup policy using VSS',
          'Snapshots via Azure Automation only',
          'Site Recovery with crash-consistent settings',
          'Blob snapshots of OS disks'
        ],
        correct: 0,
        explanation: 'Azure Backup in a Recovery Services vault supports app-consistent backups using VSS and retention policies.',
        reasoning: {
          correct: 'Backup policy in Recovery Services vault enables scheduling, app-consistency, and retention.',
          why_others_wrong: {
            '1': 'Automation snapshots lack retention governance and app-consistency.',
            '2': 'ASR is for replication/DR, not scheduled backups.',
            '3': 'Blob snapshots are per-disk and not integrated with VM backup policies.'
          }
        },
        reference: {
          title: 'Back up Azure VMs',
          url: 'https://learn.microsoft.com/azure/backup/backup-azure-arm-vms-prepare'
        }
      },
      {
        topic: 'business-continuity',
        module: 'Backup',
        category: 'Security',
        type: 'single',
        difficulty: 'medium',
        question: 'How can you protect backups from accidental or malicious deletion in Azure Backup?',
        options: [
          'Enable soft delete and multi-user authorization (MUA) for critical operations',
          'Enable NSG rules on the subnet',
          'Use RBAC Reader role for backup admins',
          'Enable Azure Policy audit only'
        ],
        correct: 0,
        explanation: 'Soft delete retains deleted backup data for a retention period. MUA requires secondary approval for high-risk operations.',
        reasoning: {
          correct: 'Soft delete and MUA increase protection against ransomware and malicious deletions.',
          why_others_wrong: {
            '1': 'NSGs do not protect vault operations.',
            '2': 'Reader role does not manage backup or protect deletion.',
            '3': 'Audit-only policies do not enforce protective controls.'
          }
        },
        reference: {
          title: 'Soft delete for Azure Backup',
          url: 'https://learn.microsoft.com/azure/backup/backup-azure-security-feature-cloud'
        }
      },
      {
        topic: 'business-continuity',
        module: 'Backup',
        category: 'Workload Backup',
        type: 'single',
        difficulty: 'difficult',
        question: 'You must back up SQL Server running on Azure VMs with item-level restore and long-term retention. What should you use?',
        options: [
          'Azure Backup for SQL Server in Azure VMs',
          'File-level backup using Azure Files Share snapshots',
          'Database export to BACPAC weekly',
          'Azure Site Recovery'
        ],
        correct: 0,
        explanation: 'Azure Backup provides application-aware backups for SQL on VMs with PITR and granular restore.',
        reasoning: {
          correct: 'The SQL workload backup supports full/diff/log backups and granular restore.',
          why_others_wrong: {
            '1': 'File share snapshots are not database-aware.',
            '2': 'BACPAC is for schema/data export, not backup/restore strategy.',
            '3': 'ASR is for replication, not backups.'
          }
        },
        reference: {
          title: 'Back up SQL Server on Azure VMs',
          url: 'https://learn.microsoft.com/azure/backup/backup-azure-sql-iaas'
        }
      }
    ],
    'High Availability': [
      {
        topic: 'business-continuity',
        module: 'High Availability',
        category: 'VM Availability',
        type: 'single',
        difficulty: 'easy',
        question: 'Which option provides protection against a full datacenter failure within a region for VMs?',
        options: [
          'Availability Sets',
          'Availability Zones',
          'Proximity Placement Groups',
          'Accelerated Networking'
        ],
        correct: 1,
        explanation: 'Availability Zones distribute resources across physically separate datacenters within a region.',
        reasoning: {
          correct: 'Zones provide datacenter-level fault isolation.',
          why_others_wrong: {
            '0': 'Sets protect only against rack-level failures.',
            '2': 'PPGs reduce latency; they do not provide HA.',
            '3': 'Accelerated Networking improves throughput/latency.'
          }
        },
        reference: {
          title: 'Availability options for VMs',
          url: 'https://learn.microsoft.com/azure/virtual-machines/availability'
        }
      },
      {
        topic: 'business-continuity',
        module: 'High Availability',
        category: 'Data Tier',
        type: 'single',
        difficulty: 'medium',
        question: 'You need zone-resilient SQL with 99.99% SLA. What should you deploy?',
        options: [
          'Azure SQL Database General Purpose',
          'Azure SQL Database Business Critical with zone redundancy',
          'SQL on VMs with Availability Set',
          'Single-instance SQL Managed Instance'
        ],
        correct: 1,
        explanation: 'Business Critical tier supports zone redundancy for high availability.',
        reasoning: {
          correct: 'BC tier provides multiple replicas and zone redundancy.',
          why_others_wrong: {
            '0': 'General Purpose uses remote storage and may not be zone redundant.',
            '2': 'VM-based solution requires complex setup and lacks PaaS SLA features.',
            '3': 'Single-instance MI is not zone redundant by default.'
          }
        },
        reference: {
          title: 'High availability for Azure SQL Database',
          url: 'https://learn.microsoft.com/azure/azure-sql/database/high-availability-sla'
        }
      },
      {
        topic: 'business-continuity',
        module: 'High Availability',
        category: 'Networking',
        type: 'single',
        difficulty: 'difficult',
        question: 'You require L7 load balancing with zone redundancy and WAF for regional traffic. Which service should you choose?',
        options: [
          'Basic Load Balancer',
          'Traffic Manager',
          'Application Gateway v2 (WAF) with zone redundancy',
          'Azure Front Door Classic only'
        ],
        correct: 2,
        explanation: 'App Gateway v2 supports zone redundancy and WAF for regional L7 load balancing.',
        reasoning: {
          correct: 'It provides HTTPS termination, path-based routing, autoscaling, and WAF with zone redundancy.',
          why_others_wrong: {
            '0': 'Basic LB is L4 and not zone redundant.',
            '1': 'Traffic Manager is DNS-based, not L7 LB.',
            '3': 'Front Door is global; the requirement is regional.'
          }
        },
        reference: {
          title: 'Application Gateway v2 SKU',
          url: 'https://learn.microsoft.com/azure/application-gateway/overview-v2'
        }
      }
    ],
    'Migration': [
      {
        topic: 'infrastructure',
        module: 'Migration',
        category: 'Azure Migrate',
        type: 'single',
        difficulty: 'easy',
        question: 'What is the typical sequence for migrating VMware VMs with Azure Migrate Server Migration?',
        options: [
          'Replicate → Discover → Assess → Migrate',
          'Discover → Assess → Replicate → Test migrate → Migrate',
          'Assess → Discover → Replicate → Migrate',
          'Discover → Replicate → Assess → Migrate'
        ],
        correct: 1,
        explanation: 'Discovery, assessment, replication, test migration, then production migration is the recommended sequence.',
        reasoning: {
          correct: 'Assessment informs sizing and readiness before replication and migration.',
          why_others_wrong: {
            '0': 'Replication should not precede discovery and assessment.',
            '2': 'Assessment requires discovery first.',
            '3': 'Assessment should precede replication.'
          }
        },
        reference: {
          title: 'Migrate VMware VMs to Azure',
          url: 'https://learn.microsoft.com/azure/migrate/migrate-support-matrix-vmware'
        }
      },
      {
        topic: 'infrastructure',
        module: 'Migration',
        category: 'Appliance',
        type: 'single',
        difficulty: 'medium',
        question: 'Which component must you deploy in your environment to collect discovery data for Azure Migrate?',
        options: [
          'Azure Migrate appliance',
          'ExpressRoute circuit',
          'Log Analytics agent only',
          'Azure Site Recovery Mobility service only'
        ],
        correct: 0,
        explanation: 'The Azure Migrate appliance collects metadata for discovery and assessment.',
        reasoning: {
          correct: 'Appliance performs discovery of servers and dependencies.',
          why_others_wrong: {
            '1': 'ExpressRoute is optional connectivity, not required.',
            '2': 'Agent alone is insufficient for discovery scope.',
            '3': 'Mobility service is used for replication, not discovery.'
          }
        },
        reference: {
          title: 'Discover servers with Azure Migrate appliance',
          url: 'https://learn.microsoft.com/azure/migrate/migrate-appliance'
        }
      },
      {
        topic: 'infrastructure',
        module: 'Migration',
        category: 'Database Migration',
        type: 'single',
        difficulty: 'difficult',
        question: 'You must migrate a mission-critical SQL Server database to Azure SQL Managed Instance with minimal downtime. What should you use?',
        options: [
          'Azure Database Migration Service online migration',
          'BACPAC export/import',
          'Backup and restore to Azure Blob Storage',
          'Transactional replication to Azure SQL Database'
        ],
        correct: 0,
        explanation: 'DMS online migration supports continuous data sync and cutover with minimal downtime.',
        reasoning: {
          correct: 'Online migration reduces downtime by syncing changes until cutover.',
          why_others_wrong: {
            '1': 'BACPAC incurs long downtime and is for small/medium databases.',
            '2': 'Backup/restore is not supported for MI without managed backup integration and still incurs downtime.',
            '3': 'Transactional replication targets Azure SQL Database, not MI for all scenarios.'
          }
        },
        reference: {
          title: 'Use DMS for online migration',
          url: 'https://learn.microsoft.com/azure/dms/tutorial-sql-server-to-managed-instance'
        }
      }
    ]
  },
  'ai-900': {
    'Face API': [
      {
        topic: 'computer-vision',
        module: 'Face API',
        category: 'Capabilities',
        type: 'single',
        difficulty: 'easy',
        question: 'Which Face service operation determines whether two faces belong to the same person?',
        options: [
          'Detect',
          'Verify',
          'Identify',
          'Analyze'
        ],
        correct: 1,
        explanation: 'Verify compares two faces and returns a confidence score of whether they are the same person.',
        reasoning: {
          correct: 'Verify takes two face IDs and checks if they belong to the same person.',
          why_others_wrong: {
            '0': 'Detect finds faces and returns face IDs but does not compare.',
            '2': 'Identify matches a face against a PersonGroup to find a person.',
            '3': 'Analyze extracts attributes like age and emotion.'
          }
        },
        reference: {
          title: 'Face service - Verify and Identify',
          url: 'https://learn.microsoft.com/azure/cognitive-services/face/overview'
        }
      },
      {
        topic: 'computer-vision',
        module: 'Face API',
        category: 'Training',
        type: 'single',
        difficulty: 'medium',
        question: 'Before using the Identify operation, what must you configure?',
        options: [
          'Create a PersonGroup and add persons with face samples',
          'Enable multi-region replication for the Face resource',
          'Configure custom vision projects',
          'Enable key rotation'
        ],
        correct: 0,
        explanation: 'Identify requires a PersonGroup (or LargePersonGroup) with enrolled faces to match against.',
        reasoning: {
          correct: 'Identification is a 1-to-N match against a trained group.',
          why_others_wrong: {
            '1': 'Replication is unrelated to Identify.',
            '2': 'Custom Vision is a different service.',
            '3': 'Key rotation is a security best practice but not required for Identify.'
          }
        },
        reference: {
          title: 'PersonGroup concepts',
          url: 'https://learn.microsoft.com/azure/cognitive-services/face/face-api-how-to-topics/persons'
        }
      },
      {
        topic: 'computer-vision',
        module: 'Face API',
        category: 'Responsible AI',
        type: 'single',
        difficulty: 'difficult',
        question: 'Which practice aligns with responsible use of the Face service in production?',
        options: [
          'Provide clear user notice and obtain consent where required',
          'Store all face images indefinitely for future analysis',
          'Use Face service for sensitive attributes like race',
          'Deploy without human oversight in critical scenarios'
        ],
        correct: 0,
        explanation: 'Responsible AI guidance emphasizes transparency, consent, data minimization, and human oversight.',
        reasoning: {
          correct: 'Ethical use requires clear notice, consent where required, and data governance.',
          why_others_wrong: {
            '1': 'Data minimization discourages indefinite retention.',
            '2': 'Sensitive attribute inference is discouraged and may be restricted.',
            '3': 'High-stakes scenarios require human-in-the-loop.'
          }
        },
        reference: {
          title: 'Responsible use of Azure AI services',
          url: 'https://learn.microsoft.com/legal/cognitive-services/openai/transparency-note'
        }
      }
    ]
  }
};

function seedMissingModules(examId, exam) {
  const availableSeeds = SEED_QUESTIONS[examId] || {};
  const modulesDeclared = new Set(exam.topics.flatMap(t => t.modules));
  const existingKeys = new Set(exam.questions.map(getQuestionKey));
  let maxId = exam.questions.reduce((m, q) => Math.max(m, Number(q.id) || 0), 0);
  let seeded = 0;
  for (const moduleName of modulesDeclared) {
    const currentCount = exam.questions.filter(q => q.module === moduleName).length;
    const seeds = availableSeeds[moduleName] || [];
    if (currentCount >= MIN_PER_MODULE) continue;
    if (!seeds.length) continue;
    const needed = Math.min(seeds.length, MIN_PER_MODULE - currentCount);
    let used = 0;
    for (let i = 0; i < seeds.length && used < needed; i++) {
      const q = seeds[i];
      const key = getQuestionKey(q);
      if (existingKeys.has(key)) continue;
      const newQ = { ...q, id: ++maxId };
      exam.questions.push(newQ);
      existingKeys.add(key);
      used++;
      seeded++;
    }
  }
  return seeded;
}

function computeTargets(total, existingCounts) {
	// Base equal split
	const base = Math.floor(total / 3);
	const order = ['easy', 'medium', 'difficult'];
	const targets = { easy: base, medium: base, difficult: base };
	let remainder = total - (base * 3);
	for (let i = 0; i < remainder; i++) {
		targets[order[i % order.length]]++;
	}
	// Respect existing counts: never reduce below what's already assigned
	for (const k of order) {
		if (existingCounts[k] > targets[k]) targets[k] = existingCounts[k];
	}
	// If targets sum exceeds total due to existing counts skew, cap and then rebalance others down if needed
	let sumTargets = targets.easy + targets.medium + targets.difficult;
	if (sumTargets > total) {
		// Reduce from the largest buckets first until match total
		while (sumTargets > total) {
			let maxK = 'easy';
			for (const k of order) {
				if (targets[k] > targets[maxK]) maxK = k;
			}
			if (targets[maxK] > existingCounts[maxK]) {
				targets[maxK]--;
				sumTargets--;
			} else {
				// If cannot reduce this one, try next
				const next = order.find(k => targets[k] > existingCounts[k]);
				if (!next) break; // nothing reducible, exit
				targets[next]--;
				sumTargets--;
			}
		}
	}
	// If sum less than total (due to capping), increase from smallest buckets first
	while (targets.easy + targets.medium + targets.difficult < total) {
		let minK = 'easy';
		for (const k of order) if (targets[k] < targets[minK]) minK = k;
		targets[minK]++;
	}
	return targets;
}

function assignDifficultiesPerModule(exam) {
	// Group questions by module
	const byModule = new Map();
	exam.questions.forEach((q, idx) => {
		const moduleName = q.module || 'Unknown';
		if (!byModule.has(moduleName)) byModule.set(moduleName, []);
		byModule.get(moduleName).push({ q, idx });
	});
	const difficulties = ['easy', 'medium', 'difficult'];
	for (const [moduleName, items] of byModule.entries()) {
		const total = items.length;
		const existingCounts = { easy: 0, medium: 0, difficult: 0 };
		const missing = [];
		for (const { q } of items) {
			if (difficulties.includes(q.difficulty)) {
				existingCounts[q.difficulty]++;
			} else {
				missing.push(q);
			}
		}
		if (missing.length === 0) continue;
		const targets = computeTargets(total, existingCounts);
		const need = {
			easy: Math.max(0, targets.easy - existingCounts.easy),
			medium: Math.max(0, targets.medium - existingCounts.medium),
			difficult: Math.max(0, targets.difficult - existingCounts.difficult)
		};
		// Assign in round-robin order easy -> medium -> difficult until need fulfilled
		let i = 0;
		while (i < missing.length) {
			for (const d of difficulties) {
				if (need[d] > 0 && i < missing.length) {
					missing[i].difficulty = d;
					need[d]--;
					i++;
				}
			}
			// If some remained unassigned due to rounding or skew, fill remaining sequentially
			if (i < missing.length && need.easy === 0 && need.medium === 0 && need.difficult === 0) {
				missing[i].difficulty = difficulties[i % difficulties.length];
				i++;
			}
		}
	}
}

function main() {
	const data = readJson(EXAMS_JSON);
	const spa = fs.existsSync(SPA_JSON) ? readJson(SPA_JSON) : null;
	const examIds = Object.keys(data.exams);
	let summary = [];

	for (const examId of examIds) {
		const exam = data.exams[examId];
		let added = 0;
		if (spa && spa.exams && spa.exams[examId]) {
			added = mergeSpaQuestionsIntoExam(exam, spa.exams[examId]);
		}
		const seeded = seedMissingModules(examId, exam);
		assignDifficultiesPerModule(exam);
		// Ensure every question has difficulty
		let filled = 0;
		for (const q of exam.questions) {
			if (!['easy', 'medium', 'difficult'].includes(q.difficulty)) {
				q.difficulty = 'medium';
				filled++;
			}
		}
		// Update totalQuestions to match actual count
		exam.totalQuestions = exam.questions.length;
		summary.push({ examId, addedFromSpa: added, seeded, total: exam.questions.length, newlyFilled: filled });
	}

	const backup = backupFile(EXAMS_JSON);
	writeJson(EXAMS_JSON, data);
	console.log('Backup created at:', backup);
	console.log('Update summary:', summary);

	// Print per-exam, per-module difficulty counts
	for (const examId of examIds) {
		const exam = data.exams[examId];
		const modules = new Map();
		exam.questions.forEach(q => {
			const m = q.module || 'Unknown';
			if (!modules.has(m)) modules.set(m, { total: 0, easy: 0, medium: 0, difficult: 0 });
			const stat = modules.get(m);
			stat.total++;
			if (['easy','medium','difficult'].includes(q.difficulty)) stat[q.difficulty]++;
		});
		console.log(`Exam ${examId}: modules ${modules.size}`);
		let modReport = {};
		for (const [m, s] of modules) modReport[m] = s;
		console.log(modReport);
	}
}

if (require.main === module) {
	main();
}