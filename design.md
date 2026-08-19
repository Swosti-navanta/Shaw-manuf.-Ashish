# Shaw MFG · AI Agent Design Router

Manufacturing agent portal. Built on `@navanta-ai/design-system`, following
the conventions of the IRIS project (`../Navanta/iris`).

> **Token saving rule**: don't load design tokens into context unless you are
> actively doing UI work. `src/app/tokens.css` is the source of truth for
> color, type, elevation and gradients — it is carried over from IRIS
> unchanged, including the Iris purple brand ramp (`--color-iris-*`).

## 1. The agents

Five named agents, each owning one surface. The nav reads as "who is doing
this", not "where things live".

| Agent | Surface | Does |
| :--- | :--- | :--- |
| **Rowan** | Make | Reads the run against the released plan, costs the recovery options, escalates the ones that move a promised date |
| **Wren** | Quality | Grades at end of line, traces field claims back to the run, sends causes upstream as new rules |
| **Sawyer** | Scheduling | Holds the released sequence, recomputes changeover, guards the dye-lot and date rules |
| **Sable** | Yarn | Sizes dye lots, plans the creel, decides whole-vs-split |
| **Limits** | Thresholds | The Auto / Limit / Ask dial, set per plant |

What the agents never do: run the line, write the demand plan, grade the
product, or overrule a quality hold.

## 2. Persona — one owner, every surface

**One persona: Marcus · Director of Manufacturing.** Owns Rowan, Wren, Sawyer
and Sable, and sets the limits.

This started as three (Plant Manager → Division Scheduler → VP) mirroring an
escalation ladder. It collapsed because the ladder cost more than it explained.
Every cross-agent story in the product — Rowan's decision rebuilding Sawyer's
sequence, Wren's finding writing a scheduling rule, Sable's lot sizing sitting
behind Rowan's Option A vs B — had to be told across a profile switch. Someone
who must change identity to follow the consequence of their own decision cannot
see that the agents are connected, and that connection is the entire claim.

The scaffolding is kept rather than deleted: `Persona` is still a union,
`PERSONA_PAGES` is still an allowlist, and `src/proxy.ts` still guards on it.
Re-splitting is a data change in `src/types/persona.ts`, not a rewrite of the
proxy, the nav and every page.

`canEditThresholds()` and `canReleaseSchedule()` now simply return true. They
stay as functions because they are the exact seams a future role split reopens.

**Nav order follows the work, not the org chart.** Overview → The plan (Sawyer)
→ On the floor (Sable, Rowan, Wren) → Network. The plan is set, then it is
executed. Yarn sits with execution rather than the plan: Sable's dye lots and
recipes are what the floor consumes, and Yarn, Make and Quality all key off the
same dye lot, so they stay together.

**No count badges on the rail.** Six surfaces with a red pill each is six
numbers competing at the edge of the screen. The Overview inbox already
aggregates every count into one ranked list — the rail says where things are,
the inbox says what to do.

## 2b. The executive dashboard (`/overview`)

Five tiles, three charts, then the inbox. Order is the argument: the tiles
answer *are we alright*, the charts answer *why*, the inbox answers *what do I
do*. Opening with a work queue would make it a supervisor's screen; ending
without one would make it a report.

**Every figure is derived from the page that owns it** — margin from Quality's
bridge, claims from its queue, scheduling from Sawyer's backlog, approvals from
Sable's. A roll-up that keeps its own copy of a number will drift from the page
it came from, and whoever spots it stops trusting both.

Chart form is chosen per question, not per house style:

