# Lamport Logical Clock Simulator & Event Ordering Demonstration

> **Subject:** Distributed Computing / Distributed Systems  
> **Topic:** Develop a Lamport Logical Clock simulator for multiple distributed processes and demonstrate the ordering of events  
> **Theoretical Foundation:** Leslie Lamport (1978), *"Time, Clocks, and the Ordering of Events in a Distributed System"*, Communications of the ACM (Turing Award-winning paper).

---

## 1. Project Abstract & Objectives

In distributed systems, processes run concurrently on physically separate machines with no shared physical clock and no shared memory. Because physical clocks drift and network delays are unpredictable, determining the temporal order of events across distributed nodes is impossible using wall-clock time alone.

This mini project implements a full **Lamport Logical Clock Simulator** supporting:
1. **Multiple Distributed Processes** ($P_1, P_2, \dots, P_N$) executing internal computations, sending messages, and receiving messages.
2. **Implementation Rules (IR1, IR2, IR3)** strictly following Leslie Lamport's 1978 formulation.
3. **Space-Time Diagram (Timeline Ladder)**: Interactive visual rendering showing process timelines, event timestamps $L(e)$, and directed message curves.
4. **Demonstration of Event Ordering**:
   - **Partial Ordering / Happens-Before ($\to$)**: Detects whether $a \to b$, $b \to a$, or $a \parallel b$ (concurrent events).
   - **Total Ordering ($\Rightarrow$)**: Resolves concurrent events using unique Process IDs ($PID_i < PID_j$) to establish an unambiguous global sequence.
5. **Interactive Causal Path Inspector**: Graph-based path reconstruction highlighting the exact causal propagation chain between any two events.
6. **Theoretical Property Verification**: Automated validator ensuring the fundamental Clock Condition ($a \to b \implies C(a) < C(b)$) holds across all executions and demonstrating why $C(a) < C(b) \centernot\implies a \to b$.

---

## 2. Theoretical Foundations

### 2.1 The "Happens-Before" Relation ($\to$)
The happens-before relation $\to$ defines a strict partial ordering on the set of all events in a distributed system:
1. **Local Sequence Rule**: If event $a$ and event $b$ occur within the same process $P_i$, and $a$ occurs before $b$, then $a \to b$.
2. **Message Passing Rule**: If event $a$ is the sending of a message by process $P_i$, and event $b$ is the receipt of that same message by process $P_j$, then $a \to b$.
3. **Transitivity Rule**: If $a \to b$ and $b \to c$, then $a \to c$.

If neither $a \to b$ nor $b \to a$, then events $a$ and $b$ are said to be **concurrent** ($a \parallel b$).

### 2.2 Lamport's Clock Implementation Rules

Each process $P_i$ maintains an integer counter $L_i$, initialized to $0$:

- **Implementation Rule 1 (IR1 - Internal & Send Events):**  
  Prior to executing an internal computation or sending a message, process $P_i$ increments its local clock:
  $$L_i \leftarrow L_i + 1$$
  The event $e$ is tagged with timestamp $C(e) = L_i$.

- **Implementation Rule 2 (IR2 - Message Tagging):**  
  When process $P_i$ sends message $m$ to process $P_j$, it attaches its current clock value $ts = L_i$ into the message packet:
  $$(m, ts)$$

- **Implementation Rule 3 (IR3 - Message Receipt & Clock Synchronization):**  
  Upon receiving message $(m, ts)$, process $P_j$ advances its local clock past both its own clock and the sender's timestamp before registering the receive event:
  $$L_j \leftarrow \max(L_j, ts) + 1$$
  The receive event $e_{\text{recv}}$ is tagged with $C(e_{\text{recv}}) = L_j$.

### 2.3 Clock Condition
The implementation guarantees Lamport's **Clock Condition**:
$$\forall a, b: \quad a \to b \implies C(a) < C(b)$$

### 2.4 Lamport's Total Ordering ($\Rightarrow$)
While the happens-before relation is a partial order (leaving concurrent events unranked), distributed applications (e.g., distributed mutual exclusion, state machine replication) require a single, consistent **Total Order**.

Lamport defines total order $\Rightarrow$ by combining the logical clock timestamp with a predetermined tie-breaker based on unique Process IDs:
$$a \Rightarrow b \iff (C(a) < C(b)) \lor \Big(C(a) = C(b) \land PID(a) < PID(b)\Big)$$

