import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

export default function Home() {
  const [provider, setProvider] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [confessions, setConfessions] = useState([]);

  useEffect(() => {
    fetchConfessions();
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask.");
      return;
    }

    try {
      const chainId = "0x4f6"; // 1270 in hex
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId,
          chainName: "Irys Testnet",
          nativeCurrency: {
            name: "IRYS",
            symbol: "IRYS",
            decimals: 18
          },
          rpcUrls: ["https://testnet-rpc.irys.xyz/v1/execution-rpc"],
          blockExplorerUrls: ["https://testnet-explorer.irys.xyz"]
        }]
      });
    } catch (err) {
      console.log("Chain add error:", err.message);
    }

    try {
      const _provider = new ethers.providers.Web3Provider(window.ethereum);
      await _provider.send("eth_requestAccounts", []);
      const signer = _provider.getSigner();
      const address = await signer.getAddress();
      setProvider(_provider);
      setWalletAddress(address);
    } catch (err) {
      console.error("Connect error:", err);
    }
  };

  const uploadConfession = async () => {
    if (!provider || !walletAddress) {
      alert("⚠️ Please connect wallet first.");
      return;
    }

    if (!message.trim()) {
      alert("✏️ Write something to upload.");
      return;
    }

    setUploading(true);

    try {
      const tx = await provider.getSigner().sendTransaction({
        to: walletAddress, // dummy tx
        value: ethers.utils.parseEther("0.00001")
      });

      await tx.wait();

      alert(`✅ Uploaded: ${message}`);
      setMessage('');
      fetchConfessions(); // Refresh the feed
    } catch (err) {
      console.error("Upload error:", err);
      alert("❌ Upload failed. Check console.");
    }

    setUploading(false);
  };

  const fetchConfessions = async () => {
    // Placeholder for fetching confessions from Irys
    // Implement GraphQL query to fetch transactions with specific tags
    // and update the confessions state
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>🧱 Irys Confession Wall</h1>
      <p>
        {walletAddress
          ? `✅ Connected: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
          : "❌ Not connected"}
      </p>
      <button onClick={connectWallet} style={{ marginRight: "10px" }}>
        {walletAddress ? "Connected" : "Connect Wallet"}
      </button>
      <br /><br />
      <textarea
        rows={5}
        cols={50}
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder="Write your confession..."
      />
      <br />
      <button onClick={uploadConfession} disabled={uploading}>
        {uploading ? "Uploading..." : "Upload Confession"}
      </button>

      <h2>Recent Confessions</h2>
      <ul>
        {confessions.map((confession, index) => (
          <li key={index}>
            <strong>{confession.address}</strong>: {confession.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
