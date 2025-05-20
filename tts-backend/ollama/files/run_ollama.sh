#!/bin/bash
echo "Starting Ollama server..."
ollama serve &
echo "Ollama is ready, creating the model..."
ollama create test_model -f files/Modelfile
ollama run test_model