| Question | Form | Why not the obvious alternative |
| --- | --- | --- |
| Yarn output vs critical | Bullet | Built for measure-vs-target-vs-band. A gauge or donut spends far more ink and can't show target and floor at once. |
| Margin, yield, claims | Signed delta vs last week | A seven-point sparkline in 20px is a shape, not a reading. `−1.6k wk` is the thing the shape was gesturing at, and it says which direction is *good* — claims falling and yield falling are not the same news. |
| Machine health | Stacked bars by cause + cumulative line + PM band | Two questions. *Why is it stopping* is a composition summing to each period's total ⇒ stacked bar. *Is it getting worse* is a running total against a budget ⇒ line, on its own axis because minutes-per-period and minutes-accumulated share a unit but not a scale. The split is what earns the chart: one bar of "downtime" says the line is unhealthy, split by cause it says material-out is the half that's growing — a yarn problem wearing a machine's clothes. |
| Plant expected vs actual | DS table, sorted by money at risk | Six plants × two figures is a *reading* task before a comparison one, and it sorts. It carried a dumbbell "gap" column drawing how far apart the two volumes were; that came out — a picture of volume is an operations answer to an executive question. The columns that replaced it are **At risk** and **Recovery spend**. |
| Belt performance, all three | Grouped bars — planned vs achieved, per belt | Each belt is compared against *its own* plan inside its own group, so the different standards (520/420/610 yd/hr) never share a scale. **Planned is a diagonal hatch, not a flat fill** — the texture reads as "the target, not the thing" and stays distinct from achieved without relying on colour, legible in grayscale. **Achieved is a top-lit gradient** (iris when on plan, deep red when short) for depth and to flag the miss before a label is read. Recharts can't render pattern/gradient fills in its own legend (separate SVG root), so the legend keys are drawn by hand to match, and the tooltip's item/label styles are forced to primary text — the default muted grey was unreadable. |

**Five cards, one row.** `KpiGrid` tops out at three columns and folds
responsively below that, so the row is set with an inline
`grid-template-columns` — the only override that beats its classes at every
breakpoint. Detail lines are written to about thirty characters to survive the
narrower cell; the card keeps the full string on its own `title`.

**The agent card carries the star.** "Resolved by the engine" is the one tile
reporting on the agents rather than on the plant, so it takes the `AiStar` used
to mark them everywhere else. The DS card exposes no icon slot — only the
standard Info glyph — so the star is positioned over it and the title row
indented (DS override 5).

**The tiles are `KpiGrid` + `KpiBreakdownCard`, and the heading is
`PageHeading`.** An earlier version hand-rolled a local `Tile` and had quietly
reinvented the card frame, the trend badge and the grid — three things the DS
already owns, and three places for this page to drift from every other surface.

`KpiBreakdownCard` over `KpiStatCard` because the stat card's trend badge reads
the *sign* of a number, and the sign alone is not the news: claims falling and
yield falling are opposite things. The movement joins the detail line instead,
and `.kpi-alert` turns that line red where what it says is bad (DS override 4 in
`globals.css` — the card has no tone prop).

**Margin and on-time delivery lead.** Those are the two an operations director
is held to: one is the money, the other is the only figure on the page a
customer would recognise. Everything else — output, yield, downtime — is the
plant talking to itself.

**"Resolved by the engine" is the product's own scoreboard**, and the one tile
no conventional manufacturing dashboard would carry: 87.1%, 128 of 147, trended
against last week. It is also what the Thresholds dial moves — widen a limit
and it rises, and the question to ask next is whether claims rose with it. The
static "N resolved automatically" strip at the foot of the page went when this
arrived: same claim, no trend, weaker.

**Margin earned leads, margin at risk follows it.** Shown alone, "$41.2k at
risk" reads as a loss. Next to "$1.24m earned" it reads as what it is — the
share of a good week still in question. A percentage also always carries its
base: yield is `94.1% of 2,940 lin yd`, because a ratio without the quantity it
is a ratio *of* cannot be sized.

**Scheduling has no tile.** It was there as "N of M placed" and came out: that
moves every time somebody drags a bar, and an executive can do nothing with it.
The scheduling question worth this row is whether promised dates are at risk —
a commitment, not a queue depth — and that isn't modelled yet.

