// Who answers on each surface, and what they offer before you ask anything.
//
// The panel is authored per page rather than once for the app. A single fixed
// set of chips would ask the same four questions on Yarn that it asks on
// Quality, and three of them would be about somebody else's job — which is
// exactly the tell that an assistant has been bolted on rather than built in.
//
// The agent named in the header is the one that owns the queue on that page:
// Sawyer schedules, Rowan runs the shift, Sable sizes lots, Wren judges
// quality. The cross-cutting surfaces get Sage: she reads across all four for
// an executive on the roll-ups, and owns calibration — how the plants compare,
// and where each dial is set — on Performance and Thresholds. Those are
// cross-agent questions, so Sage answers them rather than a generic assistant.

export interface ChatPrompt {
  /** The chip's label — phrased as the question a person would actually ask. */
  label: string;
  /** What the agent says back. Two short lines beat one long one. */
  answer: { note: string; rows: ReadonlyArray<{ label: string; text: string }> };
}

export interface PageAgent {
  /** The agent's name, shown in the header. */
  agent: string;
  /** What it is accountable for — the line under the name. */
  role: string;
  /** The empty state's opening line, in the agent's voice. */
  intro: string;
  prompts: ReadonlyArray<ChatPrompt>;
}

/**
 * Sage reads the plant the way an executive does — across every agent, in
 * money and commitments rather than in runs and lots.
 */
const SAGE: PageAgent = {
  agent: "Sage",
  role: "Across every agent",
  intro: "I read across Sawyer, Rowan, Sable and Wren. What do you want to know?",
  prompts: [
    {
      label: "What is costing us the most today?",
      answer: {
        note: "Backing 2. It is the constraint, and everything downstream waits on it.",
        rows: [
          { label: "Rate", text: "369 yd/hr against a 420 standard — 12% under." },
          { label: "Lost", text: "612 lin yd this shift, the largest gap on the floor." },
          { label: "Cause", text: "204 minutes down on BAK-01, mostly material-out." },
        ],
      },
    },
    {
      label: "Where is the engine saving money?",
      answer: {
        note: "$47k this week, and it is mostly sequencing rather than anything dramatic.",
        rows: [
          { label: "Changeovers", text: "Campaigning light → dark avoided full purges." },
          { label: "Yarn", text: "Lots right-sized to their orders instead of the draw." },
          { label: "Recovery", text: "Overtime not spent, because the slip was caught early." },
        ],
      },
    },
    {
      label: "What needs a person right now?",
      answer: {
        note: "Three things, and only one of them is urgent.",
        rows: [
          { label: "Make", text: "DL-4471 — re-sequence or the fixed install slips." },
          { label: "Yarn", text: "Nine lots waiting on a signature; none are blocking." },
          { label: "Quality", text: "Wren has a rule ready to send to Sawyer." },
        ],
      },
    },
    {
      label: "Is work in progress under control?",
      answer: {
        note: "It is 6.3% over target, and the reason is the constraint rather than demand.",
        rows: [
          { label: "On the floor", text: "$2.38m across 38,200 lin yd." },
          { label: "Why", text: "Goods stack up behind Backing 2 waiting for their slot." },
          { label: "Fix", text: "Clearing the constraint moves this more than anything else." },
        ],
      },
    },
  ],
};

/**
 * Sage also owns the calibration: how the plants compare, and where each one's
 * limits are set too tight or too loose. Performance and Thresholds are two
 * views of that same question — one is the result, the other is the dial.
 */
