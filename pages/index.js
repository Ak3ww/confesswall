import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { createIrys } from "@irys/web-upload";
import { EthereumSigner } from "@irys/web-upload-ethereum";
import { getSigner } from "@irys/web-upload-ethereum-ethers-v6";

export default function Home() {
  const [provider, setProvider] = useState(null);
  const [address, setAddress] = useState("");
  const [irys, setIrys] = useState(null);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [confessions, setConfessions] = useState([]);

  // Connect wallet
  const connectWallet = async () => {
    const ethProvider = new ethers.BrowserProvider(window.ethereum);
    const signer = await getSigner(ethProvider);
    const ethAddress = await signer.getAddress();
    const ethSigner = new EthereumSigner(signer);

    const irysInstance = await createIrys({
      network: "devnet",
      ethereumSigner: ethSigner,
    });

    setProvider(ethProvider);
    setAddress(ethAddress);
    setIrys(irysInstance);
  };

  const disconnect = () => {
    setProvider(null);
    setAddress("");
    setIrys(null);
  };

  // Upload confession
  const upload = async () => {
    if (!irys || !message) return;
    setUploading(true);
    try {
      const receipt = await irys.upload(message, {
        tags: [
          { name: "App-Name", value: "ConfessWall" },
          { name: "Content-Type", value: "text/plain" },
        ],
      });
      alert(`Uploaded: ${receipt.id}`);
      setMessage("");
      fetchConfessions(); // refresh list
    } catch (e) {
      console.error(e);
      alert("Upload failed");
    }
    setUploading(false);
  };

  // Fetch global confessions
  const fetchConfessions = async () => {
    const res = await fetch("https://gateway.irys.xyz/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
          {
            transactions(
              tags: [{ name: "App-Name", values: ["ConfessWall"] }]
              first: 20
              sort: HEIGHT_DESC
            ) {
              edges {
                node {
                  id
                  owner { address }
                  tags { name value }
                }
              }
            }
          }
        `,
      }),
    });

    const json = await res.json();
    const parsed = json.data.transactions.edges.map(({ node }) => {
      const tagMap = {};
      node.tags.forEach(tag => {
        tagMap[tag.name] = tag.value;
      });
      return {
        id: node.id,
        address: node.owner.address,
        tag: tagMap["Confession-Tag"],
        contentURL: `https://gateway.irys.xyz/${node.id}`,
      };
    });

    setConfessions(parsed);
  };

  useEffect(() => {
    fetchConfessions();
  }, []);

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial" }}>
      <h1>Irys Confession Wall 🕊️</h1>

      {address ? (
        <div>
          <p>Connected as: <strong>{address.slice(0, 6)}...{address.slice(-4)}</strong></p>
          <button onClick={disconnect}>Disconnect</button>
        </div>
      ) : (
        <button onClick={connectWallet}>Connect Wallet</button>
      )}

      <br /><br />

      <textarea
        rows="4"
        cols="50"
        placeholder="Write your confession..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        disabled={!address}
      />
      <br />
      <button onClick={upload} disabled={!irys || uploading || !message}>
        {uploading ? "Uploading..." : "Upload Confession"}
      </button>

      <hr style={{ margin: "2rem 0" }} />

      <h2>Recent Confessions</h2>
      {confessions.length === 0 && <p>Loading...</p>}
      {confessions.map((c, i) => (
        <div key={i} style={{
          border: "1px solid #ccc",
          borderRadius: "8px",
          padding: "1rem",
          marginBottom: "1rem"
        }}>
          <p><strong>From:</strong> {c.address.slice(0, 6)}...{c.address.slice(-4)}</p>
          <p><strong>Tag:</strong> {c.tag || "None"}</p>
          <a href={c.contentURL} target="_blank" rel="noopener noreferrer">
            View Confession
          </a>
        </div>
      ))}
    </div>
  );
}
