import { useState } from "react";
import { ethers } from "ethers";

export default function Home() {
  const [message, setMessage] = useState("");
  const [irys, setIrys] = useState(null);

  const connectWallet = async () => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);

      await provider.send("wallet_addEthereumChain", [{
        chainId: "0x4f6",
        chainName: "Irys Testnet",
        nativeCurrency: { name: "IRYS", symbol: "IRYS", decimals: 18 },
        rpcUrls: ["https://testnet-rpc.irys.xyz/v1/execution-rpc"],
        blockExplorerUrls: ["https://testnet-explorer.irys.xyz"]
      }]);

      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();

      const irysInstance = new window.Irys({
        url: "https://testnet.irys.xyz",
        token: "irys",
        provider: signer,
      });

      await irysInstance.ready();
      setIrys(irysInstance);
      alert("✅ Wallet connected: " + irysInstance.address);
    } catch (err) {
      console.error("Connection error:", err);
      alert("⚠️ Could not connect wallet.");
    }
  };

  const uploadMessage = async () => {
    if (!irys) return alert("⚠️ Connect your wallet first.");
    if (!message.trim()) return alert("✏️ Write something first.");

    try {
      const res = await irys.upload(message.trim());
      alert("✅ Uploaded: https://gateway.irys.xyz/" + res.id);
    } catch (err) {
      console.error("Upload error:", err);
      alert("❌ Upload failed.");
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>🧱 Irys Confession Wall</h1>
      <textarea
        rows={4}
        cols={50}
        placeholder="Write your confession..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <br />
      <button onClick={connectWallet}>Connect Wallet</button>
      <button onClick={uploadMessage}>Upload</button>
      <script src="https://cdn.jsdelivr.net/gh/irysxyz/web-sdk@main/dist/web.bundle.min.js"></script>
    </div>
  );
}
