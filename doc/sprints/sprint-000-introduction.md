---
sprint: "000"
title: Introduction
status: Completed

created: 2026-07-26
started: 2026-07-26
completed: 2026-07-26
last_updated: 2026-07-26

base_branch: main
base_commit: 079a316
scope_issues: 0

github_project:
github_milestone:

previous:
next: sprint-001-attendance-payroll-quality.md
---

# Introduction

## Purpose

This document explains the evolution of SushiGo's development process and why the project transitions to a structured, iteration-based workflow from this point forward.

It is **not** the beginning of the project.

Instead, it marks the beginning of a formal engineering process that will be used for all future development.

---

# Project Vision

SushiGo was conceived from the beginning as a real software product intended to support the daily operation of SushiGo Restaurant.

At the same time, the project has always served as a public portfolio demonstrating software engineering practices, architecture decisions and product evolution.

The product vision has remained constant since day one.

Only the development process evolved.

---

# Initial Development

Development started as a personal spare-time project.

There was no fixed schedule, no dedicated team and no predefined iteration length.

Features were implemented whenever time was available, making traditional sprint planning impractical.

During this stage, prioritization was mostly dynamic and driven by immediate business value.

The objective was simple:

- Build a usable product.
- Validate ideas quickly.
- Continuously improve the system.

---

# AI Experimentation

The project also became an opportunity to experiment with AI-assisted software development.

Initially, this exploration focused on GitHub Copilot and the emerging "vibe coding" workflow that was becoming popular.

The goal was never to let AI replace engineering.

Instead, the objective was to understand how AI could accelerate software development while maintaining production-quality standards.

As the project evolved, additional AI tools and eventually multi-agent workflows became part of the development process.

---

# Lessons Learned

One of the most important conclusions reached during the project was that AI dramatically changes **who implements the code**, but it does not fundamentally change software engineering itself.

Large software systems still require:

- Domain understanding
- Architecture
- Planning
- Documentation
- Business rules
- Code reviews
- Technical decisions
- Risk analysis
- Quality assurance

The implementation work became increasingly delegated to AI agents, while engineering responsibilities remained under human supervision.

This project intentionally preserves traditional software engineering practices because they continue to be essential for building maintainable software.

---

# Why Introduce Structured Iterations?

As SushiGo continued growing, several factors made informal development increasingly difficult:

- The number of GitHub Issues increased.
- Technical debt began to be tracked through SonarCloud.
- Multiple AI agents started working simultaneously.
- File conflicts became more frequent.
- Time estimation became useful.
- Progress needed to be measurable.
- Architectural decisions required better traceability.

At this stage, organic development no longer scaled efficiently.

A structured engineering process became necessary.

---

# Development Process

From this point forward, SushiGo will be developed using documented iterations.

Each iteration contains:

- Objectives
- Prioritized backlog
- Business value
- Technical dependencies
- File conflict analysis
- Parallel execution strategy
- Time estimates
- Review results
- Lessons learned

The objective is not bureaucracy.

The objective is to preserve the engineering context of the project so that both humans and AI agents can understand not only **what** was built, but also **why** every technical decision was made.

---

# Development Philosophy

This repository follows a simple principle:

> AI changed who writes the code, not how software engineering should be practiced.

AI is treated as an implementation accelerator rather than a replacement for engineering.

Architecture, planning, documentation and technical leadership remain central to the development process.

---

# What Comes Next

Starting with the next document, SushiGo development will be organized into versioned iterations.

Each iteration will represent a complete engineering cycle including planning, implementation, review and measurable results.

This document serves as the transition point between the project's organic development phase and its structured engineering process.