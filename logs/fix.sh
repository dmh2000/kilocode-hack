#!/bin/sh

python transform_prompt.py llm-prompt-raw.json >llm-prompt.json 
python json-to-md.py <llm-prompt.json >llm-prompt.md
# python json-to-xml.py <llm-prompt-fix.json >llm-prompt.xml

python transform_response.py llm-response-raw.json >llm-response.json 
python json-to-md.py  <llm-response.json >llm-response.md
# python json-to-xml.py  <llm-response-fix.json >llm-response.xml
 
