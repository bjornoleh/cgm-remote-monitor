Overview:
This branch is for transitioning to using a SvelteKit frontend, while still maintaining the existing Express backend. The SvelteKit frontend is built with Svelte 5, which means we use runes, and never stores. We are using ShadCN components, and Tailwind v4 css classes, alongside the LayerChart library for charts. Our database is MongoDB.

Instructions for writing code:
- When generating code, you must never add comments that are not related to the code itself; do not make comments about any assumptions, or postmark changes with comments that merely explain the changes you make. The comments should document the code, not the changes.
- Do not use mock data, and do not repeat yourself; the goal is to build a production-ready and maintainable code base, which means we must adhere to excellent code quality standards. This is, of course, hampered by the fact that we are integrating with a non-typed Express backend, but we can iteratively improve upon it by adding types.
- When we add types to the backend, they should be in JSDoc format, but on the frontend, we will be using Typescript.
- It is absolutely critical that you reuse existing interfaces and consider whether you can