**The plant table is money, not yardage.** Shortfall is valued at contribution,
not list, because the fibre for a yard never made is also never bought. `At
risk` is exposure and `Recovery spend` is what has already been committed
against it — one is a forecast, the other is a fact, and merging them would
hide which. Sorting defaults to money rather than percentage: a small plant
missing 5% and a large one missing 3% are not in the order their percentages
suggest.

**There is no inbox.** It carried one — every agent's queue counted and routed
— and that is a supervisor's screen: each line is a job, and none of them are
this reader's. The automation strip stays, because "the engine cleared these
and interrupted nobody" is the one operational fact an executive can act on.

**Machine health is downtime, not vibration, and it is per machine.** The first
version plotted vibration as a trend; the plant doesn't track that — vibration
is a spot reading, and charting it was inventing data to fill a shape. The card
carries a machine selector across the top, each machine showing its own
minutes-lost so the choice is informed before it is made. The constraint is
starred and open by default — it is the one whose downtime costs the whole
plant — but the others are there because "how are the machines" also means
"confirm the rest are fine", and a card that showed only the worst could never
answer that. The reasons in the stack are Make's own four causes.

The in-cell dumbbell is hand-built in CSS: two dots and a segment on a shared
scale, which `left: %` already draws.

## 3. Division & plant — a filter, not a scope

Defined in `src/types/division.ts`, read through `useScope()`.

Three divisions (Residential Carpet, Commercial · Contract, Hard Surface ·
LVT) over six plants. Every persona can look at every division; picking one
narrows the plant list beneath it, the same Region → Branch shape the IRIS
TopBar uses. **No route is gated by division.** If the selected plant falls
outside a newly chosen division, `ScopeProvider` snaps it to the first plant
that division admits, so a page never renders against an excluded plant.

Plant 12 · Aiken, SC is the default — it's the plant the demo narrative runs
on (Backing 2, dye lot DL-4471, order ORD-77310).

## 4. The three lanes

Every decision the engine touches lands in one of three lanes, and the UI
must always say which:

- **Automated** — resolved without a person. Iris purple.
- **Inside limits** — stopped at a threshold. Amber.
- **Needs you** — escalated to a person. Near-black.

Which lane a decision takes is set by the Thresholds dial for that plant.
When something reaches a person, the UI should be able to say *which rule
sent it there* — that is the whole argument for the product.

## 5. Make (Rowan) — the built workflow

The first surface built end to end. Its shape is the template for the rest.

**An agent surface is a queue of decisions, not a dashboard.** Make is a
`TableShell` + `DataTable` of open actions (`src/types/action.ts`), tabbed
*Needs you* / *Automated* so the engine's own work stays visible instead of
being invisible-by-success. A row leaves the queue when it's settled.

**Evidence belongs to the thing it is evidence about**, never to the page:

| Evidence | Lives in | Because |
| :--- | :--- | :--- |
| Rate vs plan, run KPIs, activity feed | the action's deck | they argue for *this* decision |
| Batch genealogy | the dye lot's drawer | it's the lot's provenance |
| OEE, PM window, vibration | the machine's drawer | it's the line's condition, not the lot's |

Machine health is deliberately **not** on Overview and **not** in the dye-lot
drawer. It's standing condition, so it only reaches a person as an action row
when it crosses a threshold ("vibration rising — raise a work order"); the
detail is the machine's own record, which outlives whatever lot is running.

**State lives above the page.** `ThresholdProvider` → `RunProvider` →
`DetailDrawerProvider` wrap the portal, in that order, because the dial
decides whether the deviation ever reaches a person, and the decision is what
Sawyer and Sable will read. A page never owns cross-agent state.

**The dial drives three states** (`RunContext.status`), not a local toggle:

| `reseq` at this plant | Make shows |
| :--- | :--- |
| `ask` | Three costed options, and the feed ends at *Needs you* |
| `auto` | Auto-resolved block naming the rule and plant; feed is all-automated |
| — after accept — | Decision recorded, plus three new feed entries, badge clears |

