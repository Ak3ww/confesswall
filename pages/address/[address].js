import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { ethers } from "ethers";

export default function AddressPage() {
  const router = useRouter();
  const { address } = router.query;

  const [connectedAddress, setConnectedAddress] = useState("");
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getAddress = async () => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const userAddress = await signer.getAddress();
        setConnectedAddress(userAddress);
      } catch (err) {
        console.error("Failed to get connected address:", err);
      }
    };
    getAddress();
  }, []);

  const decryptConfession = (encrypted) => {
    try {
      return atob(encrypted);
    } catch {
      return "[decryption error]";
    }
  };

  const fetchProfileFeed = async () => {
    if (!address) return;

    const { data, error } = await supabase
      .from("confessions")
      .select("tx_id, encrypted, address")
      .eq("address", address)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch profile feed:", error);
    } else {
      const formatted = data.map((item) => ({
        ...item,
        text: decryptConfession(item.encrypted),
      }));
      setFeed(formatted);
    }

    setLoading(false);
  };

  const deleteConfession = async (tx_id) => {
    try {
      const message = `Delete Confession with tx_id: ${tx_id}`;
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(message);
      const response = await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tx_id, address: connectedAddress, signature }),
      });

      const result = await response.json();
      if (result.success) {
        alert("🗑️ Deleted!");
        fetchProfileFeed(); // refresh after delete
      } else {
        alert("❌ Failed to delete: " + result.error);
      }
    } catch (e) {
      alert("❌ Error during deletion");
      console.error(e);
    }
  };

  useEffect(() => {
    fetchProfileFeed();

    const sub = supabase
      .channel("profile-feed")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "confessions",
      }, (payload) => {
        if (payload.new?.address === address || payload.old?.address === address) {
          fetchProfileFeed();
        }
      })
      .subscribe();

    return () => supabase.removeChannel(sub);
  }, [address]);

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Confessions by {address?.slice(0, 6)}...{address?.slice(-4)}</h1>
      <button onClick={() => router.push("/")}>← Back to Global Feed</button>

      {loading ? (
        <p>Loading...</p>
      ) : feed.length === 0 ? (
        <p>No confessions from this user.</p>
      ) : (
        feed.map((item) => (
          <div key={item.tx_id} style={{ marginBottom: "1rem", padding: "1rem", border: "1px solid #ccc" }}>
            <p style={{ fontSize: "0.9rem", color: "#555" }}>
              {item.address.slice(0, 6)}...{item.address.slice(-4)}
            </p>
            <p style={{ whiteSpace: "pre-wrap" }}>{item.text}</p>
            {item.address.toLowerCase() === connectedAddress.toLowerCase() && (
              <button onClick={() => deleteConfession(item.tx_id)}>🗑️ Delete</button>
            )}
          </div>
        ))
      )}
    </main>
  );
}
