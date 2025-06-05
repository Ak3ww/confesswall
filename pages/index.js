import { useEffect, useState } from "react";
import { ethers } from "ethers";
import Irys from "@irys/sdk";

export default function Home() {
  const [irys, setIrys] = useState(null);
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState("");

  const connectWallet = async () => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();

      try {
        await provider.send("wallet_addEthereumChain", [
          {
            chainId: "0x4f6",
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

      // ⚠️ Patch for Irys signer
      const patchedSigner = {
        getAddress: async () => await signer.getAddress(),
        signMessage: async (msg) => await signer.signMessage(msg),
      };

      const irysInstance = new Irys({
        network: "devnet",
        chain: "ethereum",
        signer: patchedSigner,
      });

      await irysInstance.ready();
      setIrys(irysInstance);
      setConnected(true);
    } catch (err) {
      console.error("Connect error:", err);
      alert("❌ Wallet connection failed.");
    }
  };

  const uploadMessage = async () => {
    if (!irys) {
      alert("Connect wallet first.");
      return;
    }

    if (!message.trim()) {
      alert("Message cannot be empty.");
      return;
    }

    try {
      const tx = await irys.upload(message, {
        tags: [{ name: "App", value: "ConfessionWall" }],
      });
      console.log("✅ Uploaded:", tx.id);
      alert(`✅ Confession uploaded: ${tx.id}`);
      setMessage("");
    } catch (err) {
      console.error("Upload failed:", err);
      alert("❌ Upload failed.");
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>🧱 Irys Confession Wall</h1>
      <textarea
        rows="4"
        cols="60"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Write your confession here..."
      />
      <br />
      <button onClick={connectWallet} style={{ marginTop: "1rem" }}>
        {connected ? "✅ Wallet Connected" : "Connect Wallet"}
      </button>
      <button onClick={uploadMessage} style={{ marginLeft: "1rem" }}>
        Upload Confession
      </button>
    </div>
  );
}
