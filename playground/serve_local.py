"""
Local dev server for PyVax Playground.
Serves API at /api/cli and static files from /public.

Usage: python serve_local.py
Then open http://localhost:8080
"""

import http.server
import json
import os
import sys
import importlib

PORT = 8080
API_DIR = os.path.join(os.path.dirname(__file__), "api")
PUBLIC_DIR = os.path.join(os.path.dirname(__file__), "public")


class PlaygroundHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        if self.path == "/api/cli":
            self._handle_api()
        else:
            self.send_response(404)
            self.end_headers()

    def do_GET(self):
        if self.path == "/api/cli":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "ok",
                "service": "pyvax-playground-local",
                "version": "1.0.0",
            }).encode())
            return

        # Serve static files
        if self.path == "/" or self.path == "":
            self.path = "/index.html"
        super().do_GET()

    def _handle_api(self):
        # Import CLI handler dynamically
        sys.path.insert(0, API_DIR)

        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8")
            request = json.loads(body) if body else {}
        except Exception as e:
            self._json_response(400, {"success": False, "error": str(e)})
            return

        # Import the actual handler functions
        try:
            # Force reimport to pick up changes
            if "cli" in sys.modules:
                importlib.reload(sys.modules["cli"])
            import cli as cli_module

            command = request.get("command", "").strip()
            source_code = request.get("source", "")
            contract_name = request.get("contract_name", "Contract")

            if not command:
                self._json_response(400, {"success": False, "error": "No command"})
                return

            action, kwargs, positional = cli_module.parse_command(command)

            if action == "new":
                name = positional[0] if positional else "MyProject"
                template = kwargs.get("template") or kwargs.get("t")
                result = cli_module.execute_new(name, template)

            elif action == "compile":
                if not source_code:
                    self._json_response(400, {"success": False, "error": "No source code"})
                    return
                opt = int(kwargs.get("optimizer", kwargs.get("opt", 1)))
                overflow = kwargs.get("no_overflow_safe") is None
                name = positional[0] if positional else contract_name
                result = cli_module.execute_compile(source_code, name, opt, overflow)

            elif action == "test":
                if not source_code:
                    self._json_response(400, {"success": False, "error": "No source code"})
                    return
                name = positional[0] if positional else contract_name
                result = cli_module.execute_test(source_code, name)

            elif action == "deploy":
                if not source_code:
                    self._json_response(400, {"success": False, "error": "No source code"})
                    return
                name = positional[0] if positional else contract_name
                chain = kwargs.get("chain", kwargs.get("n", "fuji"))
                result = cli_module.execute_deploy_dry_run(source_code, name, chain)

            elif action == "version":
                result = {
                    "success": True, "command": "version",
                    "stdout": "PyVax CLI v1.0.0\nPython to EVM transpiler\n"
                }

            elif action == "help":
                result = {
                    "success": True, "command": "help",
                    "stdout": (
                        "PyVax v1.0.0 — Python to EVM Transpiler\n\n"
                        "Commands:\n"
                        "  pyvax new <name>          Scaffold a new project\n"
                        "  pyvax compile [contract]  Transpile Python → EVM bytecode\n"
                        "  pyvax test [contract]     Run compilation tests\n"
                        "  pyvax deploy <name>       Deploy to Avalanche (dry-run)\n"
                        "  pyvax version             Show version info\n\n"
                    ),
                }

            elif action == "templates":
                result = {
                    "success": True, "command": "templates",
                    "templates": list(cli_module.TEMPLATES.keys()),
                    "stdout": "Templates: " + ", ".join(cli_module.TEMPLATES.keys()) + "\n",
                }

            else:
                result = {"success": False, "error": f"Unknown command: {action}"}

            self._json_response(200, result)

        except Exception as e:
            import traceback
            self._json_response(500, {
                "success": False,
                "error": str(e),
                "traceback": traceback.format_exc(),
            })

    def _json_response(self, code, data):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data, default=str).encode())

    def log_message(self, format, *args):
        # Colorized logging
        status = args[1] if len(args) > 1 else ""
        method_path = args[0] if args else ""
        if "200" in str(status):
            print(f"  \033[32m{status}\033[0m {method_path}")
        elif "404" in str(status) or "500" in str(status):
            print(f"  \033[31m{status}\033[0m {method_path}")
        else:
            print(f"  {status} {method_path}")


if __name__ == "__main__":
    server = http.server.HTTPServer(("0.0.0.0", PORT), PlaygroundHandler)
    print(f"\n  🐍 PyVax Playground running at http://localhost:{PORT}")
    print(f"  📂 Static: {PUBLIC_DIR}")
    print(f"  🔌 API:    /api/cli\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n\nShutting down...")
        server.shutdown()
