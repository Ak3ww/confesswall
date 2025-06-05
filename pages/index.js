import { useEffect, useState } from "react";
import { ethers } from "ethers";
import Irys from "@irys/sdk";

export default function Home() {
  const [irys, setIrys] = useState(null);
  const [connected, setConnected] = useState(false);
  const [confess, setConfess] = useState("");
  const [uploadUrl, setUploadUrl] = useState("");

  const connectWallet = async () => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      try {
        await provider.send("wallet_addEthereumChain", [
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
        ]);
      } catch (err) {
        console.warn("Could not add chain, maybe already added");
      }

      await provider.send("eth_requestAccounts", []);

      const irysInstance = new Irys({
        network: "devnet",
        chain: "ethereum",
        signer,
      });

      await irysInstance.ready();
      setIrys(irysInstance);
      setConnected(true);
    } catch (err) {
      console.error("Connect error:", err);
      alert("❌ Wallet connection failed.");
    }
  };

  const uploadConfess = async () => {
    if (!irys) return alert("⚠️ Please connect wallet first.");
    if (!confess.trim()) return alert("✏️ Write your confession first.");

    try {
      const receipt = await irys.upload(confess.trim());
      const url = `https://gateway.irys.xyz/${receipt.id}`;
      setUploadUrl(url);
      alert(`✅ Uploaded to Irys:\n${url}`);
    } catch (err) {
      console.error("Upload failed:", err);
      alert("❌ Upload failed.");
    }
  };

  return (
    <div style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>🧱 Irys Confession Wall</h1>

      <textarea
        rows={5}
        cols={50}
        placeholder="Write your confession here..."
        value={confess}
        onChange={(e) => setConfess(e.target.value)}
        style={{ padding: 10 }}
      />

      <br />
      <button onClick={connectWallet} style={{ margin: "10px", padding: "10px 20px" }}>
        {connected ? "✅ Wallet Connected" : "Connect Wallet"}
      </button>

      <button onClick={uploadConfess} style={{ margin: "10px", padding: "10px 20px" }}>
        Upload Confession
      </button>

      {uploadUrl && (
        <div style={{ marginTop: 20 }}>
          <strong>📎 Uploaded:</strong> <a href={uploadUrl} target="_blank">{uploadUrl}</a>
        </div>
      )}
    </div>
  );
}
