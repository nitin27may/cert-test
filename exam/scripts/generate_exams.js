/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const TARGET_PER_EXAM = 800; // minimum questions per exam

function readJson(filePath) {
	const text = fs.readFileSync(filePath, 'utf8');
	return JSON.parse(text);
}

function writeJson(filePath, data) {
	const json = JSON.stringify(data, null, 2);
	fs.writeFileSync(filePath, json, 'utf8');
}

function getMaxId(questions) {
	return questions.reduce((max, q) => Math.max(max, q.id || 0), 0);
}

function asWhyOthersWrong(wrongReasons) {
	// wrongReasons is array of [index, reason]
	const map = {};
	for (const [idx, reason] of wrongReasons) {
		map[String(idx)] = reason;
	}
	return map;
}

function pick(arr, idx) {
	return arr[idx % arr.length];
}

function seededRand(seed) {
	let x = Math.sin(seed + 1) * 10000;
	return x - Math.floor(x);
}

function randInt(min, max, seed) {
	return Math.floor(seededRand(seed) * (max - min + 1)) + min;
}

function shuffle(arr, seed) {
	const a = arr.slice();
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(seededRand(seed + i) * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

// ----------------------- AZ-104 GENERATORS -----------------------
function makeAz104Templates() {
	const refs = {
		vnetPlan: {
			title: 'Plan virtual networks - Azure Virtual Network',
			url: 'https://docs.microsoft.com/en-us/azure/virtual-network/virtual-network-vnet-plan-design-arm'
		},
		nsg: {
			title: 'Network security groups - Azure Virtual Network',
			url: 'https://docs.microsoft.com/en-us/azure/virtual-network/network-security-groups-overview'
		},
		lbStd: {
			title: 'Standard Load Balancer overview - Azure Load Balancer',
			url: 'https://docs.microsoft.com/en-us/azure/load-balancer/load-balancer-standard-overview'
		},
		vpnDesign: {
			title: 'VPN Gateway design - Azure VPN Gateway',
			url: 'https://docs.microsoft.com/en-us/azure/vpn-gateway/design'
		},
		dnsAppSvc: {
			title: 'Map an existing custom DNS name to Azure App Service',
			url: 'https://docs.microsoft.com/en-us/azure/app-service/app-service-web-tutorial-custom-domain'
		},
		peering: {
			title: 'Virtual network peering - Azure Virtual Network',
			url: 'https://docs.microsoft.com/en-us/azure/virtual-network/virtual-network-peering-overview'
		},
		azFwRules: {
			title: 'Azure Firewall rule processing logic',
			url: 'https://docs.microsoft.com/en-us/azure/firewall/rule-processing'
		},
		agwFeatures: {
			title: 'Application Gateway features - Azure Application Gateway',
			url: 'https://docs.microsoft.com/en-us/azure/application-gateway/features'
		},
		udr: {
			title: 'Virtual network traffic routing - Azure Virtual Network',
			url: 'https://docs.microsoft.com/en-us/azure/virtual-network/virtual-networks-udr-overview'
		},
		expressPeering: {
			title: 'ExpressRoute routing requirements - Azure ExpressRoute',
			url: 'https://docs.microsoft.com/en-us/azure/expressroute/expressroute-routing'
		},
		asg: {
			title: 'Application security groups - Azure Virtual Network',
			url: 'https://docs.microsoft.com/en-us/azure/virtual-network/application-security-groups'
		},
		serviceEndpoints: {
			title: 'Virtual Network service endpoints',
			url: 'https://docs.microsoft.com/en-us/azure/virtual-network/virtual-network-service-endpoints-overview'
		},
		trafficMgr: {
			title: 'Traffic Manager routing methods - Azure Traffic Manager',
			url: 'https://docs.microsoft.com/en-us/azure/traffic-manager/traffic-manager-routing-methods'
		},
		p2s: {
			title: 'About Point-to-Site VPN - Azure VPN Gateway',
			url: 'https://docs.microsoft.com/en-us/azure/vpn-gateway/point-to-site-about'
		},
		privDns: {
			title: 'Azure Private DNS zones - Azure DNS',
			url: 'https://docs.microsoft.com/en-us/azure/dns/private-dns-overview'
		},
		ddos: {
			title: 'Azure DDoS Protection Standard - Azure DDoS Protection',
			url: 'https://docs.microsoft.com/en-us/azure/ddos-protection/ddos-protection-overview'
		},
		sslAgw: {
			title: 'Application Gateway SSL termination and end-to-end SSL',
			url: 'https://docs.microsoft.com/en-us/azure/application-gateway/ssl-overview'
		},
		nva: {
			title: 'Network virtual appliances in Azure',
			url: 'https://docs.microsoft.com/en-us/azure/architecture/reference-architectures/dmz/nva-ha'
		},
		frontDoor: {
			title: 'Azure Front Door overview',
			url: 'https://docs.microsoft.com/en-us/azure/frontdoor/front-door-overview'
		},
		globalReach: {
			title: 'ExpressRoute Global Reach overview',
			url: 'https://docs.microsoft.com/en-us/azure/expressroute/expressroute-global-reach'
		},
		natGw: {
			title: 'Azure NAT Gateway overview',
			url: 'https://docs.microsoft.com/en-us/azure/virtual-network/nat-overview'
		},
		privateLinkSql: {
			title: 'Azure Private Link for SQL Database',
			url: 'https://docs.microsoft.com/en-us/azure/azure-sql/database/private-endpoint-overview'
		}
	};

	const templates = [];

	// 1) Address space planning
	templates.push((seed, id) => {
		const vmCount = randInt(1200, 4000, seed);
		// choose mask options around the need
		const options = [
			'10.0.0.0/21 (2046 addresses)',
			'10.0.0.0/20 (4094 addresses)',
			'10.0.0.0/19 (8190 addresses)',
			'10.0.0.0/18 (16382 addresses)'
		];
		let correctIdx = 2;
		if (vmCount <= 2000) correctIdx = 2; else if (vmCount <= 4000) correctIdx = 3; else correctIdx = 3;
		return {
			id,
			topic: 'networking',
			module: 'Virtual Networks',
			category: 'Virtual Networks',
			type: 'single',
			question: `You are planning a virtual network that must support approximately ${vmCount} virtual machines across multiple subnets with room for growth. Which address space should you choose to minimize waste while allowing subnetting?`,
			options,
			correct: correctIdx,
			explanation: correctIdx === 2 ? 'A /19 provides 8190 usable IPs, which covers ~' + vmCount + ' VMs and allows subnetting.' : 'A /18 provides 16382 usable IPs, providing headroom for ~' + vmCount + ' VMs and future growth.',
			reasoning: {
				correct: 'Choose the smallest prefix that satisfies current and near-term capacity while allowing subnet segmentation. /19 ≈ 8190 usable, /18 ≈ 16382 usable.',
				why_others_wrong: asWhyOthersWrong([
					[0, '/21 is too small for the requirement and leaves no room for subnetting or growth.'],
					[1, '/20 may be tight for multi-subnet growth and could constrain future scaling.'],
					[correctIdx === 2 ? 3 : 2, correctIdx === 2 ? '/18 is significantly larger than needed, causing unnecessary waste.' : '/19 may be insufficient for the upper end of the requirement.']
				])
			},
			reference: refs.vnetPlan
		};
	});

	// 2) NSG priority to block specific IP but allow general traffic
	templates.push((seed, id) => {
		const ip = `203.0.${randInt(0, 255, seed)}.${randInt(1, 254, seed + 1)}`;
		return {
			id,
			topic: 'networking',
			module: 'Network Security',
			category: 'Network Security Groups',
			type: 'single',
			question: `You have an NSG with an allow rule for HTTPS (443) from Internet at priority 200. You must block HTTPS from ${ip} without affecting other sources. What should you do?`,
			options: [
				'Create a deny HTTPS rule for the IP with priority 100',
				'Create a deny HTTPS rule for the IP with priority 300',
				'Edit the existing rule to exclude the IP',
				'Add a deny rule at priority 4096'
			],
			correct: 0,
			explanation: 'NSG rules are processed by ascending priority. A lower-number (higher priority) deny must precede the general allow rule to be effective.',
			reasoning: {
				correct: 'Place a specific deny with a lower priority number (e.g., 100) so it is evaluated before the broad allow at 200.',
				why_others_wrong: asWhyOthersWrong([
					[1, 'A rule at 300 would be evaluated after the allow at 200 and would never match.'],
					[2, 'NSG rules cannot exclude specific IPs within a single rule; you need a separate rule.'],
					[3, 'Priority 4096 runs after most custom rules and would not override an earlier allow.']
				])
			},
			reference: refs.nsg
		};
	});

	// 3) Standard Load Balancer features
	templates.push((seed, id) => {
		const options = [
			'Availability Zone support',
			'Multiple frontend IPs',
			'HTTPS health probes',
			'Port 0 wildcard rules',
			'Outbound rules configuration'
		];
		const correct = [0, 1, 2, 4];
		return {
			id,
			topic: 'networking',
			module: 'Load Balancing',
			category: 'Azure Load Balancer',
			type: 'multiple',
			question: 'Which features are supported by Standard Load Balancer? (Select all that apply)',
			options,
			correct,
			explanation: 'Standard Load Balancer supports AZs, multiple frontends, HTTPS probes, and outbound rules. Port 0 wildcard is not supported.',
			reasoning: {
				correct: 'Premium SKU capabilities include zone redundancy, multiple frontends, layer-7 compatible probe protocol HTTPS, and egress control via outbound rules.',
				why_others_wrong: asWhyOthersWrong([[3, 'Port 0 is not a valid wildcard in Azure Load Balancer; explicit ports or ranges are required.']])
			},
			reference: refs.lbStd
		};
	});

	// 4) VPN Gateway route-based with BGP
	templates.push((seed, id) => ({
		id,
		topic: 'networking',
		module: 'VPN & ExpressRoute',
		category: 'VPN Gateway',
		type: 'single',
		question: 'Your on-premises device supports IKEv2 and BGP. Which Azure VPN Gateway configuration provides flexibility and performance?',
		options: [
			'Basic SKU with policy-based VPN',
			'VpnGw1 route-based with BGP',
			'Standard SKU with policy-based VPN',
			'VpnGw2 policy-based with BGP'
		],
		correct: 1,
		explanation: 'Route-based with BGP provides dynamic routing, multiple tunnels, and best flexibility. Basic lacks BGP.',
		reasoning: {
			correct: 'Route-based VPN with BGP enables dynamic routing, active-active, and multi-tunnel topologies.',
			why_others_wrong: asWhyOthersWrong([
				[0, 'Basic does not support BGP and has lower throughput.'],
				[2, 'Policy-based VPN is less flexible than route-based and lacks certain scenarios.'],
				[3, 'Combining policy-based with BGP is not a valid approach for Azure; BGP requires route-based.']
			])
		},
		reference: refs.vpnDesign
	}));

	// 5) App Service custom domain sequence
	templates.push((seed, id) => ({
		id,
		topic: 'networking',
		module: 'DNS',
		category: 'App Service Custom Domain',
		type: 'single',
		question: 'What is the correct sequence to map a custom domain to Azure App Service managed by Azure DNS?',
		options: [
			'Create TXT for verification → Add domain → Create CNAME',
			'Add domain → Create CNAME → Create TXT',
			'Create CNAME → Add domain → Create TXT',
			'Create TXT → Create CNAME → Add domain'
		],
		correct: 0,
		explanation: 'Verify ownership first with TXT, then add domain, then route with CNAME.',
		reasoning: {
			correct: 'Ownership verification via TXT must precede adding the domain to App Service; traffic routing via CNAME comes last.',
			why_others_wrong: asWhyOthersWrong([
				[1, 'Adding the domain fails if verification is not in place.'],
				[2, 'CNAME without verified ownership will not complete the mapping.'],
				[3, 'CNAME before adding the domain is premature.']
			])
		},
		reference: refs.dnsAppSvc
	}));

	// 6) VNet peering truths
	templates.push((seed, id) => ({
		id,
		topic: 'networking',
		module: 'Virtual Networks',
		category: 'VNet Peering',
		type: 'multiple',
		question: 'Which statements about VNet peering are correct? (Select all that apply)',
		options: [
			'Peering is not transitive',
			'NSG rules apply to peered traffic',
			'Global VNet peering enables cross-region peering',
			'Traffic is encrypted by default between peers',
			'VNets must be in the same subscription'
		],
		correct: [0, 1, 2],
		explanation: 'Peering is non-transitive; NSGs apply; global peering enables cross-region. Traffic is private but not encrypted; cross-subscription peering is supported.',
		reasoning: {
			correct: 'VNet peering is private, non-transitive, with NSG enforcement; global peering supports cross-region.',
			why_others_wrong: asWhyOthersWrong([
				[3, 'Traffic uses Microsoft backbone but is not encrypted by default.'],
				[4, 'Cross-subscription peering is supported with proper permissions.']
			])
		},
		reference: refs.peering
	}));

	// 7) Azure Firewall rule order
	templates.push((seed, id) => ({
		id,
		topic: 'networking',
		module: 'Network Security',
		category: 'Azure Firewall',
		type: 'single',
		question: 'Azure Firewall has DNAT (prio 100), Network (200), and Application (300) rule collections. A packet matches all three. Which is applied?',
		options: [
			'DNAT rule only',
			'Network rule only',
			'Application rule only',
			'All are evaluated and combined'
		],
		correct: 0,
		explanation: 'DNAT is processed first; once matched, processing stops.',
		reasoning: {
			correct: 'Rule processing is hierarchical: DNAT → Network → Application; first match wins.',
			why_others_wrong: asWhyOthersWrong([
				[1, 'Network rules are evaluated after DNAT.'],
				[2, 'Application rules are last.'],
				[3, 'Azure Firewall does not combine multiple rule types per packet.']
			])
		},
		reference: refs.azFwRules
	}));

	// 8) App Gateway routing capabilities
	templates.push((seed, id) => ({
		id,
		topic: 'networking',
		module: 'Application Gateway',
		category: 'Routing',
		type: 'multiple',
		question: 'Which Application Gateway capabilities support advanced routing? (Select all that apply)',
		options: [
			'Path-based routing',
			'Multi-site hosting',
			'URL rewrite',
			'Header-based routing (arbitrary headers)',
			'IP-based routing'
		],
		correct: [0, 1, 2],
		explanation: 'Path-based, multi-site, and URL rewrite are supported. Arbitrary header or IP-based routing are not standard.',
		reasoning: {
			correct: 'App Gateway operates at L7 with host/path-based rules and rewrite; arbitrary header or IP-based routing is not provided as a first-class routing criterion.',
			why_others_wrong: asWhyOthersWrong([
				[3, 'Header inspection exists but routing on arbitrary headers is not a native capability.'],
				[4, 'App Gateway routes on HTTP/S properties, not source IP.']
			])
		},
		reference: refs.agwFeatures
	}));

	// 9) Routing precedence (UDR vs BGP vs system)
	templates.push((seed, id) => ({
		id,
		topic: 'networking',
		module: 'Virtual Networks',
		category: 'Routing',
		type: 'single',
		question: 'A subnet has system 0.0.0.0/0 → Internet, UDR 10.1.1.0/24 → VNet Gateway, and BGP 10.1.1.0/25 → ExpressRoute. Where is 10.1.1.10 routed?',
		options: [
			'Internet',
			'VNet Gateway',
			'ExpressRoute',
			'Virtual Appliance'
		],
		correct: 2,
		explanation: 'Among overlapping routes of same/higher precedence, the longest prefix wins. BGP 10.1.1.0/25 is more specific than UDR 10.1.1.0/24.',
		reasoning: {
			correct: 'Precedence: UDR > BGP > System; within same precedence, longest prefix match. Here, /25 beats /24.',
			why_others_wrong: asWhyOthersWrong([
				[0, 'Default route is lowest precedence and least specific.'],
				[1, 'UDR /24 is less specific than BGP /25.'],
				[3, 'No UDR points to a virtual appliance in this scenario.']
			])
		},
		reference: refs.udr
	}));

	// 10) ExpressRoute Microsoft peering scope
	templates.push((seed, id) => ({
		id,
		topic: 'networking',
		module: 'VPN & ExpressRoute',
		category: 'ExpressRoute',
		type: 'single',
		question: 'With Microsoft peering, which Azure services are reachable?',
		options: [
			'Only VNet resources',
			'PaaS services via public endpoints (Storage, SQL, Cosmos DB)',
			'Only services in same region',
			'All services including private endpoints'
		],
		correct: 1,
		explanation: 'Microsoft peering exposes Microsoft public services; private endpoints use private peering.',
		reasoning: {
			correct: 'Microsoft peering is for public IP-based services (Azure public services) over private connectivity.',
			why_others_wrong: asWhyOthersWrong([
				[0, 'VNet resources use private peering.'],
				[2, 'Scope is global for Microsoft public services.'],
				[3, 'Private endpoints are reachable via private peering, not Microsoft peering.']
			])
		},
		reference: refs.expressPeering
	}));

	// 11) ASG microsegmentation
	templates.push((seed, id) => ({
		id,
		topic: 'networking',
		module: 'Network Security',
		category: 'Application Security Groups',
		type: 'multiple',
		question: 'Which are true about Application Security Groups (ASGs)? (Select all that apply)',
		options: [
			'VMs can be in multiple ASGs',
			'ASGs can be used in NSG rules as source/destination',
			'ASGs span multiple VNets',
			'ASGs reduce NSG rule complexity',
			'ASGs can include on-premises IPs'
		],
		correct: [0, 1, 3],
		explanation: 'ASGs are per-VNet constructs used within NSGs and reduce rule sprawl. They do not span VNets or include on-prem IPs.',
		reasoning: {
			correct: 'ASGs enable application-centric rule targeting within a VNet; membership is per-VM and can be multiple.',
			why_others_wrong: asWhyOthersWrong([
				[2, 'ASGs are scoped to a single VNet.'],
				[4, 'ASGs cannot include external/on-prem IP addresses.']
			])
		},
		reference: refs.asg
	}));

	// 12) Service Endpoints two-sided config
	templates.push((seed, id) => ({
		id,
		topic: 'networking',
		module: 'Virtual Networks',
		category: 'Service Endpoints',
		type: 'single',
		question: 'Service endpoints are enabled on a subnet. Access to a Storage account that allows only that subnet fails. What is most likely missing?',
		options: [
			'Allow the subnet on the storage firewall rules',
			'Enable service endpoints on the storage account',
			'Public IP on the VM',
			'Custom route to the storage account'
		],
		correct: 0,
		explanation: 'You must add the specific subnet to the service firewall allowlist on the service side.',
		reasoning: {
			correct: 'Service endpoints require subnet enablement and service firewall configuration to permit that subnet.',
			why_others_wrong: asWhyOthersWrong([
				[1, 'Endpoints are configured on subnets, not on the service resource.'],
				[2, 'Service endpoints work with private IPs; no public IP needed.'],
				[3, 'Routing changes are not required for service endpoints.']
			])
		},
		reference: refs.serviceEndpoints
	}));

	// 13) Traffic Manager performance routing
	templates.push((seed, id) => ({
		id,
		topic: 'networking',
		module: 'Load Balancing',
		category: 'Traffic Manager',
		type: 'single',
		question: 'Users should be directed to the closest healthy endpoint globally. Which Traffic Manager method?',
		options: [
			'Performance',
			'Geographic',
			'Weighted',
			'Priority'
		],
		correct: 0,
		explanation: 'Performance routing directs to the lowest-latency endpoint based on measurements.',
		reasoning: {
			correct: 'Performance uses latency tables to route to the best-performing endpoint for the user.',
			why_others_wrong: asWhyOthersWrong([
				[1, 'Geographic maps regions to endpoints manually, not based on latency.'],
				[2, 'Weighted disregards location/latency.'],
				[3, 'Priority is for failover, not proximity.']
			])
		},
		reference: refs.trafficMgr
	}));

	// 14) P2S authentication methods
	templates.push((seed, id) => ({
		id,
		topic: 'networking',
		module: 'VPN & ExpressRoute',
		category: 'Point-to-Site',
		type: 'multiple',
		question: 'Which authentication methods are supported for Point-to-Site VPN? (Select all that apply)',
		options: [
			'Certificate-based authentication',
			'Azure AD authentication (OpenVPN)',
			'RADIUS authentication',
			'Username/password only',
			'Smart card native support'
		],
		correct: [0, 1, 2],
		explanation: 'Certificate, Azure AD (OpenVPN), and RADIUS are supported. Plain username/password and native smart card support are not direct options.',
		reasoning: {
			correct: 'P2S supports certs, Azure AD with OpenVPN, and RADIUS integration.',
			why_others_wrong: asWhyOthersWrong([
				[3, 'Direct username/password is not supported without Azure AD or RADIUS.'],
				[4, 'Smart cards can be part of RADIUS but are not a native P2S method.']
			])
		},
		reference: refs.p2s
	}));

	// 15) Private DNS auto-registration
	templates.push((seed, id) => ({
		id,
		topic: 'networking',
		module: 'DNS',
		category: 'Private DNS Zones',
		type: 'single',
		question: 'A VM does not auto-register in a linked private DNS zone with auto-registration enabled. Most likely cause?',
		options: [
			'DNS resolution not enabled on the VNet link',
			'VM uses static private IP',
			'Private zone conflicts with public zone',
			'Subnet does not support auto-registration'
		],
		correct: 0,
		explanation: 'Both auto-registration and DNS resolution must be enabled on the VNet link.',
		reasoning: {
			correct: 'Without resolution enabled, auto-registration will not function properly.',
			why_others_wrong: asWhyOthersWrong([
				[1, 'Static IPs can still auto-register.'],
				[2, 'Private zones can have same names without conflict in VNet scope.'],
				[3, 'Auto-registration is VNet-wide, not subnet-restricted.']
			])
		},
		reference: refs.privDns
	}));

	// 16) DDoS telemetry
	templates.push((seed, id) => ({
		id,
		topic: 'networking',
		module: 'Network Security',
		category: 'DDoS Protection',
		type: 'single',
		question: 'To obtain detailed attack metrics and mitigation reports with DDoS Protection Standard, what should you configure?',
		options: [
			'DDoS diagnostic logs in Azure Monitor',
			'NSG flow logs only',
			'Azure Firewall logs',
			'Azure Security Center alerts only'
		],
		correct: 0,
		explanation: 'DDoS Protection emits detailed telemetry via diagnostic logs and metrics in Azure Monitor.',
		reasoning: {
			correct: 'Enable DDoSProtectionNotifications, MitigationReports, and FlowLogs for detailed insights.',
			why_others_wrong: asWhyOthersWrong([
				[1, 'NSG flow logs do not include DDoS mitigation metrics.'],
				[2, 'Firewall logs do not cover platform DDoS telemetry.'],
				[3, 'Defender for Cloud alerts are complementary, not the primary telemetry source.']
			])
		},
		reference: refs.ddos
	}));

	// 17) End-to-end SSL with differing backend certs
	templates.push((seed, id) => ({
		id,
		topic: 'networking',
		module: 'Application Gateway',
		category: 'SSL/TLS',
		type: 'single',
		question: 'You need SSL termination at Application Gateway and re-encryption to backends that use different certificates. What should you configure?',
		options: [
			'SSL passthrough only',
			'End-to-end SSL with multiple backend HTTP settings',
			'SSL termination only',
			'HTTP to HTTPS redirect'
		],
		correct: 1,
		explanation: 'Use end-to-end SSL and separate backend HTTP settings to validate different backend certs.',
		reasoning: {
			correct: 'Multiple backend HTTP settings allow associating distinct trusted root certificates per backend pool.',
			why_others_wrong: asWhyOthersWrong([
				[0, 'Passthrough disables inspection and termination at the gateway.'],
				[2, 'Termination only sends HTTP to backends, which is not secure.'],
				[3, 'Redirect does not address end-to-end encryption.']
			])
		},
		reference: refs.sslAgw
	}));

	// 18) NVA forwarding and UDR
	templates.push((seed, id) => ({
		id,
		topic: 'networking',
		module: 'Virtual Networks',
		category: 'Network Virtual Appliances',
		type: 'single',
		question: 'Traffic is not flowing through an NVA deployed in a hub VNet. What is typically missing?',
		options: [
			'IP forwarding on the NVA NIC and UDRs to direct traffic',
			'Public IP on the NVA',
			'VPN Gateway BGP configuration',
			'DNS forwarders'
		],
		correct: 0,
		explanation: 'Enable IP forwarding and route traffic to the NVA with UDRs; public IP is not required for east-west.',
		reasoning: {
			correct: 'Azure drops packets not destined for the VM unless IP forwarding is enabled; UDRs steer traffic via the NVA.',
			why_others_wrong: asWhyOthersWrong([
				[1, 'Public IP is not needed for intra-Azure inspection.'],
				[2, 'BGP is not necessary for basic hub-spoke inspection.'],
				[3, 'DNS settings do not affect L3 forwarding.']
			])
		},
		reference: refs.nva
	}));

	// 19) Front Door fast failover
	templates.push((seed, id) => ({
		id,
		topic: 'networking',
		module: 'Load Balancing',
		category: 'Azure Front Door',
		type: 'single',
		question: 'You require the fastest global failover with health probes. Which service should you use?',
		options: [
			'Azure Traffic Manager',
			'Azure Front Door',
			'Cross-region Load Balancer',
			'Application Gateway v2'
		],
		correct: 1,
		explanation: 'Front Door operates at the edge with anycast and fast health-based failover (<30s).',
		reasoning: {
			correct: 'Edge-based anycast plus health probes yield rapid failover to healthy backends globally.',
			why_others_wrong: asWhyOthersWrong([
				[0, 'Traffic Manager is DNS-based and subject to TTL delays.'],
				[2, 'Cross-region LB does not provide global HTTP routing semantics like Front Door.'],
				[3, 'App Gateway is regional only.']
			])
		},
		reference: refs.frontDoor
	}));

	// 20) ExpressRoute Global Reach
	templates.push((seed, id) => ({
		id,
		topic: 'networking',
		module: 'VPN & ExpressRoute',
		category: 'ExpressRoute Global Reach',
		type: 'single',
		question: 'You want on-prem locations connected by different ExpressRoute circuits to communicate via Microsoft backbone. What should you enable?',
		options: [
			'ExpressRoute Premium',
			'ExpressRoute Global Reach',
			'VNet peering between regions',
			'Site-to-Site VPN between circuits'
		],
		correct: 1,
		explanation: 'Global Reach connects ER circuits to enable private on-prem to on-prem connectivity through Microsoft network.',
		reasoning: {
			correct: 'Global Reach stitches ER circuits for branch-to-branch via Microsoft backbone.',
			why_others_wrong: asWhyOthersWrong([
				[0, 'Premium increases limits but does not provide branch-to-branch.'],
				[2, 'VNet peering is for Azure VNets, not on-prem interconnect.'],
				[3, 'VPN uses internet, not the Microsoft backbone.']
			])
		},
		reference: refs.globalReach
	}));

	// 21) NAT Gateway outbound
	templates.push((seed, id) => ({
		id,
		topic: 'networking',
		module: 'Virtual Networks',
		category: 'NAT Gateway',
		type: 'single',
		question: 'Multiple VMs need outbound internet with stable public IP and no inbound exposure. What should you deploy?',
		options: [
			'Public IP on each VM',
			'Azure Load Balancer outbound rules',
			'Azure NAT Gateway associated to the subnet',
			'Azure Firewall'
		],
		correct: 2,
		explanation: 'NAT Gateway provides scalable outbound SNAT with stable public IPs and no inbound.',
		reasoning: {
			correct: 'Designed for outbound-only scenarios, simpler and cheaper than Firewall.',
			why_others_wrong: asWhyOthersWrong([
				[0, 'Public IPs expose VMs to inbound traffic.'],
				[1, 'Outbound rules work but are more complex and not as scalable as NAT GW.'],
				[3, 'Firewall is overkill and more expensive for simple outbound.']
			])
		},
		reference: refs.natGw
	}));

	// 22) Private Link vs Service Endpoints for SQL
	templates.push((seed, id) => ({
		id,
		topic: 'networking',
		module: 'Private Link',
		category: 'Secure Connectivity',
		type: 'single',
		question: 'You must eliminate public access to Azure SQL Database and connect privately from a VNet. What should you use?',
		options: [
			'Service Endpoints for SQL',
			'Private Link (private endpoint)',
			'VNet peering with SQL region',
			'Application Gateway as proxy'
		],
		correct: 1,
		explanation: 'Private Link provides a private endpoint and allows disabling public network access entirely.',
		reasoning: {
			correct: 'Private endpoint places a NIC with private IP in your subnet for SQL Database.',
			why_others_wrong: asWhyOthersWrong([
				[0, 'Service endpoints still require public endpoint on the service.'],
				[2, 'SQL Database is a PaaS service, not a VNet resource to peer.'],
				[3, 'App Gateway is L7 HTTP/S, not for database protocols.']
			])
		},
		reference: refs.privateLinkSql
	}));

	return templates;
}

// ----------------------- AZ-305 GENERATORS -----------------------
function makeAz305Templates() {
	const refs = {
		appSvc: {
			title: 'Azure App Service overview',
			url: 'https://docs.microsoft.com/en-us/azure/app-service/overview'
		},
		frontDoor: {
			title: 'Azure Front Door overview',
			url: 'https://docs.microsoft.com/en-us/azure/frontdoor/front-door-overview'
		},
		policy: {
			title: 'Azure Policy effects',
			url: 'https://docs.microsoft.com/en-us/azure/governance/policy/concepts/effects'
		},
		bcdr: {
			title: 'Azure Backup and Site Recovery overview',
			url: 'https://docs.microsoft.com/en-us/azure/backup/backup-overview'
		},
		data: {
			title: 'Azure data storage guidance',
			url: 'https://docs.microsoft.com/en-us/azure/architecture/guide/technology-choices/data-store-overview'
		},
		security: {
			title: 'Azure Private Link and service endpoints',
			url: 'https://docs.microsoft.com/en-us/azure/private-link/private-link-overview'
		},
		monitor: {
			title: 'Azure Monitor Workbooks',
			url: 'https://docs.microsoft.com/en-us/azure/azure-monitor/visualize/workbooks-overview'
		},
		networking: {
			title: 'Hybrid network connectivity options',
			url: 'https://docs.microsoft.com/en-us/azure/architecture/reference-architectures/hybrid-networking'
		}
	};

	const templates = [];

	// 1) Multi-tier app recommendation
	templates.push((seed, id) => ({
		id,
		topic: 'infrastructure',
		module: 'Compute',
		category: 'Architecture Design',
		type: 'single',
		question: 'Design a multi-tier web application with managed scaling and minimal ops. Which is best?',
		options: [
			'VMs in Availability Sets',
			'App Service for web + Functions for background jobs',
			'AKS for web + ACI for jobs',
			'VM Scale Sets only'
		],
		correct: 1,
		explanation: 'App Service provides PaaS features; Functions provide serverless background processing with consumption pricing.',
		reasoning: {
			correct: 'Managed platform, auto-scale, and lower operational burden suit solution architecture goals.',
			why_others_wrong: asWhyOthersWrong([
				[0, 'VMs require higher ops overhead.'],
				[2, 'AKS adds complexity not required for this scenario.'],
				[3, 'VMSS still requires VM management and lacks PaaS features.']
			])
		},
		reference: refs.appSvc
	}));

	// 2) Global web app fronting
	templates.push((seed, id) => ({
		id,
		topic: 'infrastructure',
		module: 'Networking',
		category: 'Global Routing',
		type: 'single',
		question: 'For a global app requiring fast failover and WAF, which fronting service should you choose?',
		options: [
			'Traffic Manager',
			'Azure Front Door',
			'Application Gateway',
			'Basic Load Balancer'
		],
		correct: 1,
		explanation: 'Front Door offers global anycast, fast failover, and integrated WAF.',
		reasoning: {
			correct: 'Edge presence and health probes reduce failover times and improve global performance.',
			why_others_wrong: asWhyOthersWrong([
				[0, 'DNS-based and slower failover.'],
				[2, 'Regional-only and not global POP-based.'],
				[3, 'Basic LB lacks global routing and WAF features.']
			])
		},
		reference: refs.frontDoor
	}));

	// 3) Policy enforcement
	templates.push((seed, id) => ({
		id,
		topic: 'identity',
		module: 'Governance',
		category: 'Azure Policy',
		type: 'multiple',
		question: 'Which Azure Policy effects are useful to enforce storage security baselines? (Select all that apply)',
		options: [
			'Audit',
			'Deny',
			'DeployIfNotExists',
			'Modify',
			'Append'
		],
		correct: [0, 1, 2, 3, 4],
		explanation: 'All listed effects can participate in governance for storage baseline compliance.',
		reasoning: {
			correct: 'Audit monitors, Deny blocks, DeployIfNotExists configures, Modify remediates, Append adds required settings/tags.',
			why_others_wrong: asWhyOthersWrong([])
		},
		reference: refs.policy
	}));

	// 4) BCDR selection
	templates.push((seed, id) => ({
		id,
		topic: 'business-continuity',
		module: 'Disaster Recovery',
		category: 'DR Strategy',
		type: 'single',
		question: 'For VM workload requiring orchestrated region failover with minimal RPO/RTO, what should you choose?',
		options: [
			'Azure Backup only',
			'Azure Site Recovery',
			'Zone-Redundant Storage',
			'GEO-redundant backups only'
		],
		correct: 1,
		explanation: 'ASR provides replication, runbooks, and orchestrated failover with low RPO/RTO.',
		reasoning: {
			correct: 'ASR replicates VMs and supports planned/unplanned failover and test failover.',
			why_others_wrong: asWhyOthersWrong([
				[0, 'Backup provides recovery, not continuous replication.'],
				[2, 'ZRS is storage redundancy, not a DR orchestration solution.'],
				[3, 'Backups alone do not meet low RPO/RTO or orchestration requirements.']
			])
		},
		reference: refs.bcdr
	}));

	// 5) Data store choice for global, multi-region writes
	templates.push((seed, id) => ({
		id,
		topic: 'data-storage',
		module: 'Databases',
		category: 'Cosmos DB',
		type: 'single',
		question: 'You need globally distributed, multi-region write database with millisecond latency SLA. Which service?',
		options: [
			'Azure SQL Database',
			'Azure Cosmos DB',
			'Azure Database for PostgreSQL Single Server',
			'Azure Table Storage'
		],
		correct: 1,
		explanation: 'Cosmos DB offers turnkey multi-master, multi-region writes with SLAs on latency/availability.',
		reasoning: {
			correct: 'Cosmos DB provides tunable consistency and multi-region, multi-master replication.',
			why_others_wrong: asWhyOthersWrong([
				[0, 'SQL DB supports geo-replication but not multi-master writes.'],
				[2, 'Single Server is regional and not designed for global multi-master.'],
				[3, 'Table Storage lacks global multi-master features and enterprise SLAs.']
			])
		},
		reference: refs.data
	}));

	// 6) Private connectivity to PaaS
	templates.push((seed, id) => ({
		id,
		topic: 'infrastructure',
		module: 'Networking',
		category: 'Security',
		type: 'single',
		question: 'You must block public access to Storage while enabling private access from VNets. Choose:',
		options: [
			'Service endpoints only',
			'Private Link',
			'UDRs to storage public IPs',
			'Application Gateway'
		],
		correct: 1,
		explanation: 'Private Link creates private endpoints and allows disabling public network access.',
		reasoning: {
			correct: 'Private endpoints provide private IPs and isolation for PaaS services.',
			why_others_wrong: asWhyOthersWrong([
				[0, 'Service endpoints still expose a public endpoint.'],
				[2, 'UDRs cannot make public services private.'],
				[3, 'App Gateway is HTTP/S proxy, not for storage endpoints.']
			])
		},
		reference: refs.security
	}));

	// 7) Monitoring with Workbooks
	templates.push((seed, id) => ({
		id,
		topic: 'identity',
		module: 'Monitoring',
		category: 'Visualization',
		type: 'single',
		question: 'You need an interactive dashboard combining metrics and logs with parameters and drill-down. Use:',
		options: [
			'Azure Dashboard basic charts',
			'Azure Monitor Workbooks',
			'Log Analytics legacy dashboards',
			'Application Insights classic charts'
		],
		correct: 1,
		explanation: 'Workbooks provide parameterized, interactive visualizations across data sources.',
		reasoning: {
			correct: 'Workbooks unify metrics/logs with templates, parameters, and drill-down.',
			why_others_wrong: asWhyOthersWrong([
				[0, 'Basic dashboards lack interactivity and parameters.'],
				[2, 'Legacy dashboards are log-only focused.'],
				[3, 'App Insights charts are app-centric and less flexible for multi-service views.']
			])
		},
		reference: refs.monitor
	}));

	// 8) Hybrid connectivity selection
	templates.push((seed, id) => ({
		id,
		topic: 'infrastructure',
		module: 'Networking',
		category: 'Hybrid Networking',
		type: 'single',
		question: 'A steady 5 Gbps private WAN connection to Azure with SLA is required. Which option?',
		options: [
			'Site-to-Site VPN with multiple tunnels',
			'ExpressRoute',
			'Point-to-Site VPN',
			'Azure Virtual WAN user VPN'
		],
		correct: 1,
		explanation: 'ExpressRoute provides private connectivity with higher throughput and SLAs.',
		reasoning: {
			correct: 'ER uses Microsoft backbone and supports higher bandwidth options with enterprise SLAs.',
			why_others_wrong: asWhyOthersWrong([
				[0, 'IPsec VPN over internet cannot guarantee bandwidth or SLA.'],
				[2, 'P2S is for users, not site connectivity.'],
				[3, 'User VPN is for remote users, not WAN-scale connectivity.']
			])
		},
		reference: refs.networking
	}));

	// 9) Storage redundancy and read access in secondary
	templates.push((seed, id) => ({
		id,
		topic: 'data-storage',
		module: 'Storage Accounts',
		category: 'Redundancy',
		type: 'single',
		question: 'Highest durability with ability to read from secondary region during normal operations?',
		options: [
			'LRS',
			'ZRS',
			'GRS',
			'RA-GRS'
		],
		correct: 3,
		explanation: 'RA-GRS provides cross-region replication with read access to secondary.',
		reasoning: {
			correct: 'RA-GRS = GRS + read access for secondary endpoint.',
			why_others_wrong: asWhyOthersWrong([
				[0, 'LRS is single datacenter.'],
				[1, 'ZRS is zonal within a region.'],
				[2, 'GRS lacks read access to secondary in normal operation.']
			])
		},
		reference: refs.data
	}));

	// 10) Message service selection for ordering and sessions
	templates.push((seed, id) => ({
		id,
		topic: 'data-storage',
		module: 'Data Integration',
		category: 'Messaging',
		type: 'single',
		question: 'You require FIFO ordering and sessions for transactional messages. Choose:',
		options: [
			'Event Hubs',
			'Service Bus',
			'Storage Queues',
			'Event Grid'
		],
		correct: 1,
		explanation: 'Service Bus supports sessions and FIFO semantics for ordered message processing.',
		reasoning: {
			correct: 'Service Bus queues/topics offer sessions, transactions, and dead-lettering with rich semantics.',
			why_others_wrong: asWhyOthersWrong([
				[0, 'Event Hubs is a big data streaming ingestion service.'],
				[2, 'Storage Queues lack FIFO and sessions.'],
				[3, 'Event Grid is for push-based event routing, not queueing.']
			])
		},
		reference: refs.data
	}));

	return templates;
}

// ----------------------- AI-900 GENERATORS -----------------------
function makeAi900Templates() {
	const refs = {
		mlBasics: {
			title: 'Introduction to machine learning - Azure Machine Learning',
			url: 'https://docs.microsoft.com/en-us/azure/machine-learning/concept-ml-pipelines'
		},
		aiServices: {
			title: 'Azure Cognitive Services overview',
			url: 'https://docs.microsoft.com/en-us/azure/cognitive-services/welcome'
		},
		respAI: {
			title: 'Microsoft Responsible AI principles',
			url: 'https://learn.microsoft.com/azure/ai-responsible-ai/'
		},
		speech: {
			title: 'Speech service overview',
			url: 'https://docs.microsoft.com/en-us/azure/cognitive-services/speech-service/overview'
		},
		language: {
			title: 'Language service (Text Analytics, Question Answering)',
			url: 'https://learn.microsoft.com/azure/cognitive-services/language-service/'
		},
		vision: {
			title: 'Computer Vision service',
			url: 'https://docs.microsoft.com/en-us/azure/cognitive-services/computer-vision/overview'
		}
	};

	const templates = [];

	// 1) Regression vs classification
	templates.push((seed, id) => ({
		id,
		topic: 'ai-workloads',
		module: 'AI Concepts',
		category: 'ML Types',
		type: 'single',
		question: 'Which learning type predicts a continuous numeric value?',
		options: ['Classification', 'Regression', 'Clustering', 'Reinforcement learning'],
		correct: 1,
		explanation: 'Regression predicts continuous values (e.g., price, temperature).',
		reasoning: {
			correct: 'Supervised regression models learn a mapping from features to a continuous target.',
			why_others_wrong: asWhyOthersWrong([
				[0, 'Classification predicts discrete classes.'],
				[2, 'Clustering groups unlabeled data.'],
				[3, 'Reinforcement optimizes actions via rewards over time.']
			])
		},
		reference: refs.mlBasics
	}));

	// 2) Computer Vision service capability
	templates.push((seed, id) => ({
		id,
		topic: 'computer-vision',
		module: 'Computer Vision',
		category: 'Capabilities',
		type: 'single',
		question: 'Which service extracts printed and handwritten text from images?',
		options: ['Custom Vision', 'Computer Vision Read API', 'Form Recognizer Layout API', 'Face API'],
		correct: 1,
		explanation: 'The Read API performs OCR on images and documents.',
		reasoning: {
			correct: 'Computer Vision Read is optimized for high-quality OCR of printed and handwritten text.',
			why_others_wrong: asWhyOthersWrong([
				[0, 'Custom Vision trains image classifiers/detectors, not OCR.'],
				[2, 'Form Recognizer targets structured document extraction beyond raw OCR.'],
				[3, 'Face API detects and analyzes faces, not text.']
			])
		},
		reference: refs.vision
	}));

	// 3) Language service selection
	templates.push((seed, id) => ({
		id,
		topic: 'nlp',
		module: 'Text Analytics',
		category: 'Capabilities',
		type: 'single',
		question: 'You need sentiment analysis and key phrase extraction on customer reviews. Which service?',
		options: ['Language service - Text Analytics', 'Custom Vision', 'Speech service', 'Computer Vision'],
		correct: 0,
		explanation: 'Text Analytics provides sentiment, key phrases, language detection, and more.',
		reasoning: {
			correct: 'Text Analytics is designed for NLP on unstructured text.',
			why_others_wrong: asWhyOthersWrong([
				[1, 'Custom Vision is for images.'],
				[2, 'Speech service is for audio processing.'],
				[3, 'Computer Vision is for images/video, not text NLP.']
			])
		},
		reference: refs.language
	}));

	// 4) Responsible AI
	templates.push((seed, id) => ({
		id,
		topic: 'ai-workloads',
		module: 'Responsible AI',
		category: 'Principles',
		type: 'multiple',
		question: 'Which are Microsoft Responsible AI principles? (Select all that apply)',
		options: ['Fairness', 'Reliability and safety', 'Privacy and security', 'Inclusiveness', 'Transparency and accountability'],
		correct: [0, 1, 2, 3, 4],
		explanation: 'All listed are core Responsible AI principles.',
		reasoning: {
			correct: 'These principles guide development and deployment of AI systems at Microsoft.',
			why_others_wrong: asWhyOthersWrong([])
		},
		reference: refs.respAI
	}));

	// 5) Speech service selection
	templates.push((seed, id) => ({
		id,
		topic: 'nlp',
		module: 'Speech Services',
		category: 'Capabilities',
		type: 'single',
		question: 'Convert audio recordings of calls into text with speaker diarization. Which service?',
		options: ['Speech to Text', 'Language service', 'Custom Vision', 'Form Recognizer'],
		correct: 0,
		explanation: 'Speech to Text transcribes audio and supports speaker diarization.',
		reasoning: {
			correct: 'Speech service provides robust ASR (automatic speech recognition) with diarization options.',
			why_others_wrong: asWhyOthersWrong([
				[1, 'Language service works on text, not raw audio.'],
				[2, 'Custom Vision is for images.'],
				[3, 'Form Recognizer processes documents, not speech.']
			])
		},
		reference: refs.speech
	}));

	// 6) Automated ML capability
	templates.push((seed, id) => ({
		id,
		topic: 'machine-learning',
		module: 'Automated ML',
		category: 'Capabilities',
		type: 'single',
		question: 'Which capability is provided by Azure Automated ML?',
		options: ['Automatic model selection and hyperparameter tuning', 'End-to-end data labeling', 'Realtime speech translation', 'Image segmentation prebuilt models only'],
		correct: 0,
		explanation: 'AutoML explores algorithms and tunes hyperparameters to find performant models.',
		reasoning: {
			correct: 'AutoML automates model/feature exploration for tabular, text, and vision scenarios.',
			why_others_wrong: asWhyOthersWrong([
				[1, 'Data labeling is separate (ML assisted labeling), not AutoML core.'],
				[2, 'Realtime speech translation belongs to Speech service.'],
				[3, 'AutoML can also train custom models beyond prebuilt.']
			])
		},
		reference: refs.mlBasics
	}));

	// 7) Custom Vision vs Computer Vision
	templates.push((seed, id) => ({
		id,
		topic: 'computer-vision',
		module: 'Custom Vision',
		category: 'Service Selection',
		type: 'single',
		question: 'You need a classifier for domain-specific product images with your own labels. Which service?',
		options: ['Computer Vision', 'Custom Vision', 'Form Recognizer', 'Face API'],
		correct: 1,
		explanation: 'Custom Vision allows training a model with your labeled images for classification/detection.',
		reasoning: {
			correct: 'Custom Vision supports custom labeling and training for tailored scenarios.',
			why_others_wrong: asWhyOthersWrong([
				[0, 'Computer Vision offers prebuilt capabilities, not custom training of your labels.'],
				[2, 'Form Recognizer is for documents.'],
				[3, 'Face API detects/analyzes faces, not general products.']
			])
		},
		reference: refs.aiServices
	}));

	// 8) Question Answering selection
	templates.push((seed, id) => ({
		id,
		topic: 'nlp',
		module: 'Language Understanding',
		category: 'Question Answering',
		type: 'single',
		question: 'Create a bot that answers FAQs from website content. Which capability?',
		options: ['Language service - Question Answering', 'Text Analytics - Sentiment', 'Speech - Text to Speech', 'Computer Vision - OCR'],
		correct: 0,
		explanation: 'Question Answering builds knowledge bases from documents/web content to power bots.',
		reasoning: {
			correct: 'It extracts Q&A pairs and supports multi-turn and chitchat features for bots.',
			why_others_wrong: asWhyOthersWrong([
				[1, 'Sentiment does not answer questions.'],
				[2, 'TTS converts text to speech, not answer selection.'],
				[3, 'OCR extracts text from images, unrelated to FAQs.']
			])
		},
		reference: refs.language
	}));

	// 9) Supervised vs unsupervised
	templates.push((seed, id) => ({
		id,
		topic: 'machine-learning',
		module: 'Azure Machine Learning',
		category: 'ML Paradigms',
		type: 'single',
		question: 'Grouping customers by purchasing behavior without labels is an example of:',
		options: ['Supervised learning', 'Unsupervised learning', 'Reinforcement learning', 'Semi-supervised learning'],
		correct: 1,
		explanation: 'Clustering unlabeled data is an unsupervised task.',
		reasoning: {
			correct: 'Unsupervised learning discovers structure without labeled outcomes.',
			why_others_wrong: asWhyOthersWrong([
				[0, 'Supervised needs labeled outputs.'],
				[2, 'Reinforcement optimizes sequential decisions via rewards.'],
				[3, 'Semi-supervised uses a mix of labeled and unlabeled data, not pure clustering.']
			])
		},
		reference: refs.mlBasics
	}));

	// 10) Data drift monitoring concept
	templates.push((seed, id) => ({
		id,
		topic: 'machine-learning',
		module: 'Azure Machine Learning',
		category: 'Monitoring',
		type: 'single',
		question: 'Detecting changes in feature distributions between training and production is called:',
		options: ['Model overfitting', 'Data drift', 'Hyperparameter tuning', 'Cross-validation'],
		correct: 1,
		explanation: 'Data drift monitoring identifies changes in data that may degrade model performance.',
		reasoning: {
			correct: 'Monitoring drift helps trigger retraining or investigation when production data shifts.',
			why_others_wrong: asWhyOthersWrong([
				[0, 'Overfitting is a training phenomenon of poor generalization.'],
				[2, 'Hyperparameter tuning is part of training.'],
				[3, 'Cross-validation is an evaluation technique.']
			])
		},
		reference: refs.mlBasics
	}));

	return templates;
}

function buildQuestionFromTemplate(templ, seed, id) {
	const q = templ(seed, id);
	// Validate minimal schema
	if (!q || typeof q !== 'object') throw new Error('Template returned invalid question');
	if (typeof q.id !== 'number') q.id = id;
	if (!q.options || !Array.isArray(q.options) || q.options.length < 2) {
		throw new Error('Question options missing or too few');
	}
	if (q.type === 'multiple') {
		if (!Array.isArray(q.correct)) throw new Error('Multiple choice requires array of indices');
	} else {
		if (typeof q.correct !== 'number') throw new Error('Single choice requires numeric correct index');
	}
	return q;
}

function topUpExam(exam, templates, seedOffset) {
	const needed = Math.max(0, TARGET_PER_EXAM - (exam.questions?.length || 0));
	if (needed === 0) return 0;
	const maxId = getMaxId(exam.questions || []);
	const newQs = [];
	for (let i = 0; i < needed; i++) {
		const templ = templates[i % templates.length];
		const id = maxId + 1 + i;
		const q = buildQuestionFromTemplate(templ, seedOffset + i, id);
		newQs.push(q);
	}
	exam.questions = (exam.questions || []).concat(newQs);
	exam.totalQuestions = TARGET_PER_EXAM;
	return newQs.length;
}

function main() {
	const dataPath = path.join(__dirname, '..', 'public', 'data', 'exams.json');
	if (!fs.existsSync(dataPath)) {
		throw new Error('Cannot find exams.json at ' + dataPath);
	}
	const db = readJson(dataPath);
	if (!db.exams) throw new Error('Invalid JSON: missing exams object');

	const az104 = db.exams['az-104'];
	const az305 = db.exams['az-305'];
	const ai900 = db.exams['ai-900'];

	if (!az104 || !az305 || !ai900) throw new Error('One or more expected exams (az-104, az-305, ai-900) not found');

	const az104Templates = makeAz104Templates();
	const az305Templates = makeAz305Templates();
	const ai900Templates = makeAi900Templates();

	const added104 = topUpExam(az104, az104Templates, 1000);
	const added305 = topUpExam(az305, az305Templates, 2000);
	const added900 = topUpExam(ai900, ai900Templates, 3000);

	// Update totalQuestions to exact count present (ensure >= TARGET_PER_EXAM)
	az104.totalQuestions = Math.max(az104.totalQuestions || 0, az104.questions.length);
	az305.totalQuestions = Math.max(az305.totalQuestions || 0, az305.questions.length);
	ai900.totalQuestions = Math.max(ai900.totalQuestions || 0, ai900.questions.length);

	writeJson(dataPath, db);
	console.log('Added questions:', { az104: added104, az305: added305, ai900: added900 });
	console.log('Final counts:', {
		az104: az104.questions.length,
		az305: az305.questions.length,
		ai900: ai900.questions.length
	});
}

if (require.main === module) {
	try {
		main();
	} catch (err) {
		console.error(err);
		process.exit(1);
	}
}