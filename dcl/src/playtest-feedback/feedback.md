# Initial feedback

These are my initial impressions before running the module in the scene.

## Are the instructions clear?

Not really. I understand the goal: an in-scene playtest feedback module for Creator Studios. It looks like a drop-in library with a coin-hint demo. Studios copy two folders, edit one questions file, and get responses as a CSV in World scene storage.

What is missing is a clear installation path. The commit summary does not explain how this should be added to an existing project, including which folders to copy, where they should live, which imports or bootstrapping changes are needed, or any required scene configuration.

## Is it easy to import into the scene?

My first reaction to the suggested approach of copying the whole folder was concern. The module has its own `lib` directory split into `client`, `server`, and `shared`, which is close to this scene's existing auth-server structure. Before trying it, I was unsure whether it would live alongside the scene safely or risk overlapping with or overwriting existing code.

After installing it, that concern appears to have been unfounded. The module's separate client, server, and shared folders can run alongside this scene's main auth-server structure without interfering. That is useful to know and makes the approach feel much safer in practice.

The instructions should still state this explicitly and call out the expected integration points. A short, project-safe installation guide would make that clear up front.

There seems to be an assumption that studios will point an AI agent at the module to do the integration. That can work, but the module should still provide enough direct guidance that a developer can understand the intended layout and validate what the agent changes.

For this scene, I asked an agent to integrate it separately from the main codebase and gave it one extra product requirement: do not show the feedback immediately, but wait until existing startup UI has cleared. It appears to have honoured that requirement. This is a good sign for adaptability, but is not a substitute for documented installation steps.

## What should happen next?

Once the module is installed and running, the next step seems to be configuring useful questions for the playtest. I can infer some of the available capabilities from the "How to Test" section, but a short end-to-end outline would help:

1. Install the module.
2. Choose when the intro and question flow should trigger.
3. Configure questions for the specific playtest.
4. Test locally.
5. Deploy to a World.
6. Retrieve and review the CSV from World scene storage.

I am going to ask an agent to help configure questions for this bowling scene. A few practical examples of question sets, and guidance on choosing questions for common playtest goals, would make this stage easier.

## Did we get data in Storage?

Not tested yet. This needs confirming after the module has been run in a deployed World and a response has been submitted. I will add the result here after the playtest.

## Suggested documentation additions

- Exact copy/install steps for an existing SDK7 project.
- A file list explaining what is safe to copy and what must be wired into the scene entry point.
- Confirmation that the module's `client`, `server`, and `shared` folders can coexist with a scene using the auth server. This has now worked in this scene.
- Required World/Storage setup, where the CSV is written, and how to retrieve it.
- A minimal example plus guidance for delaying or triggering the prompt from a scene event.
- A clear end-to-end outline, including question configuration after installation.
- Example question sets for common playtest goals.
