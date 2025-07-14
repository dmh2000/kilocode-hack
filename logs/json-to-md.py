#!/usr/bin/env python3
import json
import sys


def extract_text_fields(obj, text_parts=None):
    """
    Recursively extract all 'text' field values from a JSON object or array.
    
    Args:
        obj: The JSON object/array to search
        text_parts: List to accumulate text values (used for recursion)
    
    Returns:
        List of text values found
    """
    if text_parts is None:
        text_parts = []
    
    if isinstance(obj, dict):
        # If this dict has a 'text' field, add its value
        if 'text' in obj:
            text_parts.append(str(obj['text']))
        
        # Recursively search all values in the dict
        for value in obj.values():
            extract_text_fields(value, text_parts)
    
    elif isinstance(obj, list):
        # Recursively search all items in the list
        for item in obj:
            extract_text_fields(item, text_parts)
    
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
            concatenated_text = '\n'.join(text_parts)
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
