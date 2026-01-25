.DEFAULT_GOAL := help

# ANSI color codes
CYAN := \033[0;36m
GREEN := \033[0;32m
YELLOW := \033[0;33m
MAGENTA := \033[0;35m
RESET := \033[0m
BOLD := \033[1m

.PHONY: help serve photo-poster

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
