import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { createIrys } from "@irys/web-upload";
import { getSigner } from "@irys/web-upload-ethereum-ethers-v6";

export default function Home() {
  const [provider, setProvider] = useState(null);
  const [address, setAddress] = useState("");
  const [irys, setIrys] = useState(null);
  const [message, setMessage] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [uploading, setUploading] = useState(false);
  const [confessions, setConfessions] = useState([]);
  const [selectedTag, setSelectedTag] = useState("");
  const [selectedUser, setSelectedUser] = useState("");

  // Attempt wallet reconnect on page load
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.request({ method: 'eth_accounts' }).then(async (accounts) => {
        if (accounts.length > 0) {
          await connectWallet();
        }
      });
    }
  }, []);

  // Connect wallet
  const connectWallet = async () => {
    if (!window.ethereum) return alert("MetaMask not found");

    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const ethProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await getSigner(ethProvider);
      const ethAddress = await signer.getAddress();

      const irysInstance = await createIrys({
        network: "devnet",
        ethereumSigner: signer,
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

  // Upload confession with hashtags
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
      fetchConfessions();
    } catch (e) {
      console.error(e);
      alert("Upload failed");
    }
    setUploading(false);
  };

  // Fetch confessions
  const fetchConfessions = async () => {
    let json;
    try {
      const res = await fetch("https://gateway.irys.xyz/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `{
            transactions(
              tags: [{ name: "App-Name", values: ["ConfessWall"] }]
              first: 100
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
          }`,
        }),
      });
      json = await res.json();
    } catch (err) {
      console.error("Failed to fetch Irys feed:", err);
      setConfessions([]);
      return;
    }

    const transactions = json.data.transactions.edges;

    const full = await Promise.all(
      transactions.map(async ({ node }) => {
        const tagMap = {};
        node.tags.forEach((tag) => {
          if (!tagMap[tag.name]) tagMap[tag.name] = [];
          tagMap[tag.name].push(tag.value);
        });

        let content = "";
        try {
          const r = await fetch(`https://gateway.irys.xyz/${node.id}`);
          content = await r.text();
        } catch (e) {
          content = "[Failed to load confession]";
        }

        return {
          id: node.id,
          address: node.owner.address,
          tags: tagMap["Confession-Tag"] || [],
          text: content,
        };
      })
    );

    setConfessions(full);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const user = params.get("user");
    setSelectedUser(user || "");
  }, []);

  useEffect(() => {
    fetchConfessions();
  }, []);

  const allTags = Array.from(new Set(confessions.flatMap((c) => c.tags)));

  const filteredConfessions = confessions.filter((c) => {
    if (selectedUser && c.address !== selectedUser) return false;
    if (selectedTag && !c.tags.includes(selectedTag)) return false;
    return true;
  });

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial" }}>
      <h1>Irys Confession Wall 🕊️</h1>

      {address ? (
        <div>
          <p>
            Connected as: <strong>{address.slice(0, 6)}...{address.slice(-4)}</strong>
          </p>
          <button onClick={disconnect}>Disconnect</button>
        </div>
      ) : (
        <button onClick={connectWallet}>Connect Wallet</button>
      )}

      <br /><br />

      <textarea
        rows="4"
        cols="60"
        placeholder="Write your confession..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        disabled={!address}
      />
      <br />
      <input
        type="text"
        placeholder="Add hashtags (comma separated)"
        value={hashtags}
        onChange={(e) => setHashtags(e.target.value)}
        disabled={!address}
        style={{ marginTop: "1rem", width: "60%" }}
      />
      <br />
      <button onClick={upload} disabled={!irys || uploading || !message}>
        {uploading ? "Uploading..." : "Upload Confession"}
      </button>

      <hr style={{ margin: "2rem 0" }} />

      {/* Tag filter */}
      <div style={{ marginBottom: "1rem" }}>
        <strong>Filter by tag:</strong>{" "}
        <select value={selectedTag} onChange={(e) => setSelectedTag(e.target.value)}>
          <option value="">All</option>
          {allTags.map((tag, i) => (
            <option key={i} value={tag}>
              #{tag}
            </option>
          ))}
        </select>
      </div>

      {selectedUser && (
        <div>
          <strong>Viewing confessions from:</strong> {selectedUser}
          <button onClick={() => setSelectedUser("")}>Clear</button>
        </div>
      )}

      <h2>Recent Confessions</h2>
      {filteredConfessions.length === 0 && <p>No confessions found.</p>}
      {filteredConfessions.map((c, i) => (
        <div key={i} style={{
          border: "1px solid #ccc",
          borderRadius: "8px",
          padding: "1rem",
          marginBottom: "1rem"
        }}>
          <p>
            <strong>From:</strong>{" "}
            <a href={`/?user=${c.address}`}>{c.address.slice(0, 6)}...{c.address.slice(-4)}</a>
          </p>
          {c.tags.length > 0 && (
            <p>
              <strong>Tags:</strong>{" "}
              {c.tags.map((t, i) => (
                <span key={i} style={{ marginRight: "6px" }}>#{t}</span>
              ))}
            </p>
          )}
          <p>{c.text}</p>
        </div>
      ))}
    </div>
  );
}
