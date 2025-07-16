#!/usr/bin/env python3
import json
import sys


def extract_text_fields(obj, text_parts=None):
    """
    extract all 'text' field values from a JSON object or array.

    Args:
        obj: The JSON dictionary to search
        text_parts: List to accumulate text values (used for recursion)

    Returns:
        List of text values found
    """
    if text_parts is None:
        text_parts = []

    messages = obj["messages"]
    for msglist in messages:
        for msg in msglist:
            src = ""
            time = ""
            type = ""
            content = ""

            if "source" in msg:
                src = msg["source"]
            if "timestamp" in msg:
                time = msg["timestamp"]
            if "type" in msg:
                type = msg["type"]

            if type == "text":
                content = msg["text"]
            elif type == "usage":
                if "inputTokens" in msg:
                    content += f"input tokens = {msg["inputTokens"]}\n"
                if "outputTokens" in msg:
                    content += f"outputtokens = {msg["outputTokens"]}\n"
                if "totalCost" in msg:
                    content += f"total_cost = {msg["totalCost"]}"
            elif type == "reasoning":
                content = msg["text"]
            else:
                comma = ""
                for key in msg:
                    content += f"{comma}{msg[key]}"
                    comma = ","

            text_parts.append(f"### source={src} type={type} timestamp={time}\n")
            text_parts.append(f"```markdown\n")
            text_parts.append(content)
            text_parts.append(f"```\n")

    return text_parts


def main():
    """
    Read JSON from stdin, extract all 'text' fields, concatenate and output to stdout.
    """
    try:
        # Read JSON from stdin
        input_data = sys.stdin.read()
        if not input_data.strip():
            print("Error: No input provided", file=sys.stderr)
            sys.exit(1)

        # Parse JSON
        json_data = json.loads(input_data)

        # Extract all text fields
        text_parts = extract_text_fields(json_data)

        # Concatenate and output
        if text_parts:
            concatenated_text = "\n".join(text_parts)
            print(concatenated_text)
        else:
            print("No 'text' fields found in the JSON input", file=sys.stderr)
            sys.exit(1)

    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON input - {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
