.PHONY: photo-poster

PHOTO_POSTER_DIR := tools/photo-poster
PHOTO_VENV := $(PHOTO_POSTER_DIR)/.venv
PYTHON_BIN ?= python3

photo-poster:
	@lsof -ti:8000 | xargs kill -9 2>/dev/null || true
	@if [ ! -d "$(PHOTO_VENV)" ]; then $(PYTHON_BIN) -m venv "$(PHOTO_VENV)"; fi
	@PY=""; \
	for p in "$(PHOTO_VENV)/bin/python" "$(PHOTO_VENV)/bin/python3" "$(PHOTO_VENV)/bin/python3.11"; do \
		if [ -x "$$p" ]; then PY="$$p"; break; fi; \
	done; \
	if [ -z "$$PY" ]; then echo "Error: No python found in venv"; exit 1; fi; \
	PIP_DISABLE_PIP_VERSION_CHECK=1 "$$PY" -m pip install -q -r "$(PHOTO_POSTER_DIR)/requirements.txt"; \
	cd "$(PHOTO_POSTER_DIR)" && .venv/bin/python app.py
