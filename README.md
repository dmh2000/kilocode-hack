# 🚀 A Snapshot of Kilo Code Modified For Testing.

- original at https://github.com/Kilo-Org/kilocode

I cloned and modified KiloCode to do some investigation of the message flow between the Agent (kilocode) and a couple of LLM's. This clone was made July 5, 2025 and is out of date with the parent.

**THIS IS NOT A VALID VERSION, DON'T USE THIS BEYOND LOOKING AT THE TESTING PERFORMED**

# Taking A Look At The LLM Messaging

KiloCode is a fork of [Roo Code](https://github.com/RooVetGit/Roo-Code) and [Cline](https://github.com/cline/cline). I used it here because I was using the KiloCode extension in my normal workflow.

I wanted to see an example of exactly what messages are going back and forth between an AI Agent and an LLM it is using. To do this I used KiloClode, because its open source and I could hack in some code to capture the data. I added hacks to the KiloCode source to capture the message data.

- I wanted to look at:
    - System Prompt from agent to LLM
    - User Prompts from agent to LLM
    - LLM Response from LLM to agent
    - Differences between two different model/provider. In this case, Anthropic claude 4 and Gemini 2.5 pro. I assumed there would be differences, but how different?

I cloned the [KiloCode source ](https://github.com/Kilo-Org/kilocode). After some digging, I found that I could grab the data in _src/core/task/Task.tstask/Task.ts_. That file seems to be where the top level messaging happens. I added code to write to three files, one for system prompt, one for user prompts and one for the LLM responses.

## Added Hacks

The only changes to the original source are in src/core/task/Task.ts.

```ts
// LOG FILES
const llm_prompt = "/home/dmh2000/projects/kilocode/logs/llm-prompt-raw.json"
const llm_response = "/home/dmh2000/projects/kilocode/logs/llm-response-raw.json"
const llm_system = "/home/dmh2000/projects/kilocode/logs/llm-system.md"

...
    // LOG LLM RESPONSE
    fs.appendFileSync(llm_response, JSON.stringify(chunk))
...
		// LOG SYSTEM PROMPT
		fs.appendFileSync(llm_system,systemPrompt)
...
		// LOG USER PROMPT MESSAGES
		for (const message of cleanConversationHistory) {
			if (message.content) {
				fs.appendFileSync(llm_prompt, message.content.text)
			}
		}
```

## Testing

Because KiloCode is a VSCode extention, it has the builtin configuration for debugging an exention. To debug it, just hit F5 or 'Start Debugging'. This will spawn an instance of VSCode with the extension active. Once its up and running, select the KiloCode icon in the explorer and give it a prompt. The added code will capture the messaging and store it in the 'logs' directory.

For the tests recorded in this repo, I used a simple prompt to modify a simple python program.

- first, "npm install"
- Start Debugging or F5
- Open KiloCode settings
    - set model and API Key
    - save and done
- At the KiloCode text UI, add a prompt and execute it. You can try it with any prompt you want to check out.
    - the messaging will be recorded in the logs/llm-system.md, logs/llm-prompts-raw.json and logs/llm-response-raw.json files.
- To process the raw output, run the logs/fix.sh script (or if not on linux, just enter the same commands by hand)
    - once you run this, the intermediate JSON will be in
    - intermediate JSON
        - llm-prompts.json
        - llm-response.json
    - final output
        - llm-prompts.md
        - llm-response.md
        - llm-system.md

### Test Data

**logs/prompt.md**

```markdown
@/src/hello.py modify src/hello.py to have a main function and a function named "greeting". the main function will pass a string to the greeting function and the greeting function will print the string.
```

**logs/hello.py**

```python
print("Hello, World")
```

## Message Details

- KiloCode source is TypeScript
- All the hacks I added are in Task.ts. See them above.

- System Prompt
    - dynamically generated on every request (but doesn't change during the conversation)
    - tailored to the functionality of the provider and model
    - the system prompt is formatted as Markdown already so it is captured as-is
    - large : ~1450 lines
- User Prompts
    - The prompt message text at this point is a JSON string embedded in an object
    - The JSON wrapping is due to the API used by the model
    - The entire JSON string is appended to the log file "llm-prompt-raw.json"
- LLM Response

    - The LLM responses are chunks, each chunk might be only a part of a message
    - The response message at this point is in JSON, like the prompts
    - The JSON wrapping is due to the API used by the model
    - The entire JSON string is appended to the log file "llm-response-raw.json"

### Post Processing To extract the raw message data

- The captured data is written to the top level 'logs' directory.
- For both the prompt and responses:
    - Because the output prompts and input responses are wrapped in complete json strings, when they are appended together the result is not valid json (no main key, no commas in the right place)
    - The 'raw' files are post processed by a Python script, _transform_prompt.py_ and _transform_response_ to combine the individual JSON strings in a valid master JSON files
    - After the valid JSON files are constructed, they are further processed by another Python script, _json-to-md.py_ which extracts the actual message text and concatenates it into files, _llm-prompt.md_ and \*llm-response.md".
- It turns out that the raw communication between the agent and LLM. in both directions, is formatted as Markdown. I did not see any directives in the system prompt to tell it to output markdown. Maybe since the prompts are in markdown, the LLM sees that and outputs markdown.
- The post processing is done in the 'logs' directory. There is a script, "fix.sh" that invokes the various transforms from raw to .md.

## Results

I ran the tests twice, once with claude-4-sonnet (logs/anthropic) and gemini-2.5-pro (logs/Gemini).

### System Prompt

The system prompts KiloCode generated for claude and Gemini are almost identical. The system prompt for claude had added directives for computer use.

Besides the typical system prompt rules and conventions, I saw that most of the system prompt as about the tools that the LLM can ask the Agent to execute. It first defined the conventions for using tools, included specifying the XML format the LLM should use to have the agent run a tool. Then it covered the built in tools

The System prompt was roughly organized as follows. You can inspect one of the test versions in directory anthropic or Gemini.

1. Introduction (who are you)
2. Tools

- defined the conventions the LLM should use for tools. In this case simple XML snippets
- defined the available built in tools. For those tools it defined the invocation but also extensive examples of how they should be used
- defined available MCP servers. In this case I had one MCP installed, 'sqirvy-mcp', which is a simple MCP server I put together that has a single tool 'online' that pings a network address.

3. Modes

- a list of modes, such as code, architect, debug ...

4. Rules

- a comprehensive list of rules the LLM should follow

5. System Information
6. Objective
7. User Custom Instructions

### Prompts

The prompts the agent sends are massaged by the KiloCode agent. It doesn't just send what is entered by the user. The prompt messages (compiled by the agent) were very similar between the Anthropic and Gemini versions. Again the communication was text and XML snippets.

- Anthropic prompt had a section for <thinking> where it gave the LLM a short conversation about how to proceed. Apparently KiloCode didn't think that Gemini needed that.

- The prompts The incremental context, including what the LLM generated. All that is fed back
-
