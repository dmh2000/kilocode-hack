#!/usr/bin/env python3
import json
import sys


def extract_text_fields(data):
    """Recursively extract all 'text' field values from JSON data."""
    text_values = []

    if isinstance(data, dict):
        for key, value in data.items():
            if key == "text":
                text_values.append(str(value))
            else:
                text_values.extend(extract_text_fields(value))
    elif isinstance(data, list):
        for item in data:
            text_values.extend(extract_text_fields(item))

    return text_values


def main():
    try:
        data = json.load(sys.stdin)
        text_values = extract_text_fields(data)

        if text_values:
            print("\n".join(text_values))

    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON from stdin: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    print("<text>")
    main()
    print("</text>")
