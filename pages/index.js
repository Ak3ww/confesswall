import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { createIrys } from "@irys/web-upload";

export default function Home() {
  const [provider, setProvider] = useState(null);
  const [address, setAddress] = useState("");
  const [irys, setIrys] = useState(null);
  const [message, setMessage] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [uploading, setUploading] = useState(false);

  const connectWallet = async () => {
    try {
      const ethProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await ethProvider.getSigner();
      const ethAddress = await signer.getAddress();

      const ethSigner = {
        getAddress: async () => ethAddress,
        signMessage: async (msg) => signer.signMessage(msg),
      };

      const irysInstance = await createIrys({
        network: "devnet",
        ethereumSigner: ethSigner,
      });

      setProvider(ethProvider);
      setAddress(ethAddress);
      setIrys(irysInstance);
    } catch (err) {
      console.error("Failed to connect wallet:", err);
      alert("Wallet connection failed");
    }
  };

  const disconnect = () => {
    setProvider(null);
    setAddress("");
    setIrys(null);
  };

  const upload = async () => {
    if (!irys || !message) return;
    setUploading(true);
    try {
      const hashtagList = hashtags
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter((tag) => tag.length > 0);

      const tags = [
        { name: "App-Name", value: "ConfessWall" },
        { name: "Content-Type", value: "text/plain" },
        ...hashtagList.map((tag) => ({
          name: "Confession-Tag",
          value: tag,
        })),
      ];

      const receipt = await irys.upload(message, { tags });
      alert(`Uploaded: ${receipt.id}`);
      setMessage("");
      setHashtags("");
    } catch (e) {
      console.error(e);
      alert("Upload failed");
    }
    setUploading(false);
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial" }}>
      <h1>Irys Confession Wall 🕊️</h1>

      {!address ? (
        <button onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <>
          <p>
            Connected as: <strong>{address.slice(0, 6)}...{address.slice(-4)}</strong>
          </p>
          <button onClick={disconnect}>Disconnect</button>

          <br /><br />

          <textarea
            rows="4"
            cols="60"
            placeholder="Write your confession..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <br />
          <input
            type="text"
            placeholder="Add hashtags (comma separated)"
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
            style={{ marginTop: "1rem", width: "60%" }}
          />
          <br />
          <button onClick={upload} disabled={!irys || uploading || !message}>
            {uploading ? "Uploading..." : "Upload Confession"}
          </button>
        </>
      )}
    </div>
  );
}
