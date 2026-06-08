# Harness 101

<p align="center">
<img width="800" height="313" alt="harness-101-opti" src="https://github.com/user-attachments/assets/36dc909e-d896-464c-8799-8f7d12f8233f" />
</p>


A lightweight starting point for an agentic coding harness — plus a step-by-step tutorial that walks through how it was built, line by line, with notes on what each piece does and why.

This isn't only a repo you clone and run. I wrote the tutorial so you can reproduce the same harness yourself, understand how the pieces fit together, and adapt it to your own projects. There’s also a list of possible next steps in `the-harness/FUTURE-PLANS-AND-UPDATES.md` if you want to push the basics toward something more capable and production-ready.

I got stuck more than once the first few times I wired up different agent systems. Going through this process helped me a lot, and I’m sharing it in case it helps you too.

**If you want to really understand what a harness is and how it works:** work through the tutorial and build it yourself. Use the harness in this repo to see how things are laid out, then tweak prompts, tools, and structure for what you actually need.

---

## Getting started

### Tutorial

The tutorial is a set of static HTML pages in `tutorial/`. Open `tutorial/index.html` in your browser and follow the phases from there.

The tutorial loads Tailwind, Prism, and fonts from CDNs, so open it online or on a machine with network access the first time.

### Reference harness

The runnable harness lives in `the-harness/` — a small Node/TypeScript project with a handful of dependencies.

You’ll need a Grok (xAI) API key in `the-harness/.env`:

```bash
XAI_API_KEY=your_key_here
```

### Install and run

```bash
cd the-harness
npm install
npm start
```

That’s it. The harness runs in your terminal and waits for prompts. Explore the project, add files, change system prompts — whatever you want. Sessions and logs are written as you go so you can see what’s happening behind the scenes. Press **Enter** on an empty prompt to exit.

---

## What’s included

- Lightweight file diffs on writes
- Three modes: Planner | Implementer | Reviewer
- Compaction
- Subagents
- Sessions
- Logging
- Tool definitions

See `the-harness/README.md` for more detail on each piece.

---

## Thanks

Thanks for taking a look. I’ve been building with agentic flows and harnesses for a while, and most of what I found early on stayed pretty high level. I wanted something concrete I could read, type, and run.

Questions or feedback — reach out or follow on [X @adamaoc](https://x.com/adamaoc) or [adamaoc.com](https://adamaoc.com).
