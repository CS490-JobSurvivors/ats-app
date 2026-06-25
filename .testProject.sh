#!/bin/bash
(cd backend/ && .venv/bin/uvicorn app.main:app --reload) & 
(cd frontend/ && npm run lint:fix && npm run build && npm start)
wait
