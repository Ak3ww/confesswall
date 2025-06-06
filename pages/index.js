import { useEffect, useState } from "react";
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
  const router = useRouter();

  const connectWallet = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      const irys = await WebUploader(WebEthereum).withAdapter(
        EthersV6Adapter(provider)
      );

      setAddress(userAddress);
      setIrysUploader(irys);
      setConnected(true);
    } catch (e) {
      console.error("Wallet connection failed", e);
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
    return btoa(plaintext); // basic demo encryption
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

      const { error } = await supabase.from("confessions").insert({
        tx_id,
        encrypted,
        address,
      });

      if (error) throw error;

      setUploadResult("✅ Uploaded anonymously");
      setUploadText("");
    } catch (e) {
      console.error("Upload failed", e);
      setUploadResult("❌ Upload failed");
    }
  };

  const deleteConfession = async (tx_id) => {
    try {
      const message = `Delete Confession with tx_id: ${tx_id}`;
      const signer = await new ethers.BrowserProvider(window.ethereum).then(p => p.getSigner());
      const signature = await signer.signMessage(message);

      const res = await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tx_id, address, signature }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to delete");

    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  useEffect(() => {
    connectWallet(); // auto connect if wallet available
  }, []);

  useEffect(() => {
    if (!connected) return;

    const channel = supabase
      .channel("realtime:confessions")
      .on("postgres_changes", { event: "*", schema: "public", table: "confessions" }, (payload) => {
        if (payload.eventType === "INSERT") {
          const newConfession = {
            ...payload.new,
            text: decryptConfession(payload.new.encrypted),
          };
          setFeed((prev) => [newConfession, ...prev]);
        }

        if (payload.eventType === "DELETE") {
          setFeed((prev) => prev.filter((item) => item.tx_id !== payload.old.tx_id));
        }
      })
      .subscribe();

    supabase
      .from("confessions")
      .select("tx_id, encrypted, address")
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (data) {
          const formatted = data.map((item) => ({
            ...item,
            text: decryptConfession(item.encrypted),
          }));
          setFeed(formatted);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [connected]);

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
          <p>Connected: <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => goToProfile(address)}>
            {address.slice(0, 6)}...{address.slice(-4)}
          </span></p>
          <button onClick={disconnectWallet}>Disconnect</button>
          <button style={{ marginLeft: "1rem" }} onClick={() => goToProfile(address)}>My Confessions</button>

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

          <section style={{ marginTop: "2rem" }}>
            <h2>Latest Confessions</h2>
            {feed.length === 0 ? (
              <p>No confessions yet.</p>
            ) : (
              feed.map((item) => (
                <div key={item.tx_id} style={{ marginBottom: "1rem", padding: "1rem", border: "1px solid #ccc" }}>
                  <p
                    onClick={() => goToProfile(item.address)}
                    style={{ fontSize: "0.9rem", color: "#555", cursor: "pointer", textDecoration: "underline" }}
                  >
                    {item.address.slice(0, 6)}...{item.address.slice(-4)}
                  </p>
                  <p>{item.text}</p>
                  {item.address === address && (
                    <button onClick={() => deleteConfession(item.tx_id)} style={{ marginTop: "0.5rem" }}>
                      🗑️ Delete
                    </button>
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
