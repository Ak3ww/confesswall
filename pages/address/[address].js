import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { supabase } from "../../lib/supabaseClient";

export default function AddressPage() {
  const router = useRouter();
  const { address } = router.query;

  const [connectedAddress, setConnectedAddress] = useState("");
  const [feed, setFeed] = useState([]);

  useEffect(() => {
    async function detectWallet() {
      if (!window.ethereum) return;
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();
      setConnectedAddress(addr);
    }

    detectWallet();
  }, []);

  const decryptConfession = (encrypted) => {
    try {
      return atob(encrypted);
    } catch {
      return "[decryption error]";
    }
  };

  const fetchFeed = async () => {
    if (!address) return;

    const { data, error } = await supabase
      .from("confessions")
      .select("tx_id, encrypted, address")
      .eq("address", address)
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

  const deleteConfession = async (tx_id) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const message = `Delete Confession with tx_id: ${tx_id}`;
      const signature = await signer.signMessage(message);

      const res = await fetch("/api/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tx_id, address: connectedAddress, signature }),
      });

      const json = await res.json();
      if (json.success) {
        console.log("Confession deleted.");
      } else {
        console.error("Delete failed:", json.error);
      }
    } catch (e) {
      console.error("Delete error:", e);
    }
  };

  useEffect(() => {
    fetchFeed();

    const sub = supabase
      .channel("profile_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "confessions",
          filter: `address=eq.${address}`,
        },
        (payload) => {
          fetchFeed();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [address]);

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Confessions by {address?.slice(0, 6)}...{address?.slice(-4)}</h1>
      <button onClick={() => router.push("/")}>← Back to Global Feed</button>

      <section style={{ marginTop: "2rem" }}>
        {feed.length === 0 ? (
          <p>No confessions yet.</p>
        ) : (
          feed.map((item) => (
            <div
              key={item.tx_id}
              style={{
                marginBottom: "1rem",
                padding: "1rem",
                border: "1px solid #ccc",
              }}
            >
              <p style={{ fontSize: "0.9rem", color: "#555" }}>
                <a
                  href={`/address/${item.address}`}
                  style={{ textDecoration: "underline", cursor: "pointer" }}
                >
                  {item.address.slice(0, 6)}...{item.address.slice(-4)}
                </a>
              </p>
              <p style={{ whiteSpace: "pre-wrap" }}>{item.text}</p>
              {connectedAddress === item.address && (
                <button
                  onClick={() => deleteConfession(item.tx_id)}
                  style={{ marginTop: "0.5rem" }}
                >
                  🗑 Delete
                </button>
              )}
            </div>
          ))
        )}
      </section>
    </main>
  );
}
