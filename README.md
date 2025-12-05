# Structify: a Structured Prompt Experiment

Structify is a structured prompt app built on [`assistant-ui`](https://github.com/Yonom/assistant-ui) and the Vercel AI SDK. A course project for CSE593.

## Local Development

> Requires Node.js ≥ 18.

1. Change into the project directory and install dependencies (first run only).

```console
npm install
```

2. Configure your Gemini key by creating `.env.local` in the project root. You can find an example in `.env.example`.

```
GOOGLE_GENERATIVE_AI_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

3. Start the dev server.

```console
npm run dev
```

Then open `http://localhost:3000` in your browser.

4. To start in production, run

```console
npm run start
```

## Features

The `data/` folder contains configuration and instruction files used throughout the application:

- `prompt-prefix.json`: Prefix text prepended to structured prompts when generating final prompts.
- `final-instruction.json`: Final instruction text appended to structured prompts.
- `suggest-instruction.json`: Instruction text used by the suggest API endpoint for improving prompt cards.
- `summarize-instruction.json`: Instruction text used by the summarize API endpoint for refining prompt cards.
- `example.json`: Example preset prompts loaded into the structured prompts panel when required to.
- `cinematic.json`: Predefined conversation rounds that can be triggered by the user.
- `user-study-system-prompt.json`: System prompt used in chat mode for the HCI user study.
