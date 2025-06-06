import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function ProfilePage() {
  const router = useRouter();
  const { address } = router.query;
  const [feed, setFeed] = useState([]);

  const decryptConfession = (encrypted) => {
    try {
      return atob(encrypted);
    } catch {
      return "[decryption error]";
    }
  };

  useEffect(() => {
    if (!address) return;

    const fetchProfileFeed = async () => {
      const { data, error } = await supabase
        .from("confessions")
        .select("tx_id, encrypted, address")
        .eq("address", address)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Fetch error:", error);
        return;
      }

      const formatted = data.map((item) => ({
        ...item,
        text: decryptConfession(item.encrypted),
      }));

      setFeed(formatted);
    };

    fetchProfileFeed();
  }, [address]);

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Confessions by {address?.slice(0, 6)}...{address?.slice(-4)}</h1>
      <a href="/">← Back to Global Feed</a>

      <section style={{ marginTop: "2rem" }}>
        {feed.length === 0 ? (
          <p>No confessions yet.</p>
        ) : (
          feed.map((item) => (
            <div
              key={item.tx_id}
              style={{ marginBottom: "1rem", padding: "1rem", border: "1px solid #ccc" }}
            >
              <p style={{ fontSize: "0.9rem", color: "#555" }}>
                {item.address.slice(0, 6)}...{item.address.slice(-4)}
              </p>
              <p>{item.text}</p>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
