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
  const [viewingProfile, setViewingProfile] = useState(false);

  const connectWallet = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      const irys = await WebUploader(WebEthereum).withAdapter(EthersV6Adapter(provider));

      setAddress(userAddress);
      setIrysUploader(irys);
      setConnected(true);
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
    setViewingProfile(false);
  };

  const encryptConfession = (plaintext) => {
    return btoa(plaintext); // demo: base64
  };

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

      await supabase.from("confessions").insert({
        tx_id,
        encrypted,
        address,
      });

      setUploadResult("✅ Uploaded anonymously");
      setUploadText("");
    } catch (e) {
      console.error("Upload error:", e);
      setUploadResult("❌ Upload failed");
    }
  };

  const fetchFeed = async () => {
    const filter = viewingProfile ? { address } : {};

    const { data, error } = await supabase
      .from("confessions")
      .select("tx_id, encrypted, address")
      .order("created_at", { ascending: false })
      .match(filter);

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
    const { error } = await supabase
      .from("confessions")
      .delete()
      .eq("tx_id", tx_id)
      .eq("address", address); // security check (optional, since policy handles it)

    if (error) {
      console.error("Delete failed:", error);
    }
  };

  useEffect(() => {
    if (connected) {
      fetchFeed();

      const sub = supabase
        .channel("confession-updates")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "confessions" },
          () => fetchFeed()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(sub);
      };
    }
  }, [connected, viewingProfile]);

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
            <button onClick={() => setViewingProfile(false)} disabled={!viewingProfile}>
              🌐 Global Feed
            </button>
            <button onClick={() => setViewingProfile(true)} disabled={viewingProfile}>
              👤 My Confessions
            </button>
          </div>

          <section style={{ marginTop: "2rem" }}>
            <h2>{viewingProfile ? "My Confessions" : "Latest Confessions"}</h2>
            {feed.length === 0 ? (
              <p>No confessions yet.</p>
            ) : (
              feed.map((item) => (
                <div key={item.tx_id} style={{ marginBottom: "1rem", padding: "1rem", border: "1px solid #ccc" }}>
                  <p style={{ fontSize: "0.9rem", color: "#555" }}>
                    {item.address.slice(0, 6)}...{item.address.slice(-4)}
                  </p>
                  <p style={{ whiteSpace: "pre-wrap" }}>{item.text}</p>
                  {item.address === address && (
                    <button
                      onClick={() => deleteConfession(item.tx_id)}
                      style={{ marginTop: "0.5rem", color: "red" }}
                    >
                      Delete
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
