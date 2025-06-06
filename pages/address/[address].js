import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { ethers } from "ethers";

export default function AddressProfile() {
  const router = useRouter();
  const { address: routeAddress } = router.query;
  const [walletAddress, setWalletAddress] = useState("");
  const [feed, setFeed] = useState([]);
  const [deleteStatus, setDeleteStatus] = useState("");

  useEffect(() => {
    const getWallet = async () => {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const addr = await signer.getAddress();
        setWalletAddress(addr);
      }
    };

    getWallet();
  }, []);

  useEffect(() => {
    if (!routeAddress) return;

    const fetchProfileFeed = async () => {
      const { data, error } = await supabase
        .from("confessions")
        .select("tx_id, encrypted, address")
        .eq("address", routeAddress.toLowerCase())
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to fetch profile feed:", error);
        return;
      }

      const formatted = data.map((item) => ({
        ...item,
        text: decryptConfession(item.encrypted),
      }));

      setFeed(formatted);
    };

    const channel = supabase
      .channel("realtime:confessions")
      .on("postgres_changes", { event: "*", schema: "public", table: "confessions" }, fetchProfileFeed)
      .subscribe();

    fetchProfileFeed();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [routeAddress]);

  const decryptConfession = (encrypted) => {
    try {
      return atob(encrypted);
    } catch {
      return "[decryption error]";
    }
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

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Confessions by {routeAddress?.slice(0, 6)}...{routeAddress?.slice(-4)}</h1>
      <button onClick={() => router.push("/")}>← Back to Global Feed</button>

      {deleteStatus && <p style={{ color: "green", marginTop: "1rem" }}>{deleteStatus}</p>}

      <section style={{ marginTop: "2rem" }}>
        {feed.length === 0 ? (
          <p>No confessions found for this address.</p>
        ) : (
          feed.map((item) => (
            <div key={item.tx_id} style={{ marginBottom: "1rem", padding: "1rem", border: "1px solid #ccc" }}>
              <p style={{ fontSize: "0.9rem", color: "#555" }}>
                {item.address.slice(0, 6)}...{item.address.slice(-4)}
              </p>
              <p style={{ whiteSpace: "pre-wrap" }}>{item.text}</p>
              {item.address.toLowerCase() === walletAddress.toLowerCase() && (
                <button onClick={() => handleDelete(item.tx_id)}>Delete</button>
              )}
            </div>
          ))
        )}
      </section>
    </main>
  );
}
