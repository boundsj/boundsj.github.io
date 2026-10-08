.DEFAULT_GOAL := help

# ANSI color codes
CYAN := \033[0;36m
GREEN := \033[0;32m
YELLOW := \033[0;33m
MAGENTA := \033[0;35m
RESET := \033[0m
BOLD := \033[1m

.PHONY: help serve preview preview-stop check-private-hosts photo-poster

help: ## Show this help message
	@echo "$(BOLD)$(MAGENTA)bounds.dev$(RESET) - Available commands:\n"
	@echo "$(CYAN)Usage:$(RESET)"
	@echo "  make $(GREEN)<target>$(RESET)\n"
	@echo "$(CYAN)Targets:$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-15s$(RESET) %s\n", $$1, $$2}'
	@echo ""

serve: ## Build and serve the site with live reload
	@echo "$(YELLOW)Starting Hugo development server...$(RESET)"
	@hugo server -D --bind 0.0.0.0

PREVIEW_PATH := /bounds-preview
TS_NAME = $(shell tailscale status --json | jq -r '.Self.DNSName | rtrimstr(".")')

preview: ## Serve drafts on the LAN and on tailnet HTTPS (never Funnel)
	@tailscale serve --bg --https=443 --set-path $(PREVIEW_PATH) http://127.0.0.1:1313$(PREVIEW_PATH) >/dev/null
	@echo "$(GREEN)Tailnet:$(RESET) https://$(TS_NAME)$(PREVIEW_PATH)/"
	@echo "$(GREEN)LAN:$(RESET)     http://$$(ipconfig getifaddr en0 || ipconfig getifaddr en1):1313$(PREVIEW_PATH)/"
	@trap 'tailscale serve --https=443 --set-path $(PREVIEW_PATH) off >/dev/null' EXIT; \
		hugo server -D --bind 0.0.0.0 --baseURL https://$(TS_NAME)$(PREVIEW_PATH)/ --appendPort=false --disableLiveReload

preview-stop: ## Remove the tailnet preview path
	@tailscale serve --https=443 --set-path $(PREVIEW_PATH) off

check-private-hosts: ## Fail if tailnet names or IPs are in site sources
	@scripts/check-private-hosts.sh

PHOTO_POSTER_DIR := tools/photo-poster
PHOTO_VENV := $(PHOTO_POSTER_DIR)/.venv
PYTHON_BIN ?= python3

photo-poster: ## Run the photo poster tool on port 8000
	@lsof -ti:8000 | xargs kill -9 2>/dev/null || true
	@if [ ! -d "$(PHOTO_VENV)" ]; then $(PYTHON_BIN) -m venv "$(PHOTO_VENV)"; fi
	@PY=""; \
	for p in "$(PHOTO_VENV)/bin/python" "$(PHOTO_VENV)/bin/python3" "$(PHOTO_VENV)/bin/python3.11"; do \
		if [ -x "$$p" ]; then PY="$$p"; break; fi; \
	done; \
	if [ -z "$$PY" ]; then echo "Error: No python found in venv"; exit 1; fi; \
	PIP_DISABLE_PIP_VERSION_CHECK=1 "$$PY" -m pip install -q -r "$(PHOTO_POSTER_DIR)/requirements.txt"; \
	cd "$(PHOTO_POSTER_DIR)" && .venv/bin/python app.py