const SAGE_LIMITS: PageAgent = {
  agent: "Sage",
  role: "Calibration & limits",
  intro: "I watch how the plants compare and where each dial is set. Ask me what to change.",
  prompts: [
    {
      label: "Which limits are set too tight?",
      answer: {
        note: "Two. They interrupt people for calls the engine has never got wrong.",
        rows: [
          { label: "Grade a clear pass", text: "Plant 07 asks; 214 of 214 were approved as proposed." },
          { label: "Log drift in band", text: "Plant 15 asks; every one was inside ±8% of plan." },
          { label: "Worth", text: "Moving both to Auto returns about 40 interruptions a week." },
        ],
      },
    },
    {
      label: "Which limits are set too loose?",
      answer: {
        note: "One, and it is the one that has cost money.",
        rows: [
          { label: "Split a dye lot", text: "Left costed rather than blocked on Plant 04." },
          { label: "Result", text: "Three claims, $41.2k, all from split shade-critical lots." },
          { label: "Fix", text: "Wren's rule makes it a hard constraint instead of a price." },
        ],
      },
    },
    {
      label: "How do the plants compare?",
      answer: {
        note: "Dalton is the outlier, and it is a constraint problem rather than a people problem.",
        rows: [
          { label: "Attainment", text: "Dalton 88%, Eton 98%, Chatsworth 99%." },
          { label: "Auto-resolved", text: "Dalton 87%, Eton 94%, Chatsworth 92%." },
          { label: "Read", text: "Backing 2 is behind; the engine is closing more, not less." },
        ],
      },
    },
    {
      label: "What happens if I widen a limit?",
      answer: {
        note: "Fewer interruptions, and a claim rate to watch afterwards.",
        rows: [
          { label: "Immediately", text: "Matching exceptions stop reaching a person." },
          { label: "Watch", text: "Whether claims rise on what the engine now settles alone." },
          { label: "Never", text: "Running the line, grading product or overruling a hold." },
        ],
      },
    },
  ],
};

