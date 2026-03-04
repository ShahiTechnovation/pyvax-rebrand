#!/usr/bin/env python3
"""API wrapper for the Zerothan transpiler."""

import sys
import json
from .transpiler import transpile_python_contract

def main():
    # Read input from stdin
    input_data = sys.stdin.read()
    request = json.loads(input_data)
    
    code = request.get('code', '')
    
    if not code:
        result = {
            'success': False,
            'errors': ['No code provided']
        }
    else:
        try:
            # Use the existing transpiler
            result = transpile_python_contract(code)
        except Exception as e:
            result = {
                'success': False,
                'errors': [str(e)]
            }
    
    # Output result as JSON
    print(json.dumps(result))

if __name__ == '__main__':
    main()
