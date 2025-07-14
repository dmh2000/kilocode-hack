# Taking A Look At The LLM Messaging

I wanted to see an example of exactly what messages are going back and forth between an AI Agent and an LLM it is using. To do this feasably I used KiloClode, because its open source and I could hack in some code to capture the data. I added hacks to the KiloCode source to capture the message data.

I wanted to look at:

- System Prompt from agent to LLM
- User Prompts from agent to LLM
- LLM Response from LLM to agent
- Differences between two different model/provider. In this case, Anthropic claude 4 and Gemini 2.5 pro. I assumed there would be differences, but how different?

I cloned the [KiloCode source ](). After some digging, I found that I could grab the data in _src/core/task/Task.tstask/Task.ts_. That file seems to be where the top level messaging happens. I added code to write to three files, one for system prompt, one for user prompts and one for the LLM responses.

## Added Hacks

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

## Initial Results

- KiloCode source is TypeScript
- All the hacks I added are in Task.ts.

- System Prompt
    - dynamically generated on every request (but doesn't change during the conversation)
    - tailored to the functionality of the provider and model
    - the system prompt is formatted as Markdown
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
- It turns out that the raw communication between the agent and LLM. in both directions, isformatted as Markdown. I did not see any directives in the system prompt to tell it to output markdown. Maybe since the prompts are in markdown, the LLM sees that and outputs markdown.
- The post processing is done in the 'logs' directory. There is a script, "fix.sh" that invokes the various transforms from raw to .md.

## Results

The next step was to run tests on two different models. Since KiloCode
