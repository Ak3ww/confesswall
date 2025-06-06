import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { WebUploader } from "@irys/web-upload";
import { WebEthereum } from "@irys/web-upload-ethereum";
import { EthersV6Adapter } from "@irys/web-upload-ethereum-ethers-v6";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";

export default function Home() {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState("");
  const [irysUploader, setIrysUploader] = useState(null);
  const [uploadText, setUploadText] = useState("");
  const [uploadResult, setUploadResult] = useState("");
  const [feed, setFeed] = useState([]);
  const [deleteStatus, setDeleteStatus] = useState("");
  const router = useRouter();

  // Real-time listener
  useEffect(() => {
    const channel = supabase
      .channel("realtime:confessions")
      .on("postgres_changes", { event: "*", schema: "public", table: "confessions" }, fetchFeed)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const connectWallet = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const irys = await WebUploader(WebEthereum).withAdapter(EthersV6Adapter(provider));
      const userAddress = await signer.getAddress();

      setAddress(userAddress);
      setIrysUploader(irys);
      setConnected(true);
      fetchFeed();
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

  const encryptConfession = (plaintext) => {
    return btoa(plaintext); // demo encryption
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
    const { data, error } = await supabase
      .from("confessions")
      .select("tx_id, encrypted, address")
      .order("created_at", { ascending: false })
      .limit(20);

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

  const handleDelete = async (tx_id) => {
    try {
      const message = `Delete Confession with tx_id: ${tx_id}`;
      const signer = await new ethers.BrowserProvider(window.ethereum).getSigner();
      const signature = await signer.signMessage(message);
      const userAddr = await signer.getAddress();

      const res = await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tx_id, address: userAddr, signature }),
      });

      const result = await res.json();

      if (result.success) {
        setDeleteStatus("✅ Deleted!");
        setTimeout(() => setDeleteStatus(""), 2000);
      } else {
        setDeleteStatus("❌ Delete failed");
      }
    } catch (err) {
      console.error("Delete error:", err);
      setDeleteStatus("❌ Delete error");
    }
  };

  const goToProfile = (addr) => {
    router.push(`/address/${addr}`);
  };

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Irys Confession Wall</h1>

      {!connected ? (
        <button onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <>
          <p>Connected: {address.slice(0, 6)}...{address.slice(-4)}</p>
          <button onClick={disconnectWallet}>Disconnect</button>
          <button onClick={() => goToProfile(address)} style={{ marginLeft: "1rem" }}>
            My Confessions
          </button>

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
            {deleteStatus && <p style={{ color: "green" }}>{deleteStatus}</p>}
          </div>

          <section style={{ marginTop: "2rem" }}>
            <h2>Latest Confessions</h2>
            {feed.length === 0 ? (
              <p>No confessions yet.</p>
            ) : (
              feed.map((item) => (
                <div key={item.tx_id} style={{ marginBottom: "1rem", padding: "1rem", border: "1px solid #ccc" }}>
                  <p
                    style={{ fontSize: "0.9rem", color: "#007", cursor: "pointer" }}
                    onClick={() => goToProfile(item.address)}
                  >
                    {item.address.slice(0, 6)}...{item.address.slice(-4)}
                  </p>
                  <p style={{ whiteSpace: "pre-wrap" }}>{item.text}</p>
                  {item.address.toLowerCase() === address.toLowerCase() && (
                    <button onClick={() => handleDelete(item.tx_id)}>Delete</button>
                  )}
                </div>
              ))
            )}
          </section>
        </>
      )}
    </main>
  );
}
