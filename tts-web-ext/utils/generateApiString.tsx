export function generateApiString(host: string, apiVersion: string) {
  if (!/^https?:\/\//.test(host)) {
    host = "https://" + host
  }
  return `${host}/tta/${apiVersion}`.replace(/([^:])(\/\/+)/g, '$1/');
}