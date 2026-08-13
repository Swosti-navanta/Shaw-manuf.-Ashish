# Shaw · Manufacturing agents

A demo of an agent engine for carpet manufacturing, built for Shaw Industries.
Four agents watch the floor, resolve what they can inside the limits set for a
plant, and escalate what needs a person — with the reasoning attached.

**All data in this app is illustrative.** Nothing here is connected to a real
plant, order book or customer.

## The agents

| Agent | Surface | Owns |
| --- | --- | --- |
| **Sable** | `/yarn` | Dye-lot sizing, the recipe, the creel order |
| **Sawyer** | `/scheduling` | The released sequence and the rules it respects |
| **Rowan** | `/make` | The run against plan, and what to do when it slips |
| **Wren** | `/quality`, `/quality/claims` | Grading at end of line, and tracing claims back |

`/overview` is the cross-agent inbox — the one surface that answers *what needs
me this shift* across all four.

## The loop

The point of the demo is that the agents are connected, and you can watch one
decision move through them:

1. Rowan escalates a slipping run with costed options.
2. Accepting one rebuilds Sawyer's sequence on `/scheduling`.
3. Wren traces three field claims to a single cause on `/quality/claims`.
4. Sending that finding writes a **hard rule** into Sawyer's constraint model.

Step 4 is the one worth watching: a grading problem becomes a scheduling rule
without anybody writing a policy document.

## Running it

The design system comes from GitHub Packages, so `npm install` needs a token
with `read:packages` exported as `GITHUB_TOKEN` (`.npmrc` reads it from the
environment — no token is committed).

```bash
npm install
```

```bash
npm run dev
```

## Deploying

The same `GITHUB_TOKEN` must exist as an environment variable on the host, or
`npm install` cannot resolve `@navanta-ai/design-system` and the build fails.

Three things that cost time the first time round:

**A 401 on `npm.pkg.github.com` means the variable wasn't in that build,** not
that the token is wrong. npm substitutes `${GITHUB_TOKEN}` at install time; with
nothing to substitute it sends the literal string, and GitHub answers
`unauthenticated: User cannot be authenticated with the token provided` — which
reads like a bad credential but isn't. Check the token separately before
touching it:

```bash
curl -sI -H "Authorization: Bearer $GITHUB_TOKEN" https://npm.pkg.github.com/@navanta-ai%2fdesign-system | head -1
```

**Environment variables are not applied retroactively.** Adding the variable
does not fix the build that already failed — redeploy, with the build cache off.
Tick all three environments: a first import often deploys as Preview, and a
Production-only variable won't be there.

**If expansion still fails, set `NPM_RC` instead.** Vercel writes that
variable's contents to `.npmrc` before installing, so nothing has to be
substituted:

```
@navanta-ai:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=<literal token>
```

### Sharing the deployment

New team projects have **Deployment Protection** on, so the URL asks for a
Vercel login and anyone outside the team is locked out. Turn it off under
Project Settings → Deployment Protection, or issue a bypass token, before
sending the link to anyone.

Share the **production alias**, not the URL with the build hash in it — the
hashed one is pinned to a single deployment and won't move when you redeploy.

## Design notes

[design.md](design.md) is the record of how this is put together and why —
the persona model, the three lanes, the scheduling board's conventions, and the
traps that cost real time (React's inline-style shorthand/longhand clash, JSX
whitespace, pointer-drag state in a ref). Read it before changing the board.