This total ordering has the property that if $a \to b$, then $a \Rightarrow b$.

### 2.5 Key Insight & Limitation of Lamport Clocks
- **Guaranteed:** $a \to b \implies C(a) < C(b)$
- **NOT Guaranteed (Converse fails):** $C(a) < C(b) \centernot\implies a \to b$  
  Two events $a$ and $b$ may be concurrent ($a \parallel b$), yet one happens to have a smaller Lamport timestamp than the other. This theoretical limitation motivated the later invention of **Vector Clocks** (Fidge & Mattern, 1988), which satisfy $a \to b \iff V(a) < V(b)$. This project explicitly highlights and proves this property in its inspector panel.

---

## 3. Project Architecture

The project is structured in a modular, zero-dependency architecture that runs both in the browser (GUI) and in Node.js (CLI & automated test suite):

```
dc/
├── package.json            # Project metadata and run scripts
├── server.js               # Lightweight zero-dependency HTTP static server
├── cli.js                  # Terminal simulator with colored tables & ASCII timeline
├── test.js                 # Automated unit tests and invariant verifier
├── src/
│   ├── lamport.js          # Core Lamport Engine, causal graph BFS, & total ordering
│   └── scenarios.js        # 5 Predefined textbook & edge-case scenarios
├── public/
│   ├── index.html          # Interactive Web Dashboard
│   ├── style.css           # Modern dark UI, animations, and responsive styles
│   └── app.js              # GUI Controller & SVG Space-Time diagram renderer
└── README.md               # Project documentation and Viva Voce guide
```

### Core Classes (`src/lamport.js`):
- `DistributedProcess`: Maintains process ID, process name, local integer clock $L$, and local event history.
- `DistributedEvent`: Represents internal, send, or receive events with clock timestamp $L(e)$, process ID, and direct causal predecessors.
- `DistributedMessage`: Represents network packets with sender PID, receiver PID, attached timestamp $ts$, payload, and in-flight/delivered status.
- `LamportSimulator`: Coordinates multi-process execution, message queues, causal graph traversal (BFS path finding), happens-before analysis, and total ordering generation.

---

## 4. How to Run the Project

### Option A: Interactive Web Dashboard (Recommended)

#### Method 1: Local HTTP Server
Run the local server using Node.js:
```powershell
npm start
# or: node server.js
```
Then open your web browser and navigate to:
```
http://localhost:3000
```

#### Method 2: Direct File Open
You can also directly double-click or open `public/index.html` in Google Chrome, Microsoft Edge, or Mozilla Firefox without running any server:
```powershell
# Open directly in Windows default browser:
Start-Process "public\index.html"
```

### Option B: Command Line Interface (CLI)
You can run the terminal simulator directly:
```powershell
# Run the default scenario (Lamport 1978 Classic Paper):
npm run cli
# or: node cli.js 1

# Run other preset scenarios (1 to 5):
node cli.js 2    # Concurrent Events & PID Tie-Breaking
node cli.js 3    # Dramatic Clock Leap (Fast vs Slow Process)
node cli.js 4    # Distributed Token Ring / Cascading Chain
node cli.js 5    # Interleaved Out-of-Order Message Delivery
```

### Option C: Automated Verification Test Suite
Run the test suite verifying all theoretical invariants and clock implementation rules:
```powershell
npm test
# or: node test.js
```

---

## 5. Preset Scenarios Included

| # | Scenario Name | Highlights & Distributed Computing Principle |
|---|---|---|
| **1** | **Lamport (1978) Classic Paper Example** | Canonical 3-process execution demonstrating clock increments, message synchronization, receive adjustments, and total ordering. |
| **2** | **Concurrent Events & PID Tie-Breaking** | Multiple simultaneous internal events across processes resulting in identical logical timestamps ($L=1, L=2$). Shows how PID tie-breaking ($P_1 < P_2 < P_3$) orders them. |
| **3** | **Dramatic Clock Leap (Fast vs Slow)** | Process $P_1$ rapidly advances to $L=5$ locally. $P_2$ is idle at $L=0$. When $P_1$ sends a message to $P_2$, $P_2$'s clock leaps from $0$ to $\max(0, 5) + 1 = 6$. |
| **4** | **Distributed Token Ring / Cascading Chain** | Token message passed along $P_1 \to P_2 \to P_3 \to P_4 \to P_1$, demonstrating monotonic clock compounding across a distributed cycle. |
| **5** | **Interleaved Out-of-Order Message Delivery** | Asymmetric network delays where messages arrive in interleaved order, demonstrating how Lamport clocks preserve causality despite variable transit times. |

