# Azure Network Watcher Tools - Comprehensive Guide

## Overview

Azure Network Watcher is a comprehensive suite of network monitoring, diagnostic, and analytics tools that help you monitor, diagnose, and gain insights into your Azure network infrastructure.

```mermaid
graph TB
    A[Azure Network Watcher] --> B[Monitoring Tools]
    A --> C[Diagnostic Tools]
    A --> D[Traffic Analytics]
    A --> E[Logs & Metrics]
    
    B --> B1[Topology]
    B --> B2[Connection Monitor]
    
    C --> C1[IP Flow Verify]
    C --> C2[Next Hop]
    C --> C3[Effective Routes]
    C --> C4[Effective Security Groups]
    C --> C5[Connection Troubleshoot]
    C --> C6[Packet Capture]
    C --> C7[VPN Troubleshoot]
    
    D --> D1[Traffic Analytics]
    D --> D2[NSG Flow Logs]
    
    E --> E1[Network Insights]
    E --> E2[Azure Monitor]
```

---

## 📊 Network Monitoring Tools

### 1. Topology
**Purpose**: Provides a visual representation of your Azure virtual network resources and their relationships.

```mermaid
graph LR
    RG[Resource Group] --> VNet[Virtual Network]
    VNet --> Subnet1[Subnet 1]
    VNet --> Subnet2[Subnet 2]
    Subnet1 --> VM1[Virtual Machine 1]
    Subnet1 --> LB[Load Balancer]
    Subnet2 --> VM2[Virtual Machine 2]
    VM1 --> NSG1[Network Security Group]
    VM2 --> NSG2[Network Security Group]
    VNet --> RT[Route Table]
```

**Key Features**:
- Interactive network diagram
- Resource dependency visualization
- Real-time network state
- Export capabilities

**Use Cases**:
- Understanding network architecture
- Identifying network dependencies
- Network documentation
- Compliance and auditing

### 2. Connection Monitor
**Purpose**: Monitors network connectivity between Azure resources and provides performance metrics.

```mermaid
sequenceDiagram
    participant CM as Connection Monitor
    participant Source as Source VM
    participant Dest as Destination
    participant Alert as Alert System
    
    CM->>Source: Deploy monitoring agent
    Source->>Dest: Send test packets
    Dest->>Source: Return response
    Source->>CM: Report metrics (latency, loss)
    CM->>Alert: Trigger if thresholds exceeded
```

**Metrics Monitored**:
- **Latency**: Round-trip time
- **Packet Loss**: % of lost packets
- **Connectivity**: Success/failure rates
- **Jitter**: Latency variation

**Use Cases**:
- Proactive connectivity monitoring
- Performance baseline establishment
- SLA compliance monitoring
- Hybrid connectivity validation

---

## 🔧 Network Diagnostic Tools

### 3. IP Flow Verify
**Purpose**: Verifies if a packet is allowed or denied to/from a virtual machine based on security rules.

```mermaid
flowchart TD
    A[IP Flow Verify Request] --> B{Check NSG Rules}
    B --> C[Inbound Rules]
    B --> D[Outbound Rules]
    C --> E{Rule Match?}
    D --> F{Rule Match?}
    E -->|Yes| G[Allow/Deny Result]
    E -->|No| H[Check Next Rule]
    F -->|Yes| I[Allow/Deny Result]
    F -->|No| J[Check Next Rule]
    H --> E
    J --> F
    G --> K[Show Specific Rule]
    I --> L[Show Specific Rule]
```

**Input Parameters**:
- Source IP and Port
- Destination IP and Port
- Protocol (TCP/UDP)
- Direction (Inbound/Outbound)

**Output**:
- Access decision (Allow/Deny)
- Specific NSG rule responsible
- Rule priority and action

### 4. Next Hop ⭐ (Related to Your Question)
**Purpose**: Determines the next hop for traffic from a VM to a specific destination.

```mermaid
graph TD
    VM[Virtual Machine] --> RT[Route Table Lookup]
    RT --> UDR{User Defined Route?}
    UDR -->|Yes| NH1[Custom Next Hop]
    UDR -->|No| SR[System Routes]
    SR --> NH2[VNet Local]
    SR --> NH3[Internet Gateway]
    SR --> NH4[Virtual Appliance]
    SR --> NH5[VPN Gateway]
    NH1 --> Result[Next Hop Result]
    NH2 --> Result
    NH3 --> Result
    NH4 --> Result
    NH5 --> Result
```

**Next Hop Types**:
- **Internet**: Traffic goes to internet
- **VirtualAppliance**: Traffic goes through NVA
- **VirtualNetworkGateway**: Traffic goes through VPN/ExpressRoute
- **VnetLocal**: Traffic stays within VNet
- **Null**: Traffic is dropped

### 5. Effective Routes ⭐ (Your Current Tool)
**Purpose**: Shows the complete routing table for a VM's network interface, including all effective routes.

