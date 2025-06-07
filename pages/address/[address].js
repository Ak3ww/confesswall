import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { ethers } from "ethers";
import { supabase } from "../../lib/supabaseClient";

export default function ProfilePage() {
  const router = useRouter();
  const { address } = router.query;

  const [connectedAddress, setConnectedAddress] = useState("");
  const [confessions, setConfessions] = useState([]);
  const [signatureCache, setSignatureCache] = useState({});

  // Connect wallet only once
  useEffect(() => {
    const connectWallet = async () => {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const userAddress = await signer.getAddress();
        setConnectedAddress(userAddress.toLowerCase());
      }
    };
    connectWallet();
  }, []);

  // Realtime fetch for profile feed
  useEffect(() => {
    if (!address) return;

    const fetchData = async () => {
      const { data, error } = await supabase
        .from("confessions")
        .select("*")
        .eq("address", address.toLowerCase())
        .order("created_at", { ascending: false });

      if (!error) setConfessions(data);
    };

    fetchData();

    const subscription = supabase
      .channel("profile-confession-feed")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "confessions",
          filter: `address=eq.${address.toLowerCase()}`,
        },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [address]);

  const deleteConfession = async (tx_id) => {
    try {
      const message = `Delete Confession with tx_id: ${tx_id}`;
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(message);

      const res = await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tx_id,
          address: connectedAddress,
          signature,
        }),
      });

      const result = await res.json();
      if (result.success) {
        alert("✅ Deleted!");
      } else {
        alert("❌ Delete failed");
      }
    } catch (e) {
      console.error("Delete error", e);
      alert("❌ Delete error");
    }
  };

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Confessions by {address?.slice(0, 6)}...{address?.slice(-4)}</h1>

      <button onClick={() => router.push("/")}>← Back to Global Feed</button>

      {confessions.length === 0 ? (
        <p style={{ marginTop: "2rem" }}>No confessions found.</p>
      ) : (
        <div style={{ marginTop: "2rem" }}>
          {confessions.map((item) => (
            <div
              key={item.tx_id}
              style={{
                border: "1px solid #ccc",
                padding: "1rem",
                marginBottom: "1rem",
              }}
            >
              <p style={{ fontSize: "0.9rem", color: "#555" }}>
                {item.address.slice(0, 6)}...{item.address.slice(-4)}
              </p>
              <p>{atob(item.encrypted)}</p>

              {item.address.toLowerCase() === connectedAddress && (
                <button
                  onClick={() => deleteConfession(item.tx_id)}
                  style={{ marginTop: "0.5rem" }}
                >
                  🗑️ Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
