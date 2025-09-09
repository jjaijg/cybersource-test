const express = require("express");
const cors = require("cors");
const axios = require("axios");
const crypto = require("crypto");

const app = express();
app.use(cors());
app.use(express.json());

// Load your merchant config
const configObject = {};

app.get("/api/generateKey", async (req, res) => {
  try {
    const resource = "/flex/v1/keys";
    const host = "apitest.cybersource.com";
    const method = "POST";
    const merchantId = configObject.merchantID;
    const keyId = configObject.merchantKeyId;
    const secretKey = configObject.merchantsecretKey;
    const payload = {
      encryptionType: "RsaOaep",
      targetOrigin: "http://localhost:3000",
    };
    const payloadString = JSON.stringify(payload);
    const digest =
      "SHA-256=" +
      crypto.createHash("sha256").update(payloadString).digest("base64");
    const date = new Date().toUTCString();

    // Construct the signature string
    const signatureString =
      `host: ${host}\n` +
      `date: ${date}\n` +
      `(request-target): ${method.toLowerCase()} ${resource}\n` +
      `digest: ${digest}\n` +
      `v-c-merchant-id: ${merchantId}`;

    // Sign the string
    const signature = crypto
      .createHmac("sha256", Buffer.from(secretKey, "base64"))
      .update(signatureString)
      .digest("base64");

    // Build the Signature header
    const signatureHeader = `keyid="${keyId}",algorithm="HmacSHA256",headers="host date (request-target) digest v-c-merchant-id",signature="${signature}"`;

    // Set headers
    const headers = {
      "Content-Type": "application/json",
      "v-c-merchant-id": merchantId,
      Date: date,
      Host: host,
      Digest: digest,
      Signature: signatureHeader,
    };

    // Make the request
    const response = await axios.post(`https://${host}${resource}`, payload, {
      headers,
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

app.post("/api/createMicroformSession", async (req, res) => {
  try {
    const resource = "/microform/v2/sessions";
    const host = "apitest.cybersource.com";
    const method = "POST";
    const merchantId = configObject.merchantID;
    const keyId = configObject.merchantKeyId;
    const secretKey = configObject.merchantsecretKey;

    // Adjust targetOrigins as needed for your app
    const payload = {
      targetOrigins: ["http://localhost:3000"],
      allowedCardNetworks: ["VISA", "MASTERCARD", "AMEX", "DISCOVER"],
    };
    const payloadString = JSON.stringify(payload);
    const digest =
      "SHA-256=" +
      crypto.createHash("sha256").update(payloadString).digest("base64");
    const date = new Date().toUTCString();

    // Construct the signature string
    const signatureString =
      `host: ${host}\n` +
      `date: ${date}\n` +
      `(request-target): ${method.toLowerCase()} ${resource}\n` +
      `digest: ${digest}\n` +
      `v-c-merchant-id: ${merchantId}`;

    // Sign the string
    const signature = crypto
      .createHmac("sha256", Buffer.from(secretKey, "base64"))
      .update(signatureString)
      .digest("base64");

    // Build the Signature header
    const signatureHeader = `keyid="${keyId}",algorithm="HmacSHA256",headers="host date (request-target) digest v-c-merchant-id",signature="${signature}"`;

    // Set headers
    const headers = {
      "Content-Type": "application/json",
      "v-c-merchant-id": merchantId,
      Date: date,
      Host: host,
      Digest: digest,
      Signature: signatureHeader,
    };

    // Make the request to Cybersource
    const response = await axios.post(`https://${host}${resource}`, payload, {
      headers,
    });
    // Return the JWT (capture context) to the frontend
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

// Example endpoint to process payment with token
app.post("/api/processPayment", (req, res) => {
  const { token, amount } = req.body;
  console.log("Received tokenized card:", token);

  // Here you’d call Cybersource Payments API with the token
  // Skipping real payment for demo
  res.json({ success: true, message: "Payment processed (simulated)" });
});

app.listen(5000, () => console.log("Server running on http://localhost:5000"));
