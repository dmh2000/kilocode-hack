import json
import re
import sys


def transform_response_format(input_file):
    """
    Transforms the JSON data from input_file into the format required by llm-response-x.json.
    The input file is treated as a raw text string containing multiple concatenated JSON objects.
    Each parsed JSON object becomes an element within the 'response' array in the output.
    Outputs to stdout.
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

    parsed_objects = []
    
    # Find JSON objects by parsing character by character, respecting string boundaries
    i = 0
    while i < len(content):
        # Skip whitespace
        while i < len(content) and content[i].isspace():
            i += 1
        
        if i >= len(content):
            break
            
        # Check if we're at the start of a JSON object
        if content[i] == '{':
            # Find the matching closing brace
            brace_count = 0
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
                    if char == '{':
                        brace_count += 1
                    elif char == '}':
                        brace_count -= 1
                        if brace_count == 0:
                            # Found complete JSON object
                            json_str = content[start_pos:i+1]
                            try:
                                obj = json.loads(json_str)
                                parsed_objects.append(obj)
                            except json.JSONDecodeError:
                                print(f"Warning: Could not decode JSON object: {json_str[:100]}...")
                            break
                
                i += 1
        else:
            i += 1

    transformed_data = {"response": parsed_objects}

    print(json.dumps(transformed_data, indent=4))


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python transform_response.py <input_file>")
        sys.exit(1)

    input_file = sys.argv[1]
    transform_response_format(input_file)
