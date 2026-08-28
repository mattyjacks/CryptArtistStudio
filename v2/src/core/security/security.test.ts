import {
  encryptSecret,
  decryptSecret,
  sanitizeObjectKeys,
  safeJSONParse,
  sanitizeHTML,
  isSafeExternalURL,
  validateModelId,
  maskSecret,
  sanitizeProjectForExport,
} from "./security";

export async function runSecurityTestSuite(): Promise<{ passed: boolean; report: string[] }> {
  const report: string[] = [];
  let allPassed = true;

  const assert = (condition: boolean, testName: string) => {
    if (condition) {
      report.push(`✅ PASS: ${testName}`);
    } else {
      report.push(`❌ FAIL: ${testName}`);
      allPassed = false;
    }
  };

  // 1. Test AES-GCM encryption & decryption
  const secret = "sk-proj-super-secret-api-key-123456789";
  const encrypted = await encryptSecret(secret);
  assert(encrypted.startsWith("enc_v2:") && encrypted !== secret, "AES-GCM Secret is encrypted with cipher prefix");
  const decrypted = await decryptSecret(encrypted);
  assert(decrypted === secret, "AES-GCM Secret decodes back to original plaintext");

  // 2. Test Prototype Pollution Defense
  const pollutedJSON = '{"__proto__": {"isAdmin": true}, "constructor": {"evil": true}, "validKey": "safeValue"}';
  const cleanObj = safeJSONParse<any>(pollutedJSON, {});
  assert(cleanObj.__proto__ === Object.prototype && cleanObj.validKey === "safeValue", "Prototype pollution keys stripped");
  assert((({} as any).isAdmin) === undefined, "Global Object prototype not polluted");

  // 3. Test XSS Sanitization
  const maliciousHTML = '<script>alert("XSS")</script><img src=x onerror=alert(1)><b>Safe text</b>';
  const cleanHTML = sanitizeHTML(maliciousHTML);
  assert(!cleanHTML.includes("<script>") && !cleanHTML.includes("onerror"), "XSS scripts and onerror handlers stripped");
  assert(cleanHTML.includes("Safe text"), "Safe markup preserved");

  // 4. Test SSRF and URL validation
  assert(!isSafeExternalURL("http://127.0.0.1/secret"), "Blocks loopback 127.0.0.1 SSRF");
  assert(!isSafeExternalURL("http://169.254.169.254/latest/meta-data"), "Blocks AWS metadata 169.254.169.254 SSRF");
  assert(!isSafeExternalURL("http://192.168.1.1/admin"), "Blocks private network 192.168.x.x SSRF");
  assert(isSafeExternalURL("https://drive.google.com/file/d/xyz"), "Allows safe HTTPS Google Drive URL");

  // 5. Test Model ID validation
  assert(validateModelId("openai/gpt-4o-mini"), "Valid model ID accepted");
  assert(!validateModelId("gpt-4; rm -rf /"), "Malicious shell injection model ID rejected");

  // 6. Test Secret Masking
  assert(maskSecret("sk-1234567890abcdef") === "sk-1...cdef", "Secret correctly masked for logs");

  // 7. Test Project Export Sanitization
  const dummyProject = {
    $cryptart: 1,
    name: "My Video",
    data: {
      tracks: [],
      openaiKey: "sk-should-be-deleted",
      vaultPassword: "secret-password",
    },
  };
  const sanitizedExport = sanitizeProjectForExport(dummyProject);
  assert(sanitizedExport.data.openaiKey === undefined && sanitizedExport.data.vaultPassword === undefined, "API keys and passwords stripped from .cryptart exports");

  return { passed: allPassed, report };
}