```mermaid
graph TB
    VM[Virtual Machine] --> NIC[Network Interface]
    NIC --> ER[Effective Routes Analysis]
    ER --> SR[System Routes]
    ER --> UDR[User Defined Routes]
    ER --> BGP[BGP Routes]
    
    SR --> SR1[VNet Address Space]
    SR --> SR2[Internet: 0.0.0.0/0]
    SR --> SR3[Azure Services]
    
    UDR --> UDR1[Custom Routes]
    UDR --> UDR2[Route Tables]
    
    BGP --> BGP1[On-premises Routes]
    BGP --> BGP2[ExpressRoute Routes]
    
    ER --> Priority[Route Priority Resolution]
    Priority --> Final[Final Routing Decision]
```

**Route Sources (Priority Order)**:
1. **User Defined Routes** (Highest priority)
2. **BGP Routes**
3. **System Routes** (Lowest priority)

**Information Provided**:
- Route source and destination
- Next hop type and IP
- Route state (Active/Invalid)
- Administrative distance

### 6. Effective Security Groups
**Purpose**: Shows all NSG rules that apply to a network interface.

```mermaid
graph TD
    NIC[Network Interface] --> ENSG[Effective Security Groups]
    ENSG --> NNIC[NIC-level NSG]
    ENSG --> NSUB[Subnet-level NSG]
    
    NNIC --> NNIC_IN[Inbound Rules]
    NNIC --> NNIC_OUT[Outbound Rules]
    NSUB --> NSUB_IN[Inbound Rules]
    NSUB --> NSUB_OUT[Outbound Rules]
    
    NNIC_IN --> MERGE[Rule Consolidation]
    NNIC_OUT --> MERGE
    NSUB_IN --> MERGE
    NSUB_OUT --> MERGE
    
    MERGE --> FINAL[Final Security Policy]
```

**Rule Processing**:
- Rules processed by priority (lower number = higher priority)
- First matching rule determines action
- Combines subnet and NIC-level NSG rules

### 7. Connection Troubleshoot
**Purpose**: Tests connectivity between two endpoints and diagnoses issues.

```mermaid
sequenceDiagram
    participant User
    participant CT as Connection Troubleshoot
    participant Source as Source VM
    participant Path as Network Path
    participant Dest as Destination
    
    User->>CT: Initiate test
    CT->>Source: Install agent (if needed)
    Source->>Path: Test connectivity
    Path->>Dest: Attempt connection
    Dest-->>Path: Response (or timeout)
    Path-->>Source: Result
    Source->>CT: Report findings
    CT->>User: Detailed analysis
```

**Test Results Include**:
- Connectivity status
- Latency measurements
- Hop-by-hop analysis
- Security rule evaluation
- Routing decisions

### 8. Packet Capture
**Purpose**: Captures network packets for detailed analysis.

```mermaid
graph LR
    A[VM Network Traffic] --> B[Packet Capture Agent]
    B --> C[Filter Criteria]
    C --> D[Captured Packets]
    D --> E[Storage Account]
    D --> F[Local File]
    E --> G[Analysis Tools]
    F --> G
    G --> H[Wireshark]
    G --> I[Network Monitor]
    G --> J[tcpdump]
```

**Capture Options**:
- **Duration**: Time-based or size-based limits
- **Filters**: Protocol, IP, port-based filtering
- **Storage**: Azure Storage or local file
- **Format**: .cap files compatible with Wireshark

### 9. VPN Troubleshoot
**Purpose**: Diagnoses VPN gateway and connection issues.

```mermaid
graph TD
    VPN[VPN Gateway] --> DIAG[VPN Diagnostics]
    DIAG --> CONN[Connection Status]
    DIAG --> PERF[Performance Metrics]
    DIAG --> LOGS[Diagnostic Logs]
    DIAG --> CONFIG[Configuration Issues]
    
    CONN --> CONN1[Site-to-Site Status]
    CONN --> CONN2[Point-to-Site Status]
    CONN --> CONN3[VNet-to-VNet Status]
    
    PERF --> PERF1[Throughput]
    PERF --> PERF2[Latency]
    PERF --> PERF3[Packet Loss]
```

---

## 📈 Traffic Analytics & Logging

### 10. NSG Flow Logs
**Purpose**: Logs information about IP traffic flowing through Network Security Groups.

```mermaid
graph LR
    NSG[Network Security Group] --> FL[Flow Logs]
    FL --> SA[Storage Account]
    SA --> TA[Traffic Analytics]
    TA --> AI[Azure Monitor]
    AI --> DASH[Dashboards]
    AI --> ALERT[Alerts]
    
    FL --> JSON[JSON Format]
    JSON --> FIELDS[Log Fields]
    FIELDS --> FIELDS1[Source/Dest IP]
    FIELDS --> FIELDS2[Ports]
    FIELDS --> FIELDS3[Protocol]
    FIELDS --> FIELDS4[Action Allow/Deny]
```

### 11. Traffic Analytics
**Purpose**: Provides insights into network traffic patterns and security threats.

