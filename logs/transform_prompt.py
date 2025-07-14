import json
import re
import sys


def transform_json_format(input_file):
    """
    Transforms the JSON data from input_file into the format required by llm-prompt-x.json.
    The input file is treated as a raw text string containing multiple concatenated JSON structures.
    Each parsed JSON structure (array or object) is then formatted as an array of objects
    within the 'prompts' array in the output. Outputs to stdout.
    """
    try:
        with open(input_file, "r") as f:
            content = f.read()
    except FileNotFoundError:
        print(f"Error: Input file '{input_file}' not found.")
        return
    except Exception as e:
        print(f"Error reading input file '{input_file}': {e}")
        return

    parsed_structures = []
    
    # Find JSON structures by parsing character by character, respecting string boundaries
    i = 0
    while i < len(content):
        # Skip whitespace
        while i < len(content) and content[i].isspace():
            i += 1
        
        if i >= len(content):
            break
            
        # Check if we're at the start of a JSON structure
        if content[i] in '[{':
            start_char = content[i]
            end_char = ']' if start_char == '[' else '}'
            
            # Find the matching closing bracket/brace
            bracket_count = 0
            in_string = False
            escape_next = False
            start_pos = i
            
            while i < len(content):
                char = content[i]
                
                if escape_next:
                    escape_next = False
                elif char == '\\' and in_string:
                    escape_next = True
                elif char == '"' and not escape_next:
                    in_string = not in_string
                elif not in_string:
                    if char == start_char:
                        bracket_count += 1
                    elif char == end_char:
                        bracket_count -= 1
                        if bracket_count == 0:
                            # Found complete JSON structure
                            json_str = content[start_pos:i+1]
                            try:
                                obj = json.loads(json_str)
                                parsed_structures.append(obj)
                            except json.JSONDecodeError:
                                print(f"Warning: Could not decode JSON object: {json_str[:100]}...")
                            break
                
                i += 1
        else:
            i += 1

    transformed_data = {"prompts": []}
    for item in parsed_structures:
        if isinstance(item, list):
            # If the item is already a list (e.g., [{"type": "text", ...}]), append it directly
            transformed_data["prompts"].append(item)
        else:
            # If the item is a single object (e.g., {"type": "text", ...}), wrap it in a list
            transformed_data["prompts"].append([item])

    print(json.dumps(transformed_data, indent=4))


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python transform_prompt.py <input_file>")
        sys.exit(1)

    input_file = sys.argv[1]
    transform_json_format(input_file)