**Every figure drills.** `DrillLink` + `DetailDrawer` render eleven detail
kinds (roll, dye lot, batch, yarn, order, claim, machine, work order, KPI,
option, feed event). A number that can't be opened is the product asking to be
believed rather than checked — don't add one.

**Say what isn't there.** Machine health names predictive maintenance as not
demo-ready and why (it needs the customer's machine data). Keep that habit.

### Known limitation

The run is seeded for **Plant 12 only** (`src/data/run-data.ts`), but Make
renders it whichever plant is selected — so at Plant 21 the page still talks
about Backing 2 and a carpet dye lot. Two ways out when it matters: gate Make
on an empty state for other plants, or seed a second run. Until then, demo the
Auto path by flipping the Thresholds dial rather than by switching plants.

## 6. Scheduling (Sawyer) — the board

Structure follows the IRIS parts-planning page: a `minmax(0,1fr) 325px` grid
with the visual left and the agent's brief right, then the working list below.
`AgentBrief` is the shared morning-brief component — every agent surface gets
one in that top-right slot.

The board is a **resource Gantt**, not a list of cards. Conventions it follows
(see `board-layout.ts` — everything is computed in hours-from-board-start and
only converted to percentages at the edge):

- **Position is time.** A run starting at 14:00 sits under the 14:00 gridline.
  Never `flex` the blocks: flowing them left-to-right makes the ruler
  decorative and a half-empty belt look as packed as a full one.
- **Setup is drawn, not just priced.** Changeover renders as a hatched segment
  attached to the bar it precedes, sized by `changeoverHours`. On a constraint
  line the minutes cost as much as the dollars.
- **Every belt carries its load** (`utilisation`), so an oversubscribed
  constraint reads at a glance. Load is belt time *consumed*, not finish time —
  a pinned run can leave the belt idle, and idle isn't load.
- **Gridlines run through the lanes**, plus a **now-line**. `NOW_HOURS` is
  fixed, not wall-clock: the narrative is pinned to one shift.
- **Order-flow connectors** link one manufacturing order's operations across
  belts. This is the manufacturing-specific convention a generic calendar
  can't show — and it requires downstream operations to be pinned with
  `startAt`, or the board draws an order flowing backwards in time.

⚠️ Don't draw the connectors with SVG `<polyline points>` — that attribute
only accepts user units, so percentage x-coordinates are silently dropped and
nothing renders. Positioned elements with CSS percentages track the blocks on
resize for free.

- **Only the constraint belt is interactive.** Backing 2 is where the contest
  is; letting someone nudge a run there is how they discover Sawyer is
  checking rules. The other two belts are context.
- **The verdict recomputes on every nudge** (`ScheduleContext.verdict`), and
  cites the claim behind the warning as a drillable link. It renders **only
  when the sequence breaks** — the brief already carries "holds", and the
  brief can't carry the reason it failed.
- **`/scheduling/rules`** is the constraint model on its own page, covered by
  the existing `/scheduling` prefix in `PERSONA_PAGES` so the proxy needs no
  change. Its nav entry means `isActive("/scheduling")` must be **exact** —
  otherwise both entries light and first-match `activeKey` picks the parent.

### The working list

Lists use the DS **`TableShell` + `DataTable`** pair (search, sort, Customize,
pagination), not hand-rolled rows. `DataTable`'s sort state is `{field, dir}`
— not `{key, direction}`.

Column model follows the IRIS parts-planning table: a serial `#`, identity,
the decision inputs as narrow columns, then the agent's read in Iris-700
under an `AiStar` header, then **Action last**. Two rules that matter:

- **An insight column carries short structured lines, not prose.** It has to
  be scannable *down the column*; a sentence per row forces you to read every
  one. The long reasoning lives in the row `title`.
- **Fixed column widths must total less than the container**, or the trailing
  Action column clips and the primary action becomes unreachable.

### The agent brief

`AgentBrief` lists only what is **still outstanding** — a settled item drops
out of the list entirely rather than rendering as "00 · nothing new", which is
a row someone has to read to learn there's nothing to do. When everything is
clear the list collapses to one "Nothing waiting on you" line.

Accepting an option in Make rebuilds this sequence for real
(`boardForDecision`), adjusted during render off a stored previous value —
not in an effect. An effect paints the stale board first and then cascades;
the lint rule `react-hooks/set-state-in-effect` will reject it.

**Don't offer doors that don't open.** The brief's "Rebuilt from Rowan's call"
row states the fact without linking to `/make` — the Scheduler's persona
can't reach that route and the proxy would bounce them straight back.

### The board is a 48-hour, direct-manipulation Gantt

**48 hours, three zooms.** A single-shift board can only show what is already
committed; two days is the first window where moving something is a real
question, because there is somewhere to move it *to*. 48h in one panel makes a
2.5h run 40px of nothing, so the window stays fixed and the *scale* changes —
`48h / 24h / 12h`, default 24h, with the track scrolling under a **fixed belt
gutter**. A belt name that scrolls away from its own bar makes tomorrow
unreadable.

**Drops set a time, not a slot.** The first cut reordered within a sequence and
repacked from hour zero, which meant every run stayed jammed in the first nine
hours and *no* move was ever legal. "Run this tomorrow morning" is a time.

**The interaction is a calendar's, not a list's.** The bar itself moves under
the cursor keeping the grab offset, lifts on a shadow, leaves a dashed ghost in
the slot it is vacating, snaps to 30 minutes, and carries a live time chip
(`19:30 – 22:00`). Invalid drops turn the ring and the chip red *before* the
button comes up — `locked window — can't move here` — rather than snapping back
afterwards with an explanation. The scroller auto-advances at the edges, since
at 12h zoom tomorrow is entirely off-screen.

**A trailing grip widens belt time.** Only the trailing edge is grabbable: the
start is set by dragging the bar, and a two-handled bar invites moving a run by
its left edge, which silently changes duration as well as time. Widening is a
real scheduling act rather than a data correction — nominal hours come from
yardage at *standard* rate, and the constraint belt is running 12% slow.

**Click and drag are different verbs.** A press that travels moves the run; a
press that doesn't opens a details card — anchored to the bar, portalled to
`body` because the track scroller's `overflow-x: auto` clips the cross axis
too, and registered a frame late because focusing a bar makes the browser
scroll it into view, which would otherwise dismiss the card before it was seen.

**Three depths, and nothing floats.** The card answers *what is this* and holds
the nudge actions; **Review** opens the full record — timing, what it's
committed to, and the rules Sawyer re-checks on every move. A board that opens
a modal on every click stops being a board.

The old `Selected · Earlier / Later / Clear` strip is gone: a control bar
acting on a selection is a second place to look for something the thing itself
can hold. **Re-release** moved into the card header beside the status it
changes, for the same reason — the header already says *draft — not yet
released*, and that sentence is exactly what the button rewrites.

**Unplaced work is on the board, not only in the table.** Every backlog item
draws as a dashed full-height bar in its belt's *free* time; hovering turns it
iris and names the action, clicking places it.

Appending is the only honest position. A proposal drawn mid-sequence has to be
painted over a bar that is already there — two runs claiming one hour — or the
committed bars have to shift to make room, which misrepresents the plan the
floor is currently running. Appended, it answers the only question being asked:
*this is when it runs if you say yes now.*

Proposals are floored at the end of the freeze. A belt whose committed work
finishes early would otherwise have its proposal packed straight onto the tail
— inside a window the board refuses if you drag a run there. Suggesting a slot
the product won't accept is worse than suggesting nothing.

Ghosts are **iris**, because iris means "an agent is proposing this" everywhere
else in the product. A grey dashed box reads as *disabled*, which is the one
thing a proposal isn't. No shadow either: a placed run sits on the board, a
proposal is still an idea about it.

That constraint is in the **data**, not just the renderer: every `BACKLOG.slot`
is past the end of its belt, so a placed run lands exactly where its ghost was
drawn. A proposal that jumps the moment you accept it isn't a proposal. Waiting
items are grouped by family before layout, so same-shade lots campaign together
and the purge between them really is free — which is what Sawyer's note on each
row claims.

**Lanes are square, flush, and white.** A rounded lane pinches its own
gridlines at both ends, so the hour marks stop lining up across belts — the one
thing a resource Gantt has to get right. Rows sit flush with a hairline rule
between them, gutter and track sharing the same rules, so the two read as one
grid rather than two lists that happen to align. Bars stay rounded: they are
objects on the grid.

**The board is matched to Figma node `2346-9177`** (Customer-Ops). Every colour
in that file already resolved to an existing token — the corrections were all
geometry and subtraction: bars 48px in a 76px lane with the label and sub-line
pushed apart, right corners rounded only (the accent stripe is flush left, and
rounding that corner clips the one mark identifying the run), the scale switch
moved into the card header, belt icons and the gutter's rules and tint removed,
and the freeze reduced to a single dashed edge.

Changeover and maintenance keep their diagonal hatch, against the Figma. An
outlined empty box on a Gantt reads as another bar — a thing occupying the
belt. The slashes read as belt time that yields nothing, which is what both of
them are. The freeze does not get slashes: it isn't occupied belt time, it's a
boundary on when you may edit, so an edge is the honest mark for it. The draft chip and Re-release stay beside the
scale switch: the reference only draws the released state, and following it
literally there would leave no way to re-release.

**Only one thing on the board is figure.** The bars. Everything else — the
already-run band, the freeze hatch, changeover, gridlines — is ground and is
tuned down until it reads that way. The first cut had grey lanes, a dark border
and a shadow on every bar, and a boxed constraint lane; it came out as a wall
of boxes with no hierarchy. The constraint belt is now a background tint plus a
single left accent edge across gutter and track, not four yellow borders.

**Maintenance windows are declared, not inferred.** `MAINTENANCE` in
`schedule-data.ts` marks belt time that is genuinely unavailable, drawn as a
labelled amber band. The layout's other gaps are left unlabelled on purpose: a
belt waiting on the belt upstream is *idle*, not under maintenance, and calling
one the other tells a scheduler they can't use time they can.

**Nothing on the board relies on `title` alone.** `title` is not exposed
reliably by screen readers and never on touch, so anything carrying its meaning
there does not exist for most non-mouse users. Changeover was an empty `<span>`
whose cost lived only in a tooltip; it and the maintenance band are now
`role="img"` with real labels. Bars get a spoken label carrying time, duration
and lot — the visible text is only the name — plus `aria-haspopup="dialog"` and
`aria-expanded` instead of `aria-pressed`, which claimed a toggle that never
existed. Lanes are named groups, so a run arrives with its belt and that belt's
load. Legend swatches are `aria-hidden`: they restate their own label in colour.

**The resize grip is a real control.** It was a `role="presentation"` span with
a pointer handler, nested *inside* the bar's `<button>` — invalid markup, and
unreachable without a mouse. It is now a sibling `<button>` with
`role="slider"`, live `aria-valuetext`, and arrow keys that step it by
`SNAP_HOURS`. Every interactive thing on the board now has a keyboard path:
move via the card's Earlier/Later, resize via the grip, place via the ghost.

**A proposal offers two actions on hover, and is not itself a button.** *Place*
accepts it where it stands; the pencil opens the placement deck, because a
proposal invites two different questions — "yes, do it" and "what is this,
exactly" — and answering the second by placing it and undoing is a worse trade.
The ghost is a `role="group"` container holding two real buttons; making the
whole thing a button and nesting controls inside it repeats the markup error
the resize grip had. Below ~132px the *Place* label drops to its icon.

**`backlogRun` lives in `board-layout.ts`, used by both the board and the
deck.** They each had their own copy, only one carried the freeze floor, and
the two surfaces quoted different start times for the same run — the ghost said
14:00, the deck it opened said 11:15. One conversion, one answer.

**One scale, no switch.** The 48h/24h/12h control existed because fitting two
days into a panel made every bar unreadable. Fixing the scale at the readable
end and reaching the rest by scrolling answers that without a control to
explain.

**Two refusals, both stated:**

- **Cross-belt is refused.** Tufting, Backing and Finishing are consecutive
  processes, not interchangeable machines. Accepting that drop would teach the
  wrong model in the first ten seconds.
- **The frozen window is refused.** It runs from the start of the board to
  `now + 3.5h`, drawn as **two** bands because they are immovable for different
  reasons: before the now-line the work has already run — history, not policy —
  and inside the lead the floor cannot stage yarn and dress a creel in time.
  Only the second is a rule, and only the second could be argued with.

  This was first built as a flat 12-hour block from the start of the board,
  which froze the whole of today and read as arbitrary. A freeze pinned to the
  board window also grows silently when the window does. Measuring it forward
  from *now* is the only definition that survives changing the zoom.

Fixed-date runs can be inspected but never dragged, and say so on hover.

**Three traps this cost, all worth remembering:**

1. `setPointerCapture` **throws** when the pointer id isn't active, and an
   unguarded throw aborts the handler *before* drag state is ever set.
2. Handlers must read drag state from a **ref**, not the render closure. Events
   landing in the same frame as the press otherwise see a stale `null` and the
   whole drag is silently dropped.
3. A press that never travelled is a **click**, not a drop. Without a slop
   threshold, selecting a bar attempts a drop where it already sits and gets
   refused for being inside the locked window — a baffling thing to say about
   "I selected this".

## 7. Yarn (Sable) — the approval queue

Same decision-queue shape as Make and Quality, with one difference that runs
all the way through the surface: **there is no automated lane, and that is
deliberate rather than unfinished.**

Rowan can re-sequence inside a limit and Wren can grade a clean roll, because
both are reacting to product that already exists and can be measured. Sable
proposes recipes, run orders and lot sizes — instructions for product that
hasn't been made yet. No reading makes signing one of those safe to automate,
so `/thresholds` has no row for Sable, `YarnContext` has no `auto` state, and
every row ends in a person's signature.

Three approvals, three *kinds* of commitment on purpose:

| Kind | Subject | Why it can't be automated |
| --- | --- | --- |
| Dye formula | DL-4471 · Cascade | A recipe change binds every yard of both orders to the shade it produces |
| Creel sequence | Week 33 | The dark → light break costs a full purge; the alternative is missing a fixed install |
| Lot sizing | DL-4482 · Dune | Trades certain waste against avoided shade risk — a commercial call |

Conventions specific to this surface:

- **Approve / Send back, not approve / undo.** Returning a proposal carries a
  fixed reason from `RETURN_REASONS`. The agent has to learn something from
  being refused; an undo just pretends the click never happened. Free text
  would be unreadable in a queue and unusable as a signal.
- **The recipe shows unchanged lines.** A diff listing only what moved reads as
  "three things changed". The full recipe with three things moved reads as
  "most of this is the recipe you already trust" — which is the actual argument
  for signing it.
- **Failed checks are shown, not hidden.** A red row in *What Sable checked* is
  the reason the item escalated, stated plainly instead of buried under a
  confidence score.
- **Whole vs split is read-only here.** The decision lives in Make, where it
  has a cost and a button; Yarn shows the yarn-side arithmetic behind Rowan's
  Option A vs B. Two surfaces offering the same decision is how a user ends up
  making it twice.
- **The creel is a filled shade ramp, not chips.** Each stop is *filled* with
  its dye shade so the sequence reads as a gradient and the one step that
  reverses it is visible without reading a word. A swatch beside a name buries
  the only thing worth looking at. Text ink flips on Rec. 601 luma, since the
  shades span near-white to near-black.
- **Purge costs sit on the boundaries**, beneath the ramp, because a purge is
  the price of a transition rather than a property of a lot. The cheap ones are
  hairlines; the full purge is the only one that gets weight and colour.
- **Nothing floats on this page.** The creel and the genealogy chain both differ
  per proposal, so each lives in the deck of the approval it belongs to — a
  chain rendered page-level would be true of one row and quietly wrong for the
  other two. An absent batch renders as a dashed "not run yet" node, which is
  information rather than a gap.
- **One fact per column.** `qty` and `covers` are separate fields, not one
  caption: a quantity sharing a line with a scope and a timestamp can't be
  compared down the column, which is the only reason to show it.
- **The headline is a saving, not an exposure.** Quality opens with money at
  risk because grading is damage control. Yarn opens with money kept, because
  sizing a lot correctly is the one thing in the product that pays before
  anything has gone wrong.

### Yarn is two queues, not one

Sable brings two jobs, and they became two tabs because they are decisions
about two different objects:

- **Yarn lot → order** — a *supply* decision, made before any colour exists:
  which draw of undyed fibre serves which orders. Columns: grade, received,
  allocating-to, committing.
- **Dye lot → approve** — a *shade* decision against a standard: does this
  recipe hit tolerance. Columns: shade ΔE, built-from, commits, covers.

They share the decision-queue shape but not their columns, so a filter on one
list would have meant half the columns blank in half the rows. Tabs keep each
set honest.

**The swatch distinguishes by shape, not only colour.** A yarn lot is drawn as
a wound **cone** — the package that sits on the creel — in a natural greige
tone. A dye lot is a hard-edged square of the actual dyed shade — a
finished colour with a boundary, which is what the lot commits to. The two read
apart in grayscale and for anyone who can't separate the hues, so `Y-30918`
never wears a colour that implies it is dyed, and `DL-4471` never wears one that
implies it isn't. Nothing wears a swatch that fits neither.

## 8. Two inline-style traps

**JSX whitespace — a real trap here**

Text that follows an interpolation **and wraps to the next line** loses its
leading space:

```jsx
{c.id} came back from the field: two areas of the same order didn't match.
Traced to a dye lot split.        →  "CLM-2291came back from the field"
```

Same-line text is fine (`{fails} of {total} measurements`). This UI is dense
with interpolated identifiers, so write `{c.id}{" "}` and start the prose on
the next line. Check rendered `textContent`, not the source.

**The shorthand/longhand trap.** In one `style={{}}` object, never mix a
`padding` or `margin` shorthand with a conditional longhand of the same box:

```jsx
padding: "11px 18px",
paddingLeft: cond ? 18 : undefined,   // clears left AND right when !cond
```

React applies these as separate declarations, so the `undefined` longhand wipes
what the shorthand set — every row without the condition rendered flush to its
container edge. Use longhands throughout when any side is conditional. This bit
the constraint-model rule rows; a repo-wide scan found no other instance.

## 9. Conventions carried from IRIS

- **State**: cookie-backed `useSyncExternalStore` providers (see
  `PersonaContext` / `ScopeContext`) so SSR and client agree and the proxy
  reads the same value. Never `useState` for anything the proxy needs.
- **Fonts**: Geist Sans only — there is no mono face in this app. Numeric
  columns keep their alignment with `fontVariantNumeric: "tabular-nums"`,
  not by switching typeface.
- **Links**: identifiers that open a detail render as plain `--link-color`
  links, underlined on hover only (`DrillLink`). No dotted/dashed underlines.
- **Layout**: `(portal)/layout.tsx` owns the shell. Pages render inside it and
  start with `SurfaceScaffold`.
- **Modals**: every modal gets a consistent header and a footer with buttons
  plus a one-line context. Enforce this over any Figma design.
- **Figma**: when given a Figma link or screenshot, read
  `.claude/skills/capture-figma/SKILL.md` before writing code.

## 10. Setup

`@navanta-ai/design-system` comes from GitHub Packages. `.npmrc` reads
`${GITHUB_TOKEN}`, which lives in `~/.zshrc` — an interactive shell is needed
for `npm install` to resolve it.

```bash
npm run dev
```
