import React, { useState } from "react";
import { Irys } from "@irys/sdk";

function App() {
  const [irys, setIrys] = useState(null);
  const [connected, setConnected] = useState(false);
  const [confession, setConfession] = useState("");
  const [link, setLink] = useState("");

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask not found");
      return;
    }

    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    const provider = window.ethereum;

    const _irys = new Irys({
      network: "testnet",
      token: "ethereum",
      provider,
    });

    setIrys(_irys);
    setConnected(true);
  };

  const upload = async () => {
    if (!irys) return alert("Please connect wallet first.");
    if (!confession.trim()) return alert("Type something first.");

    try {
      const receipt = await irys.upload(confession.trim(), {
        tags: [{ name: "App-Name", value: "ConfessWall" }],
      });
      setLink(`https://gateway.irys.xyz/${receipt.id}`);
      setConfession("");
    } catch (e) {
      console.error(e);
      alert("Upload failed.");
    }
  };

  return (
    <div>
      <h1>🕊️ ConfessWall</h1>
      <p>Confess anonymously. Stored on Irys testnet.</p>
      <button onClick={connectWallet}>
        {connected ? "✅ Wallet Connected" : "🔌 Connect Wallet"}
      </button>

      {connected && (
        <div style={{ marginTop: "1rem" }}>
          <textarea
            placeholder="Type your confession..."
            style={{ width: "100%", maxWidth: 500, height: 120, padding: 10 }}
            value={confession}
            onChange={(e) => setConfession(e.target.value)}
          />
          <br />
          <button onClick={upload}>📝 Confess</button>
          {link && (
            <div style={{ marginTop: "1rem" }}>
              ✅ Uploaded: <a href={link} target="_blank" rel="noreferrer">{link}</a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;