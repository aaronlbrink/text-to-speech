# 

## Debugging server sent events (SSE)
- Check your NGINX config and ensure the reverse proxy includes the following: `proxy_buffering off`. If this is not included, events will only be sent when res.end() is called.