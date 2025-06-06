import { useState, useEffect } from "react";
import { useRouter } from "next/router";
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
  const router = useRouter();

  useEffect(() => {
    const restoreConnection = async () => {
      const cached = localStorage.getItem("walletAddress");
      if (cached) {
        await connectWallet(true);
      }
    };
    restoreConnection();
  }, []);

  const connectWallet = async (restoreOnly = false) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      const irys = await WebUploader(WebEthereum).withAdapter(EthersV6Adapter(provider));

      setConnected(true);
      setAddress(userAddress);
      setIrysUploader(irys);
      localStorage.setItem("walletAddress", userAddress);
    } catch (e) {
      if (!restoreOnly) console.error("Failed to connect wallet:", e);
    }
  };

  const disconnectWallet = () => {
    setConnected(false);
    setAddress("");
    setIrysUploader(null);
    setFeed([]);
    localStorage.removeItem("walletAddress");
  };

  const encryptConfession = (text) => btoa(text);
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
      await supabase.from("confessions").insert({
        tx_id: receipt.id,
        encrypted,
        address,
      });
      setUploadText("");
      setUploadResult("✅ Uploaded anonymously");
    } catch (e) {
      console.error("Upload error:", e);
      setUploadResult("❌ Upload failed");
    }
  };

  useEffect(() => {
    const channel = supabase
      .channel("confession-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "confessions" }, () => {
        fetchFeed();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

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

  const deleteConfession = async (tx_id) => {
    const { error } = await supabase.from("confessions").delete().eq("tx_id", tx_id);
    if (error) console.error("Failed to delete:", error);
  };

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Irys Confession Wall</h1>
      {!connected ? (
        <button onClick={() => connectWallet()}>Connect Wallet</button>
      ) : (
        <>
          <p>
            Connected:{" "}
            <a
              href="#"
              onClick={() => router.push(`/address/${address}`)}
              style={{ textDecoration: "underline", cursor: "pointer" }}
            >
              {address.slice(0, 6)}...{address.slice(-4)}
            </a>
          </p>
          <button onClick={disconnectWallet}>Disconnect</button>
          <div style={{ marginTop: "1rem" }}>
            <textarea
              placeholder="Write your confession..."
              value={uploadText}
              onChange={(e) => setUploadText(e.target.value)}
              rows="4"
              cols="40"
              style={{ display: "block", width: "100%", marginBottom: "1rem" }}
            />
            <button onClick={uploadData}>Upload</button>
            {uploadResult && <p>{uploadResult}</p>}
          </div>
          <h2 style={{ marginTop: "2rem" }}>Latest Confessions</h2>
          {feed.map((item) => (
            <div key={item.tx_id} style={{ padding: "1rem", border: "1px solid #ccc", marginBottom: "1rem" }}>
              <p style={{ fontSize: "0.9rem", color: "#555" }}>
                <a
                  href="#"
                  onClick={() => router.push(`/address/${item.address}`)}
                  style={{ textDecoration: "underline", cursor: "pointer" }}
                >
                  {item.address.slice(0, 6)}...{item.address.slice(-4)}
                </a>
              </p>
              <p style={{ whiteSpace: "pre-wrap" }}>{item.text}</p>
              {item.address === address && (
                <button onClick={() => deleteConfession(item.tx_id)} style={{ marginTop: "0.5rem" }}>
                  Delete
                </button>
              )}
            </div>
          ))}
        </>
      )}
    </main>
  );
}
