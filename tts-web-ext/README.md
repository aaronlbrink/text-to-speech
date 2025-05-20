### Debug
Use `npm run dev` to target Chrome and `npm run dev:firefox`



### Build an unlisted xpi extension for firefox:
- `npm run build:firefox`. This outputs to `.output/firefox-mv2/` (if --mv3 is on, then `-mv3`)
- Generate a UUID using your favorite UUID generation method or if you have done this process already, copy the UUID from your add on at https://addons.mozilla.org/en-US/developers/addons
- Add the following to the top level (ie next to the "version" key) of the manifest found in `.output/firefox-mv3/manifest.json`:
```json
  "browser_specific_settings": {
    "gecko": {
      "id": "{your-uuid-here}"
    }
  },
```
- Consider updating version in package.json (this becomes the manifest version)
- Generate an API key/secret from Mozilla, https://addons.mozilla.org/en-US/developers/addon/api/key/
- Use this key and secret to run the following command (look up install instructions for web-ext if needed)
```sh
cd .output/firefox-mv3 && \
web-ext sign --api-key="your-key" --api-secret="your-secret" --channel="unlisted"
```
- If successful, you'll have a signed xpi in `.output/firefox-mv3/web-ext-artifacts/your-xpi-file.xpi` see your extension at https://addons.mozilla.org/en-US/developers/addons


### Create zip for Chrome webstore
Run `npm run wxt zip`