# Commit Nomenclature Guide

This guide details the commit nomenclature adopted, inspired by the [Conventional Commits](https://www.conventionalcommits.org) standard. The incorporation of emojis not only simplifies and makes the process more attractive and fun but also maintains the advantages of the original convention with clear visual integration.

## Commit Format

Each commit follows this general format:

```
:emoji [#issue] (modifier) description :emoji
```

### Components

- **Initial Emoji**: Represents the type of commit, making the commits visually distinctive and easily identifiable.
- **Issue Number and Modifier**: Enclosed in brackets and preceded by `#`, it links the commit to a specific issue in the issue tracker. Modifiers like `!` for significant changes or `(scope)` for specific scopes follow immediately after the issue number.
- **Description**: A brief summary of what the commit does, preceded by a dash.
- **Ornamental Final Emoji**: A decorative element related to the content of the commit.

---

## Types of Commit and Corresponding Emojis

- ✨ - New features, equivalent to `feat`.
- 🐛 - Bug fixes, equivalent to `fix`.
- 📚 - Documentation, equivalent to `docs`.
- 🎨 - Style changes that do not affect the meaning of the code, equivalent to `style`.
- 🔨 - Code refactorizations, equivalent to `refactor`.
- 🚀 - Performance improvements, equivalent to `perf`.
- ✅ - Adding tests, equivalent to `test`.
- 🔧 - Configuration changes or minor tasks, equivalent to `chore`.

---

## Commit Body with Activity Details

Each commit **must include a detailed body** listing the main activities performed.
- Each activity should be written as a bullet point.
- Each bullet must **start with an emoji** to make the list visually clear and fun.

### Example of Commit Message

```
✨ [#12] - Implement new login feature 🚀

- 🗂️ Created `auth/` module structure
- 🔑 Added JWT authentication
- 🧪 Implemented unit tests for login flow
- 📚 Updated API documentation for login endpoint
```

---

## Traceability Tags (User Story & Requirements)

When a commit addresses a specific **user story** from the product backlog or covers **functional requirements**, include traceability tags in the commit body right after the subject line, before the activity list.

The traceability section must **copy the actual text** from the backlog and spec files — not just the IDs. This keeps the commit self-contained and avoids forcing the reader to look up references in other files.

**Language rule:** Always use the **English** version of the text (from `backlog.en.md` and `spec.en.md`). Commits are written in English.

- **Story:** `AP-NNN` followed by the full story text as it appears in the module's `backlog.en.md`.
- **Refs:** `RF-XX` followed by the requirement description as it appears in the module's `spec.en.md`.

These lines are **optional**. Include them when the commit directly addresses a backlog story or functional requirement. Omit them for pure chores, refactors, or infrastructure work with no direct requirement mapping.

### Where to find the text

1. **Story text** — Look in `doc/modules/<module>/<module>-backlog.en.md` for the story ID (e.g., `AP-002`) and copy the quoted description.
2. **Requirement text** — Look in the module's `<module>-spec.en.md` for the RF code and copy the requirement text.

### Example with Traceability

```
✨ [#016] - Implement Employee CRUD API 👤

Story: AP-002 · As an Admin, I want to create, list, view, update, and deactivate employees via API, to manage the workforce.
Refs: RF-01 · Register employees (general data)
      RF-02 · Role: Manager / Cook / Kitchen Assistant / Delivery Driver

- 🌐 Created 5 SAC controllers for Employee endpoints
- 📝 Added FormRequests with validation
- 🧪 Wrote feature tests for all CRUD operations
```

---

## Commit Examples

- ✨ [#12] ! - Implement new login feature 🚀
- 🔧 [#34] (config) - Update build script 🛠

---

## Reasons for Choosing Emojis

1. **Visual Improvement**: Emojis add a visual dimension that facilitates the quick understanding of the purpose of each commit.
2. **Simplification and Fun**: By integrating emojis, the process becomes not only more enjoyable but also more intuitive.
3. **Ornamental Element**: The second emoji is decorative and selected based on what has been accomplished in the commit, adding a personal and artistic touch to the records.
4. **Activity Detail**: The body of the commit serves as a micro-log of tasks, helping to track what was done in each step.

---

# Commit Template

When writing a commit, use this template:

```
:emoji [#issue] - short description :emoji

Story: AP-NNN · <full story text from backlog.en.md>
Refs: RF-XX · <requirement description from spec.en.md>

- :emoji Detailed activity 1
- :emoji Detailed activity 2
- :emoji Detailed activity 3
```

### Example

```
✨ [#23] - Initialize basic monorepo structure 🐳

- 📂 Created base repository
- 🗂️ Added initial folder structure
- ⚙️ Configured `.gitignore` and base settings
- 📚 Added documentation for project setup
```
