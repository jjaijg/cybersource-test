import { useEffect, useRef, useState } from "react";
import { jwtDecode } from "jwt-decode";
import "./PaymentForm.css";

const customStyles = {
  input: {
    "font-size": "16px",
    color: "#3A3A3A",
  },
  "::placeholder": {
    color: "blue",
  },
  ":focus": {
    color: "blue",
  },
  ":hover": {
    "font-style": "italic",
  },
  ":disabled": {
    cursor: "not-allowed",
  },
  valid: {
    color: "green",
  },
  invalid: {
    color: "red",
  },
};

export default function PaymentForm() {
  const [captureContext, setCaptureContext] = useState("");
  const [clientLibrary, setClientLibrary] = useState("");
  const [clientLibraryIntegrity, setClientLibraryIntegrity] = useState("");
  const [microform, setMicroform] = useState(null);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    number: "",
    cvv: "",
    expirationMonth: "",
    expirationYear: "",
    amount: "",
  });
  const numberRef = useRef(null);
  const cvvRef = useRef(null);

  // 1. Get capture context (JWT) from backend and decode it
  useEffect(() => {
    fetch("http://localhost:5000/api/createMicroformSession", {
      method: "POST",
    })
      .then((res) => res.json())
      .then((data) => {
        setCaptureContext(data);
        const decoded = jwtDecode(data);
        console.log({ decoded });
        const ctx = decoded.ctx?.find((c) => c.type === "mf-1.0.0");
        setClientLibrary(ctx?.data?.clientLibrary);
        setClientLibraryIntegrity(ctx?.data?.clientLibraryIntegrity); // May be undefined
      })
      .catch((err) => alert("Failed to get session: " + err.message));
  }, []);

  // 2. Dynamically load the Microform script
  useEffect(() => {
    if (!clientLibrary) return;
    if (window.Flex) {
      setLoading(false);
      return;
    }

    const script = document.createElement("script");
    script.src = clientLibrary;
    if (clientLibraryIntegrity) {
      script.integrity = clientLibraryIntegrity;
      script.crossOrigin = "anonymous";
    }
    script.onload = () => setLoading(false);
    script.onerror = () => alert("Failed to load Microform script");
    console.log(script);
    document.body.appendChild(script);
  }, [clientLibrary, clientLibraryIntegrity]);

  // 3. Initialize Microform when script is loaded
  useEffect(() => {
    if (loading || !window.Flex || !captureContext) return;
    const flex = new window.Flex(captureContext);
    const mf = flex.microform({ styles: customStyles });
    setMicroform(mf);

    const numberField = mf.createField("number", {
      placeholder: "Card Number",
    });
    numberField.load(numberRef.current);

    const cvvField = mf.createField("securityCode", { placeholder: "CVV" });
    cvvField.load(cvvRef.current);
  }, [loading, captureContext]);

  const handlChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!microform) {
      alert("Microform not initialized");
      return;
    }
    setLoading(true);
    microform.createToken(
      {
        expirationMonth: data.expirationMonth,
        expirationYear: data.expirationYear,
      },
      (err, response) => {
        setLoading(false);
        if (err) {
          alert("Error creating token: " + err.message);
          return;
        }
        console.log("Received token:", response);
        // Send token and amount to backend to process payment
        fetch("http://localhost:5000/api/processPayment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: response.token,
            amount: data.amount,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            alert("Payment successful: " + JSON.stringify(data));
          })
          .catch((err) => alert("Payment failed: " + err.message));
      }
    );
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Card Number</label>
          <div
            ref={numberRef}
            style={{ border: "1px solid #ccc", padding: 8 }}
          />
        </div>
        <div>
          <label>CVV</label>
          <div ref={cvvRef} style={{ border: "1px solid #ccc", padding: 8 }} />
        </div>
        <div>
          <label>Expiration Month</label>
          <input
            type="text"
            name="expirationMonth"
            value={data.expirationMonth}
            onChange={handlChange}
            placeholder="MM"
            required
          />
        </div>
        <div>
          <label>Expiration Year</label>
          <input
            type="text"
            name="expirationYear"
            value={data.expirationYear}
            onChange={handlChange}
            placeholder="YYYY"
            required
          />
        </div>
        <div>
          <label>Amount</label>
          <input
            type="number"
            name="amount"
            value={data.amount}
            onChange={handlChange}
            placeholder="Amount"
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? "Loading..." : "Pay"}
        </button>
      </form>
    </div>
  );
}
