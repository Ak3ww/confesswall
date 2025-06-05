import { useEffect, useState } from "react";
import { ethers } from "ethers";
import Irys from "@irys/sdk";

export default function Home() {
  const [walletAddress, setWalletAddress] = useState("");
  const [confession, setConfession] = useState("");
  const [irys, setIrys] = useState(null);
  const [feed, setFeed] = useState([]);

  const connectWallet = async () => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);

      const signer = provider.getSigner();
      const address = await signer.getAddress();
      setWalletAddress(address);

      const irysInstance = new Irys({
        url: "https://testnet.irys.xyz",
        token: "ethereum",
        wallet: signer,
      });
      await irysInstance.ready();
      setIrys(irysInstance);
    } catch (err) {
      console.error("Wallet connect failed:", err);
    }
  };

  const uploadConfession = async () => {
    if (!irys) return alert("Please connect your wallet first");
    if (!confession) return alert("Enter a message");

    try {
      const res = await irys.upload(confession, { tags: [{ name: "App", value: "ConfessWall" }] });
      console.log("✅ Upload success:", res);
      setConfession("");
      fetchConfessions();
    } catch (e) {
      console.error("❌ Upload failed:", e);
    }
  };

  const fetchConfessions = async () => {
    try {
      const queryUrl = `https://gateway.irys.xyz/graphql`;
      const body = {
        query: `{
          transactions(tags: [{name: "App", values: ["ConfessWall"]}], first: 10) {
            edges {
              node {
                id
                owner {
                  address
                }
                data {
                  size
                  type
                }
              }
            }
          }
        }`
      };

      const res = await fetch(queryUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      const txs = json.data.transactions.edges;

      const items = await Promise.all(
        txs.map(async (tx) => {
          const response = await fetch(`https://gateway.irys.xyz/${tx.node.id}`);
          const message = await response.text();
          return { address: tx.node.owner.address, message };
        })
      );

      setFeed(items);
    } catch (e) {
      console.error("Failed to fetch confessions:", e);
    }
  };

  useEffect(() => {
    fetchConfessions();
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: "Arial" }}>
      <h1>🧱 Irys Confession Wall</h1>

      {!walletAddress ? (
        <button onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <p>✅ Connected: {walletAddress}</p>
      )}

      <textarea
        rows="4"
        cols="50"
        value={confession}
        onChange={(e) => setConfession(e.target.value)}
        placeholder="Write your confession..."
      ></textarea>
      <br />
      <button onClick={uploadConfession}>Upload</button>

      <h2>📜 Latest Confessions</h2>
      {feed.length === 0 && <p>Loading...</p>}
      <ul>
        {feed.map((item, idx) => (
          <li key={idx} style={{ marginBottom: 10 }}>
            <strong>{item.address.slice(0, 6)}...:</strong> {item.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
