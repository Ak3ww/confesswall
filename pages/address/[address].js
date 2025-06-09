import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { ethers } from "ethers";

export default function AddressProfile() {
  const router = useRouter();
  const { address } = router.query;
  const [confessions, setConfessions] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [userAddress, setUserAddress] = useState("");

  const decryptConfession = (encrypted) => {
    try {
      return atob(encrypted);
    } catch {
      return "[decryption error]";
    }
  };

  const fetchUserAddress = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddr = await signer.getAddress();
      setUserAddress(userAddr);
    } catch (err) {
      console.error("Not connected:", err);
    }
  };

  const fetchProfile = async (nextPage = 0) => {
    const start = nextPage * 10;
    const end = start + 9;
    const { data, error } = await supabase
      .from("confessions")
      .select("tx_id, encrypted, address")
      .eq("address", address)
      .order("created_at", { ascending: false })
      .range(start, end);

    if (error) {
      console.error("Error loading confessions:", error);
      return;
    }

    const formatted = data.map((item) => ({
      ...item,
      text: decryptConfession(item.encrypted),
    }));

    setConfessions((prev) => [...prev, ...formatted]);
    if (formatted.length < 10) setHasMore(false);
  };

  const handleDelete = async (tx_id) => {
    try {
      const message = `Delete Confession with tx_id: ${tx_id}`;
      const signer = await new ethers.BrowserProvider(window.ethereum).getSigner();
      const signature = await signer.signMessage(message);
      const response = await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tx_id, address: userAddress, signature }),
      });

      const result = await response.json();
      if (result.success) {
        setConfessions((prev) => prev.filter((c) => c.tx_id !== tx_id));
        alert("✅ Deleted!");
      } else {
        alert("❌ Failed to delete");
        console.error(result.error);
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("❌ Error deleting");
    }
  };

  useEffect(() => {
    if (address) {
      fetchProfile();
      fetchUserAddress();

      const channel = supabase
        .channel(`realtime:profile:${address}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "confessions",
            filter: `address=eq.${address}`,
          },
          (payload) => {
            const newItem = {
              ...payload.new,
              text: decryptConfession(payload.new.encrypted),
            };

            setConfessions((prev) => {
              const exists = prev.some((c) => c.tx_id === newItem.tx_id);
              return exists ? prev : [newItem, ...prev];
            });
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "confessions",
            filter: `address=eq.${address}`,
          },
          (payload) => {
            setConfessions((prev) =>
              prev.filter((c) => c.tx_id !== payload.old.tx_id)
            );
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [address]);

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Confessions by {address?.slice(0, 6)}...{address?.slice(-4)}</h1>
      <button onClick={() => router.push("/")}>⬅ Back to Global Feed</button>

      <section style={{ marginTop: "2rem" }}>
        {confessions.length === 0 ? (
          <p>No confessions yet.</p>
        ) : (
          <>
            {confessions.map((c) => (
              <div
                key={c.tx_id}
                style={{
                  border: "1px solid #ccc",
                  padding: "1rem",
                  marginBottom: "1rem",
                }}
              >
                <p style={{ fontSize: "0.9rem", color: "#555" }}>
                  {c.address.slice(0, 6)}...{c.address.slice(-4)}
                </p>
                <p style={{ whiteSpace: "pre-wrap" }}>{c.text}</p>
                {c.address === userAddress && (
                  <button onClick={() => handleDelete(c.tx_id)}>🗑️ Delete</button>
                )}
              </div>
            ))}
            {hasMore && (
              <button onClick={() => {
                setPage((prev) => {
                  const next = prev + 1;
                  fetchProfile(next);
                  return next;
                });
              }}>
                Show More
              </button>
            )}
          </>
        )}
      </section>
    </main>
  );
}