export const PAGE_AGENTS: Record<string, PageAgent> = {
  "/scheduling": {
    agent: "Sawyer",
    role: "Scheduling",
    intro: "I hold the belt plan. Ask me what moves, what it costs, and what breaks.",
    prompts: [
      {
        label: "Why is the window frozen?",
        answer: {
          note: "Because the floor cannot turn around inside it, not because a rule says so.",
          rows: [
            { label: "Window", text: "Now until 3.5 hours out." },
            { label: "Reason", text: "Staging yarn, dressing a creel and finding a crew take that long." },
            { label: "Before now", text: "That work has already run — it is history, not policy." },
          ],
        },
      },
      {
        label: "What is still unplaced?",
        answer: {
          note: "Five runs, and only one of them is tight.",
          rows: [
            { label: "Today", text: "DL-4471 — the balance of a shade-critical lot." },
            { label: "This week", text: "Four runs with slack on their promised dates." },
            { label: "Cheapest", text: "Campaign the Cascade lots together and the purge is free." },
          ],
        },
      },
      {
        label: "What would a re-sequence cost?",
        answer: {
          note: "$1,840 in changeover, and it holds both dates.",
          rows: [
            { label: "Move", text: "Slots 2 and 3 swap; ORD-77412 runs first." },
            { label: "Keeps", text: "DL-4471 whole, so no shade risk." },
            { label: "Alternative", text: "Splitting the lot is cheaper today and cost $41k in claims before." },
          ],
        },
      },
      {
        label: "Which belt is the constraint?",
        answer: {
          note: "Backing 2 — an hour lost there is an hour lost for the plant.",
          rows: [
            { label: "Load", text: "19% of the board, the highest of any lane." },
            { label: "Running", text: "12% under standard since 06:00." },
            { label: "PM", text: "Scheduled in 3 days; vibration is already over its limit." },
          ],
        },
      },
    ],
  },

  "/make": {
    agent: "Sage",
    role: "The shift",
    intro: "I read the run against the released plan. Ask me what slipped and what it costs.",
    prompts: [
      {
        label: "Why is the run behind?",
        answer: {
          note: "Backing 2 is 12% under plan, and it has been drifting rather than failing.",
          rows: [
            { label: "Rate", text: "369 yd/hr against 420 standard." },
            { label: "Downtime", text: "48 minutes, with the reason code still pending." },
            { label: "Effect", text: "Projected finish is +5h 10m — recoverable today only." },
          ],
        },
      },
      {
        label: "What are my options?",
        answer: {
          note: "Three, and I would take the re-sequence.",
          rows: [
            { label: "A · re-sequence", text: "+$1,840 changeover, holds both dates, lot stays whole." },
            { label: "B · split the lot", text: "Cheaper now, but this is what produced CLM-2291." },
            { label: "C · expedite", text: "Overtime buys the hours without touching the sequence." },
          ],
        },
      },
      {
        label: "What is the bearing temperature telling us?",
        answer: {
          note: "It is past the alert limit and rising, but the PM is not for three days.",
          rows: [
            { label: "Reading", text: "182°F against a 175°F limit, drive-side motor bearing." },
            { label: "Trend", text: "Rising across three shifts; last PM was 14 days ago." },
            { label: "Call", text: "Raising the order early is yours — the signal routes on its own." },
          ],
        },
      },
      {
        label: "What have you settled without me?",
        answer: {
          note: "Most of it. 128 of 147 exceptions closed inside my limits this week.",
          rows: [
            { label: "Auto", text: "Rate drifts inside band, clean-roll grading, reports." },
            { label: "Escalated", text: "Anything that moves a promised date or splits a lot." },
            { label: "Dial", text: "Widen a limit in Thresholds and more closes here." },
          ],
        },
      },
    ],
  },

  "/yarn": {
    agent: "Sable",
    role: "Yarn & dye lots",
    intro: "I propose lots and recipes. Nothing here runs until you sign it.",
    prompts: [
      {
        label: "Why can't you approve these yourself?",
        answer: {
          note: "Because every one of them is an instruction for product that does not exist yet.",
          rows: [
            { label: "Grading", text: "Judges product already made — that I can settle." },
            { label: "A recipe", text: "Commits fibre, tank time and a shade a whole order is held to." },
            { label: "So", text: "There is no reading that makes signing one safe to automate." },
          ],
        },
      },
      {
        label: "What is waiting on me?",
        answer: {
          note: "Nine lots, $16,000 riding on them.",
          rows: [
            { label: "Yarn lots", text: "Three allocations — which draw serves which orders." },
            { label: "Dye lots", text: "Three recipes to check against standard." },
            { label: "Tightest", text: "DL-4471 is shade-critical and must run whole." },
          ],
        },
      },
      {
        label: "How much waste have we avoided?",
        answer: {
          note: "$8,400 this week, by sizing lots to the orders rather than to the draw.",
          rows: [
            { label: "Waste rate", text: "4.1% of input, against a 6% standard." },
            { label: "Creel", text: "92% utilisation, three points above plan." },
            { label: "Purges", text: "Two changeover purges avoided by campaigning." },
          ],
        },
      },
      {
        label: "What did you approve on your own?",
        answer: {
          note: "Three, all inside limits you set — they are on the Approved tab.",
          rows: [
            { label: "Y-30844", text: "Single-draw allocation under 2,000 lb." },
            { label: "DL-4459", text: "Recipe identical to standard, same draw, ΔE 0.4." },
            { label: "Y-30869", text: "Marcus signed this one by hand." },
          ],
        },
      },
    ],
  },

  "/quality": {
    agent: "Wren",
    role: "Quality & claims",
    intro: "I check what the plant made and chase the ones that got past us.",
    prompts: [
      {
        label: "What is the pattern in these claims?",
        answer: {
          note: "One cause, three claims, four months — every one a split shade-critical lot.",
          rows: [
            { label: "Cost", text: "$41.2k across CLM-2291, CLM-2205 and CLM-2154." },
            { label: "Stage", text: "All three slipped at dye-lot QC." },
            { label: "Fix", text: "A rule that stops the split would have prevented all of them." },
          ],
        },
      },
      {
        label: "Where are defects concentrated?",
        answer: {
          note: "Backing 2, and at the edges rather than the centre.",
          rows: [
            { label: "Station", text: "Backing 2 is the hottest row on the heatmap." },
            { label: "Position", text: "Left and right edges — consistent with a backing issue." },
            { label: "Read", text: "The constraint line is also the quality problem." },
          ],
        },
      },
      {
        label: "What happens if I accept the rule?",
        answer: {
          note: "It goes to Sawyer and becomes a hard constraint on the belt plan.",
          rows: [
            { label: "Rule", text: "Never split a shade-critical dye lot across dye runs." },
            { label: "Type", text: "Soft — costed, not enforced, until you make it hard." },
            { label: "Effect", text: "Sawyer refuses the split rather than pricing it." },
          ],
        },
      },
      {
        label: "How is first-pass yield trending?",
        answer: {
          note: "96.4%, up 0.6 points — but the repeat-defect rate is what I would watch.",
          rows: [
            { label: "Yield", text: "96.4% of graded rolls pass first time." },
            { label: "Repeats", text: "7.8% of graded rolls, down 0.4 points." },
            { label: "Traceback", text: "48 seconds from claim to run — it was a week." },
          ],
        },
      },
    ],
  },

  "/overview": SAGE,
  "/sage": SAGE,

  // The audit experience has its own agent. It recommends, drafts and
  // prepares; it never finalises, returns or sends without confirmation.
  "/p-card": {
    agent: "P-Card Audit Agent",
    role: "Review by exception",
    intro:
      "I evaluated every statement this cycle and cleared the ones that passed. Ask me about the ones I've routed to you.",
    prompts: [
      {
        label: "Why is PC-0826-0042 in my queue?",
        answer: {
          note: "Two proposed findings, both needing your decision. Ten of its fourteen transactions passed every check.",
          rows: [
            { label: "F-01", text: "Missing receipts on lines 3, 8 and 11 · P-Card Policy 4.2 · Major." },
            { label: "F-02", text: "Business purpose reads “supplies” on line 7 · Policy 3.1 · Minor." },
            { label: "Exposure", text: "$4,180 across the three unreceipted lines." },
          ],
        },
      },
      {
        label: "What did you clear on your own?",
        answer: {
          note: "1,236 statements — 96.3% of the cycle — passed every configured check and never reached a person.",
          rows: [
            { label: "Receipt coverage", text: "Every line over the threshold had a readable receipt." },
            { label: "Classification", text: "Expense type matched merchant category." },
            { label: "Meals, tips, tax", text: "All inside policy. Recurring charges within drift band." },
          ],
        },
      },
      {
        label: "Which rules are interrupting me for nothing?",
        answer: {
          note: "One is below its precision floor and one is on watch.",
          rows: [
            { label: "Tax magnitude", text: "31% confirm rate — fires 12 times, you dismiss two in three." },
            { label: "Meal per head", text: "47% — on watch. Threshold may be too tight for Sales." },
            { label: "Fix", text: "Propose a threshold change; only a program manager can activate it." },
          ],
        },
      },
      {
        label: "What can I return, and what happens when I do?",
        answer: {
          note: "Anything with a confirmed finding the cardholder can correct. Returning parks it until reapproval.",
          rows: [
            { label: "Drafts", text: "I write the email with the exact lines and corrections requested." },
            { label: "State", text: "Leaves your queue → awaiting cardholder → awaiting manager." },
            { label: "Confirm", text: "Nothing sends until you press Return statement." },
          ],
        },
      },
    ],
  },
  "/performance": SAGE_LIMITS,
  "/thresholds": SAGE_LIMITS,
  "/settings": SAGE,
};

/** The agent for a path — nearest matching prefix, falling back to the
 *  cross-agent assistant so a new route always has someone answering. */
export function agentForPath(pathname: string): PageAgent {
  const key = Object.keys(PAGE_AGENTS)
    .filter((k) => pathname === k || pathname.startsWith(`${k}/`))
    .sort((a, b) => b.length - a.length)[0];
  return key ? PAGE_AGENTS[key] : SAGE;
}