```mermaid
graph TB
    FL[Flow Logs] --> TA[Traffic Analytics]
    TA --> VIZ[Visualizations]
    TA --> INS[Security Insights]
    TA --> GEO[Geo Mapping]
    
    VIZ --> VIZ1[Top Talkers]
    VIZ --> VIZ2[Traffic Trends]
    VIZ --> VIZ3[Protocol Distribution]
    
    INS --> INS1[Malicious IPs]
    INS --> INS2[Anomaly Detection]
    INS --> INS3[Threat Intelligence]
    
    GEO --> GEO1[Traffic Origins]
    GEO --> GEO2[Geographic Flow]
```

---

## 🛠️ Tool Selection Guide

### For Your Specific Scenario (VM Connectivity Issues)

```mermaid
flowchart TD
    START[VM Connectivity Issue] --> Q1{Know the destination?}
    Q1 -->|Yes| Q2{Need routing path?}
    Q1 -->|No| TOPO[Use Topology]
    Q2 -->|Yes| ROUTES[Use Effective Routes]
    Q2 -->|No| Q3{Security issue suspected?}
    Q3 -->|Yes| IPFLOW[Use IP Flow Verify]
    Q3 -->|No| Q4{Need detailed testing?}
    Q4 -->|Yes| CONN[Use Connection Troubleshoot]
    Q4 -->|No| NEXTHOP[Use Next Hop]
    
    ROUTES --> ANALYZE1[Analyze routing table]
    NEXTHOP --> ANALYZE2[Check next hop destination]
    IPFLOW --> ANALYZE3[Verify security rules]
    CONN --> ANALYZE4[Comprehensive connectivity test]
    TOPO --> ANALYZE5[Understand network layout]
```

### Comparison Table

| Tool | Purpose | When to Use | Output |
|------|---------|-------------|---------|
| **Effective Routes** ⭐ | Show complete routing table | Routing conflicts, understand traffic paths | Complete route table with priorities |
| **Next Hop** | Show next destination for traffic | Quick routing verification | Next hop type and IP |
| **IP Flow Verify** | Test security rule impact | Security troubleshooting | Allow/Deny with specific rule |
| **Connection Troubleshoot** | End-to-end connectivity test | Comprehensive issue diagnosis | Detailed connectivity analysis |
| **Packet Capture** | Detailed traffic analysis | Deep packet-level troubleshooting | Network packet files |

---

## 💡 Best Practices for Your Scenario

### 1. Systematic Troubleshooting Approach

```mermaid
graph TD
    ISSUE[Connectivity Issue] --> STEP1[1. Check Topology]
    STEP1 --> STEP2[2. Verify Effective Routes]
    STEP2 --> STEP3[3. Test IP Flow Verify]
    STEP3 --> STEP4[4. Use Connection Troubleshoot]
    STEP4 --> STEP5[5. Capture Packets if needed]
    STEP5 --> RESOLUTION[Issue Resolution]
```

### 2. Effective Routes Analysis (Your Current Tool)

**What you should look for**:
- **Route conflicts**: Multiple routes to same destination
- **Invalid routes**: Routes marked as "Invalid"
- **Unexpected next hops**: Traffic going through wrong gateway
- **Missing routes**: No route to intended destination

**Common Issues Found**:
- User-defined routes overriding system routes
- Route propagation problems
- Overlapping address spaces
- Incorrect next hop configurations

### 3. Related Tools for Complete Analysis

After using **Effective Routes**, consider:
1. **Next Hop** - Verify specific destination routing
2. **IP Flow Verify** - Check if security rules allow traffic
3. **Connection Troubleshoot** - End-to-end validation
4. **NSG Flow Logs** - Historical traffic analysis

---

## 🎯 Quick Reference

### When to Use Each Tool

| Scenario | Recommended Tool | Why |
|----------|------------------|-----|
| "Traffic not reaching destination" | Effective Routes | See complete routing table |
| "Is traffic allowed by security rules?" | IP Flow Verify | Test specific security rules |
| "Where does this traffic go next?" | Next Hop | Quick routing verification |
| "Connection intermittently fails" | Connection Monitor | Ongoing monitoring |
| "Need detailed packet analysis" | Packet Capture | Deep packet inspection |
| "VPN connection issues" | VPN Troubleshoot | VPN-specific diagnostics |

### Pro Tips
- Always start with **Topology** to understand the network layout
- Use **Effective Routes** (like you're doing) for routing issues
- Combine multiple tools for comprehensive analysis
- Enable **NSG Flow Logs** for historical troubleshooting data

---

## 🔍 Answer to Your Specific Question

Based on your screenshot, you correctly chose **Azure Network Watcher - Effective Routes** for troubleshooting VM connectivity to an on-premises server.

### Why This Was Correct:
✅ **Shows complete routing table** for the VM's network interface  
✅ **Identifies routing conflicts** between system and user-defined routes  
✅ **Displays next hop information** for traffic to on-premises networks  
✅ **Helps detect route propagation issues** from VPN/ExpressRoute  

### Why Other Options Were Wrong:
❌ **Connection Troubleshoot**: Tests end-to-end connectivity but doesn't show routing details  
❌ **IP Flow Verify**: Tests NSG rules, not routing paths  
❌ **Next Hop**: Shows single destination routing but not the complete picture  

The **Effective Routes** tool gives you the comprehensive view needed to identify routing problems, making it the best choice for your scenario!