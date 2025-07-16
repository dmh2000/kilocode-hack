#!/bin/sh

python transform_msg.py llm-messages-raw.json >llm-messages.json 
python json-to-md.py <llm-messages.json >llm-messages.md

 
