import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { WebUploader } from "@irys/web-upload";
import { WebEthereum } from "@irys/web-upload-ethereum";
import { EthersV6Adapter } from "@irys/web-upload-ethereum-ethers-v6";

export default function Home() {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState("");
  const [irysUploader, setIrysUploader] = useState(null);
  const [uploadText, setUploadText] = useState("");
  const [uploadResult, setUploadResult] = useState("");
  const [feed, setFeed] = useState([]);

  const connectWallet = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const irys = await WebUploader(WebEthereum).withAdapter(EthersV6Adapter(provider));
      const userAddress = await signer.getAddress();

      console.log("Connected to Irys:", userAddress);
      setAddress(userAddress);
      setIrysUploader(irys);
      setConnected(true);
      await fetchFeed();
    } catch (e) {
      console.error("Failed to connect wallet:", e);
    }
  };

  const disconnectWallet = () => {
    setConnected(false);
    setAddress("");
    setIrysUploader(null);
    setUploadResult("");
    setFeed([]);
  };

  const uploadData = async () => {
    if (!uploadText || !irysUploader) return;

    try {
      const receipt = await irysUploader.upload(uploadText);
      setUploadResult(`✅ Uploaded: https://gateway.irys.xyz/${receipt.id}`);
      setUploadText("");
      await fetchFeed();
    } catch (e) {
      console.error("Upload error:", e);
      setUploadResult("❌ Upload failed");
    }
  };

  const fetchFeed = async () => {
    try {
      const res = await fetch("https://gateway.irys.xyz/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `{
            transactions(tags: [{ name: "App-Name", values: ["ConfessWall"] }], first: 10, sort: HEIGHT_DESC) {
              edges {
                node {
                  id
                  owner {
                    address
                  }
                }
              }
            }
          }`,
        }),
      });

      const json = await res.json();
      const items = json.data?.transactions?.edges || [];
      const results = await Promise.all(
        items.map(async ({ node }) => {
          try {
            const textRes = await fetch(`https://gateway.irys.xyz/${node.id}`);
            const text = await textRes.text();
            return {
              id: node.id,
              address: node.owner.address,
              text,
            };
          } catch (e) {
            return null;
          }
        })
      );
      setFeed(results.filter(Boolean));
    } catch (e) {
      console.error("Failed to fetch feed:", e);
    }
  };

  useEffect(() => {
    if (connected) {
      fetchFeed();
    }
  }, [connected]);

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Irys Confession Wall</h1>

      {!connected ? (
        <button onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <div>
          <p>Connected: {address.slice(0, 6)}...{address.slice(-4)}</p>
          <button onClick={disconnectWallet}>Disconnect</button>

          <div style={{ marginTop: "1rem" }}>
            <textarea
              placeholder="Write your confession..."
              rows="4"
              cols="40"
              value={uploadText}
              onChange={(e) => setUploadText(e.target.value)}
              style={{ display: "block", width: "100%", marginBottom: "1rem" }}
            />
            <button onClick={uploadData}>Upload</button>
            {uploadResult && <p style={{ marginTop: "1rem" }}>{uploadResult}</p>}
          </div>

          <section style={{ marginTop: "2rem" }}>
            <h2>Latest Confessions</h2>
            {feed.length === 0 ? (
              <p>No confessions yet.</p>
            ) : (
              feed.map((item) => (
                <div key={item.id} style={{ marginBottom: "1rem", padding: "1rem", border: "1px solid #ccc" }}>
                  <p style={{ fontSize: "0.9rem", color: "#555" }}>
                    {item.address.slice(0, 6)}...{item.address.slice(-4)}
                  </p>
                  <p style={{ whiteSpace: "pre-wrap" }}>{item.text}</p>
                </div>
              ))
            )}
          </section>
        </div>
      )}
    </main>
  );
}
