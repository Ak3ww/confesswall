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
  const [myFeed, setMyFeed] = useState([]);
  const [view, setView] = useState("global");

  const connectWallet = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const irys = await WebUploader(WebEthereum).withAdapter(EthersV6Adapter(provider));
      const userAddress = await signer.getAddress();

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
    setMyFeed([]);
  };

  const encryptConfession = (plaintext) => {
    return btoa(plaintext);
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

  const deleteConfession = async (tx_id) => {
    const { error } = await supabase
      .from("confessions")
      .delete()
      .eq("tx_id", tx_id)
      .eq("address", address);

    if (error) console.error("Delete failed:", error);
  };

  useEffect(() => {
    if (!connected) return;

    const globalSub = supabase
      .channel("global-confessions")
      .on("postgres_changes", { event: "*", schema: "public", table: "confessions" }, (payload) => {
        fetchFeed();
        fetchMyFeed();
      })
      .subscribe();

    fetchFeed();
    fetchMyFeed();

    return () => {
      supabase.removeChannel(globalSub);
    };
  }, [connected]);

  const fetchFeed = async () => {
    const { data, error } = await supabase
      .from("confessions")
      .select("tx_id, encrypted, address")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) return console.error("Failed to fetch feed:", error);

    const formatted = data.map((item) => ({
      ...item,
      text: decryptConfession(item.encrypted),
    }));

    setFeed(formatted);
  };

  const fetchMyFeed = async () => {
    const { data, error } = await supabase
      .from("confessions")
      .select("tx_id, encrypted, address")
      .eq("address", address)
      .order("created_at", { ascending: false });

    if (error) return console.error("Failed to fetch profile feed:", error);

    const formatted = data.map((item) => ({
      ...item,
      text: decryptConfession(item.encrypted),
    }));

    setMyFeed(formatted);
  };

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Irys Confession Wall</h1>

      {!connected ? (
        <button onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <>
          <p>
            Connected:{" "}
            <a href="#" onClick={() => setView("profile")}>
              {address.slice(0, 6)}...{address.slice(-4)}
            </a>
          </p>
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
            {uploadResult && <p>{uploadResult}</p>}
          </div>

          <div style={{ marginTop: "2rem" }}>
            <button onClick={() => setView("global")}>🌍 Global Feed</button>
            <button onClick={() => setView("profile")}>👤 My Confessions</button>
          </div>

          {view === "global" ? (
            <section style={{ marginTop: "2rem" }}>
              <h2>Latest Confessions</h2>
              {feed.map((item) => (
                <div key={item.tx_id} style={{ border: "1px solid #ccc", padding: "1rem", marginBottom: "1rem" }}>
                  <a href={`/profile/${item.address}`}>
                    <p style={{ fontSize: "0.9rem", color: "#555" }}>
                      {item.address.slice(0, 6)}...{item.address.slice(-4)}
                    </p>
                  </a>
                  <p>{item.text}</p>
                </div>
              ))}
            </section>
          ) : (
            <section style={{ marginTop: "2rem" }}>
              <h2>My Confessions</h2>
              {myFeed.map((item) => (
                <div key={item.tx_id} style={{ border: "1px solid #ccc", padding: "1rem", marginBottom: "1rem" }}>
                  <p style={{ fontSize: "0.9rem", color: "#555" }}>
                    {item.address.slice(0, 6)}...{item.address.slice(-4)}
                  </p>
                  <p>{item.text}</p>
                  <button onClick={() => deleteConfession(item.tx_id)} style={{ marginTop: "0.5rem" }}>
                    ❌ Delete
                  </button>
                </div>
              ))}
            </section>
          )}
        </>
      )}
    </main>
  );
}
