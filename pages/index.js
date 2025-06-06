import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { WebUploader } from "@irys/web-upload";
import { WebEthereum } from "@irys/web-upload-ethereum";
import { EthersV6Adapter } from "@irys/web-upload-ethereum-ethers-v6";
import { supabase } from "../lib/supabaseClient";

export default function Home() {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState("");
  const [irysUploader, setIrysUploader] = useState(null);
  const [uploadText, setUploadText] = useState("");
  const [uploadResult, setUploadResult] = useState("");
  const [feed, setFeed] = useState([]);
  const [myOnly, setMyOnly] = useState(false);
  const [viewingUser, setViewingUser] = useState(null); // for external profile view

  const connectWallet = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const irys = await WebUploader(WebEthereum).withAdapter(EthersV6Adapter(provider));
      const userAddress = await signer.getAddress();

      setAddress(userAddress);
      setIrysUploader(irys);
      setConnected(true);
      await fetchFeed();
      subscribeToChanges();
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
    setMyOnly(false);
    setViewingUser(null);
  };

  const encryptConfession = (plaintext) => btoa(plaintext);
  const decryptConfession = (encrypted) => {
    try {
      return atob(encrypted);
    } catch {
      return "[decryption error]";
    }
  };

  const uploadData = async () => {
    if (!uploadText || !irysUploader) return;
    const encrypted = encryptConfession(uploadText);
    try {
      const receipt = await irysUploader.upload(encrypted);
      const tx_id = receipt.id;
      await supabase.from("confessions").insert({ tx_id, encrypted, address });
      setUploadResult("✅ Uploaded anonymously");
      setUploadText("");
    } catch (e) {
      console.error("Upload error:", e);
      setUploadResult("❌ Upload failed");
    }
  };

  const fetchFeed = async () => {
    let query = supabase
      .from("confessions")
      .select("tx_id, encrypted, address")
      .order("created_at", { ascending: false })
      .limit(10);

    if (myOnly && address) {
      query = query.eq("address", address);
    }

    if (viewingUser && viewingUser !== address) {
      query = query.eq("address", viewingUser);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Failed to fetch feed:", error);
      return;
    }

    const formatted = data.map((item) => ({
      ...item,
      text: decryptConfession(item.encrypted),
    }));

    setFeed(formatted);
  };

  const deleteConfession = async (tx_id) => {
    const { error } = await supabase.from("confessions").delete().eq("tx_id", tx_id);
    if (error) console.error("Delete failed:", error);
  };

  const subscribeToChanges = () => {
    supabase
      .channel("confession_feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "confessions" }, () => {
        fetchFeed();
      })
      .subscribe();
  };

  useEffect(() => {
    if (connected) {
      fetchFeed();
    }
  }, [connected, myOnly, viewingUser]);

  const goBackToFeed = () => {
    setMyOnly(false);
    setViewingUser(null);
  };

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

          <div style={{ marginTop: "2rem" }}>
            <button onClick={() => {
              setMyOnly(false);
              setViewingUser(null);
            }}>🌍 Global Feed</button>

            <button onClick={() => {
              setMyOnly(true);
              setViewingUser(null);
            }} style={{ marginLeft: "1rem" }}>👤 My Confessions</button>
          </div>

          <section style={{ marginTop: "2rem" }}>
            <h2>
              {myOnly ? "My Confessions" :
                viewingUser ? `Confessions by ${viewingUser.slice(0, 6)}...${viewingUser.slice(-4)}` :
                  "Latest Confessions"}
            </h2>

            {viewingUser && !myOnly && (
              <button onClick={goBackToFeed}>← Back</button>
            )}

            {feed.length === 0 ? (
              <p>No confessions yet.</p>
            ) : (
              feed.map((item) => (
                <div key={item.tx_id} style={{ marginBottom: "1rem", padding: "1rem", border: "1px solid #ccc" }}>
                  <p
                    style={{ fontSize: "0.9rem", color: "#555", cursor: "pointer" }}
                    onClick={() => setViewingUser(item.address)}
                    title="View user profile"
                  >
                    {item.address.slice(0, 6)}...{item.address.slice(-4)}
                  </p>
                  <p style={{ whiteSpace: "pre-wrap" }}>{item.text}</p>
                  {item.address === address && (
                    <button
                      onClick={() => deleteConfession(item.tx_id)}
                      style={{
                        marginTop: "0.5rem",
                        background: "#ff4d4f",
                        color: "white",
                        border: "none",
                        padding: "0.25rem 0.5rem",
                        cursor: "pointer",
                      }}
                    >
                      🗑️ Delete
                    </button>
                  )}
                </div>
              ))
            )}
          </section>
        </div>
      )}
    </main>
  );
}
