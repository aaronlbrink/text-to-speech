## TTS

**Project goals**
- Stream article audio to browser from a TTS model
- Use an LLM to clean up the article. Remove content that doesn't flow with the main content (captions, footers)
- Use an LLM to annotate the article, allowing titles, blockquotes, and paragraphs to have pauses and emphasis

### TTS Web Extension
**Features**
- Convert your article to audio
- Streaming audio for speed

### Conversion API
- Uses a deep learning model to convert audio
- Queues audio conversion tasks using Celery
- Depends on Torch, Flask, gunicorn, redis

### Node Server
- Uses Server Sent Events to stream audio
- Polls conversion API

### TTS Website
- Currently just the starter Deno Fresh template.