import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { ethers } from "ethers";

export default function AddressPage() {
  const router = useRouter();
  const { address: paramAddress } = router.query;

  const [feed, setFeed] = useState([]);
  const [currentWallet, setCurrentWallet] = useState("");

  const connectWallet = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      setCurrentWallet(userAddress);
    } catch (err) {
      console.error("Failed to get current wallet:", err);
    }
  };

  const decryptConfession = (encrypted) => {
    try {
      return atob(encrypted);
    } catch {
      return "[decryption error]";
    }
  };

  const deleteConfession = async (tx_id) => {
    try {
      const message = `Delete Confession with tx_id: ${tx_id}`;
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(message);
      const userAddress = await signer.getAddress();

      const res = await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tx_id, address: userAddress, signature }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Delete failed");
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  useEffect(() => {
    connectWallet();
  }, []);

  useEffect(() => {
    if (!paramAddress) return;

    const channel = supabase
      .channel("realtime:confessions_profile")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "confessions",
      }, (payload) => {
        if (payload.eventType === "INSERT" && payload.new.address === paramAddress) {
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
      .eq("address", paramAddress)
      .order("created_at", { ascending: false })
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
  }, [paramAddress]);

  const goBack = () => {
    router.push("/");
  };

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Confessions by {paramAddress?.slice(0, 6)}...{paramAddress?.slice(-4)}</h1>
      <button onClick={goBack}>← Back to Global Feed</button>

      <section style={{ marginTop: "2rem" }}>
        {feed.length === 0 ? (
          <p>No confessions yet.</p>
        ) : (
          feed.map((item) => (
            <div key={item.tx_id} style={{ marginBottom: "1rem", padding: "1rem", border: "1px solid #ccc" }}>
              <p style={{ fontSize: "0.9rem", color: "#555" }}>
                {item.address.slice(0, 6)}...{item.address.slice(-4)}
              </p>
              <p>{item.text}</p>
              {item.address === currentWallet && (
                <button onClick={() => deleteConfession(item.tx_id)} style={{ marginTop: "0.5rem" }}>
                  🗑️ Delete
                </button>
              )}
            </div>
          ))
        )}
      </section>
    </main>
  );
}
