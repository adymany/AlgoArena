.PHONY: install install-backend install-frontend

## Install all project dependencies (backend + frontend).
## For the backend, activate your virtual environment first:
##   python3 -m venv venv && source venv/bin/activate
install: install-backend install-frontend

## Install Python dependencies for the backend
install-backend:
	pip install -r backend/requirements.txt

## Install npm dependencies for the frontend
install-frontend:
	cd frontend-next && npm install
