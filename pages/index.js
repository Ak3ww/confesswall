import { useEffect, useState } from "react";
import { ethers } from "ethers";
import Irys from "@irys/sdk";

export default function Home() {
  const [irys, setIrys] = useState(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [confessions, setConfessions] = useState([]);

  const connectWallet = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();

      // Add Irys Testnet chain
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0x4f6", // 1270 hex
              chainName: "Irys Testnet",
              nativeCurrency: {
                name: "IRYS",
                symbol: "IRYS",
                decimals: 18,
              },
              rpcUrls: ["https://testnet-rpc.irys.xyz/v1/execution-rpc"],
              blockExplorerUrls: ["https://testnet-explorer.irys.xyz"],
            },
          ],
        });
      } catch (err) {
        console.warn("Could not add chain, maybe already added");
      }

      const irysInstance = new Irys({
        network: "testnet",
        token: "ethereum",
        wallet: signer,
      });

      await irysInstance.ready();
      setIrys(irysInstance);
      setWalletConnected(true);
      alert("✅ Connected to Irys Testnet");
    } catch (err) {
      console.error("Connect error:", err);
      alert("❌ Wallet connection failed.");
    }
  };

  const handleUpload = async () => {
    if (!walletConnected || !irys) {
      alert("⚠️ Please connect wallet first.");
      return;
    }

    const msg = document.getElementById("confessInput").value.trim();
    if (!msg) {
      alert("✏️ Write something to upload.");
      return;
    }

    try {
      const tags = [{ name: "App", value: "IrysConfessionWall" }];
      const receipt = await irys.upload(msg, { tags });

      alert(`✅ Uploaded!\nhttps://gateway.irys.xyz/${receipt.id}`);
      setConfessions((prev) => [
        { id: receipt.id, data: msg },
        ...prev,
      ]);
    } catch (err) {
      console.error("❌ Upload failed:", err);
      alert("Upload failed. Check console.");
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>🧱 Irys Confession Wall</h1>
      <textarea
        id="confessInput"
        rows="4"
        cols="60"
        placeholder="Write your confession here..."
        style={{ marginBottom: "1rem" }}
      ></textarea>
      <br />
      <button onClick={connectWallet} style={{ marginRight: "1rem" }}>
        {walletConnected ? "Connected ✅" : "Connect Wallet"}
      </button>
      <button onClick={handleUpload}>Upload Confession</button>

      <hr style={{ margin: "2rem 0" }} />

      <h2>📝 Recent Confessions</h2>
      {confessions.length === 0 && <p>No confessions yet...</p>}
      {confessions.map((c) => (
        <div
          key={c.id}
          style={{
            marginBottom: "1rem",
            padding: "1rem",
            border: "1px solid #ccc",
            borderRadius: "8px",
          }}
        >
          <p>{c.data}</p>
          <a
            href={`https://gateway.irys.xyz/${c.id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on Irys
          </a>
        </div>
      ))}
    </div>
  );
}