---

## 6. Key Features of the Interactive Dashboard

1. **SVG Space-Time Diagram (Process Timeline Ladder):**
   - Horizontal process rails with real-time logical clock readouts $[L=k]$.
   - Color-coded event nodes:
     - 🔵 **Cyan**: Internal Events (local computation)
     - 🌸 **Fuchsia**: Send Events
     - 🟢 **Emerald Green**: Receive Events
   - Directed bezier message curves showing payload and attached timestamp `(m, ts=L)`.
   - Hover tooltips showing event metadata, causal predecessors, and descriptions.
   - Click-to-select: Click any two events to inspect their causality directly.

2. **Interactive Controls:**
   - **Trigger Local Event**: Select process and execute internal event ($L_i \leftarrow L_i + 1$).
   - **Send Message**: Select sender and receiver, enter payload, and choose between immediate delivery or in-flight network transit.
   - **In-Flight Network Queue**: Step-by-step "Deliver Next" button to observe clock adjustments one message at a time.
   - **Add / Remove Process**: Dynamically scale between 2 and 6 distributed processes.

3. **Happens-Before ($\to$) vs Concurrency ($\parallel$) Inspector:**
   - Select any Event A and Event B.
   - Automatically determines whether $A \to B$, $B \to A$, or $A \parallel B$.
   - **Path Highlighting**: Visually illuminates the directed causal path on the diagram in glowing amber.
   - **Educational Limitation Callout**: Automatically demonstrates cases where $C(A) < C(B)$ yet $A \parallel B$, explaining why Vector Clocks are needed.

4. **Lamport Total Order Table ($\Rightarrow$):**
   - Displays all events sorted by $L(e_1) < L(e_2)$ or $(L(e_1) = L(e_2) \land PID(e_1) < PID(e_2))$.
   - Clearly flags PID tie-breaking justifications.

5. **Full Causal Relationship Matrix:**
   - $N \times N$ matrix displaying pairwise relations ($\to, \leftarrow, \parallel, =$) for all events.

6. **Export Tools:**
   - Export full simulation state as JSON.
   - Export the Space-Time Diagram as a standalone SVG image.

---

## 7. Sample CLI Output Walkthrough

```text
========================================================================
   LAMPORT LOGICAL CLOCK SIMULATOR - DISTRIBUTED COMPUTING MINI PROJECT
========================================================================

=== Space-Time Process Timeline Ladder ===
P1   |---(e_1:L1)---(e_2:L2)---(e_6:L3)---(e_9:L8)---> (Current Clock: 8)
     |
P2   |---(e_3:L3)---(e_4:L4)---(e_5:L5)---> (Current Clock: 5)
     |
P3   |---(e_7:L6)---(e_8:L7)---> (Current Clock: 7)
     |

=== Lamport's Total Ordering of Events (-> and Tie-Broken by PID) ===
Sorting Criteria: L(e1) < L(e2) OR (L(e1) == L(e2) AND PID(e1) < PID(e2))

+------+-----+----------+-----------+---------+--------------------------------------------+
| Rank | ID  | Process  | Type      | Clock L | Total Order Justification                  |
+------+-----+----------+-----------+---------+--------------------------------------------+
|    1 | e_1 | P1       | INTERNAL  | L=1     | Clock = 1, Process = P1                    |
|    2 | e_2 | P1       | SEND      | L=2     | Clock = 2, Process = P1 (Clock 1 < 2)      |
|    3 | e_6 | P1       | INTERNAL  | L=3     | Clock = 3, Process = P1 (Clock 2 < 3)      |
|    4 | e_3 | P2       | RECEIVE   | L=3     | Clock = 3, Process = P2 (Tie broken: PID 1 < PID 2) |
|    5 | e_4 | P2       | INTERNAL  | L=4     | Clock = 4, Process = P2 (Clock 3 < 4)      |
|    6 | e_5 | P2       | SEND      | L=5     | Clock = 5, Process = P2 (Clock 4 < 5)      |
|    7 | e_7 | P3       | RECEIVE   | L=6     | Clock = 6, Process = P3 (Clock 5 < 6)      |
|    8 | e_8 | P3       | SEND      | L=7     | Clock = 7, Process = P3 (Clock 6 < 7)      |
|    9 | e_9 | P1       | RECEIVE   | L=8     | Clock = 8, Process = P1 (Clock 7 < 8)      |
+------+-----+----------+-----------+---------+--------------------------------------------+

Total Order Chain:
  e_1(P1,L=1) => e_2(P1,L=2) => e_6(P1,L=3) => e_3(P2,L=3) => e_4(P2,L=4) => e_5(P2,L=5) => e_7(P3,L=6) => e_8(P3,L=7) => e_9(P1,L=8)

=== Lamport Theoretical Clock Condition Invariant Check ===
  Events: 9 | Causally Ordered Pairs: 31 | Concurrent Pairs: 5
  ✔ PASS: For every event pair where a -> b, C(a) < C(b) holds strictly!
```

---

## 8. Viva Voce & Presentation Q&A Guide

### Q1: Why do we need logical clocks in distributed computing instead of physical clocks?
**Answer:** In distributed systems, nodes are spatially separated. Physical clocks (quartz crystals) suffer from clock drift, temperature variations, and network latency jitter. Even protocols like NTP (Network Time Protocol) cannot guarantee zero synchronization error. Therefore, we cannot rely on physical time to determine which event happened first. Lamport logical clocks solve this by tracking *causal relationships* rather than physical time.

### Q2: State the three implementation rules of Lamport's algorithm.
**Answer:**
1. **Rule 1 (IR1):** Before executing an internal or send event at $P_i$, increment local clock: $L_i = L_i + 1$.
2. **Rule 2 (IR2):** When sending message $m$, attach current clock $ts = L_i$ into the message $(m, ts)$.
3. **Rule 3 (IR3):** When receiving message $(m, ts)$ at $P_j$, update local clock: $L_j = \max(L_j, ts) + 1$.

### Q3: What is the "Happens-Before" relation ($\to$)?
**Answer:** Formulated by Leslie Lamport in 1978:
- If $a$ and $b$ are in the same process and $a$ comes before $b$, then $a \to b$.
- If $a$ is the send event and $b$ is the receive event of the same message, then $a \to b$.
- If $a \to b$ and $b \to c$, then $a \to c$ (transitivity).
If neither $a \to b$ nor $b \to a$, then $a$ and $b$ are concurrent ($a \parallel b$).

### Q4: How does Lamport define Total Ordering ($\Rightarrow$) and how are ties broken?
**Answer:** Total ordering extends the partial order by defining:
$$a \Rightarrow b \iff (C(a) < C(b)) \lor (C(a) = C(b) \land PID(a) < PID(b))$$
When two concurrent events have identical logical timestamps ($C(a) = C(b)$), the tie is broken using a unique, globally agreed-upon process identifier (e.g., $P_1 < P_2 < P_3$).

### Q5: Does $C(a) < C(b)$ imply that $a \to b$?
**Answer:** **No.** This is the classic limitation of Lamport clocks. While $a \to b \implies C(a) < C(b)$ is always true, the converse does not hold. Two events can be completely concurrent ($a \parallel b$), yet one may have a smaller timestamp than the other.

### Q6: How do Vector Clocks overcome the limitation of Lamport Clocks?
**Answer:** In Vector Clocks (Fidge & Mattern, 1988), each process maintains an integer vector of size $N$ (number of processes). Vector clocks satisfy the **Strong Clock Condition**:
$$a \to b \iff V(a) < V(b)$$
Thus, by comparing vector timestamps alone, one can conclusively determine whether two events are causally related or concurrent.

---

## 9. References
1. **Lamport, Leslie.** *"Time, Clocks, and the Ordering of Events in a Distributed System."* Communications of the ACM 21.7 (1978): 558-565.
2. **Coulouris, G., Dollimore, J., Kindberg, T., & Blair, G.** *"Distributed Systems: Concepts and Design"*, 5th Edition, Addison-Wesley.
3. **Tanenbaum, A. S., & Van Steen, M.** *"Distributed Systems: Principles and Paradigms"*, 3rd Edition.
4. **Fidge, C. J.** *"Timestamps in message-passing systems that preserve the partial ordering."* Proceedings of the 11th Australian Computer Science Conference (1988).
