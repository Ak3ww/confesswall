import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { ethers } from "ethers";

export default function AddressPage() {
  const router = useRouter();
  const { address } = router.query;
  const [confessions, setConfessions] = useState([]);
  const [currentUser, setCurrentUser] = useState("");

  const decryptConfession = (encrypted) => {
    try {
      return atob(encrypted);
    } catch {
      return "[decryption error]";
    }
  };

  const fetchConfessions = async () => {
    if (!address) return;

    const { data, error } = await supabase
      .from("confessions")
      .select("tx_id, encrypted, address, created_at")
      .eq("address", address)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch profile confessions:", error);
      return;
    }

    const formatted = data.map((item) => ({
      ...item,
      text: decryptConfession(item.encrypted),
    }));

    setConfessions(formatted);
  };

  const deleteConfession = async (tx_id) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const message = `Delete confession with hash: ${tx_id}`;
      await signer.signMessage(message);

      const { error } = await supabase.from("confessions").delete().eq("tx_id", tx_id);
      if (error) {
        console.error("Failed to delete confession:", error);
      }
    } catch (e) {
      console.error("Delete error:", e);
    }
  };

  const getWallet = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();
      setCurrentUser(addr);
    } catch (e) {
      console.error("Wallet not connected:", e);
    }
  };

  useEffect(() => {
    fetchConfessions();
    getWallet();

    const sub = supabase
      .channel("realtime_confessions")
      .on("postgres_changes", { event: "*", schema: "public", table: "confessions" }, fetchConfessions)
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
        {confessions.length === 0 ? (
          <p>No confessions yet from this user.</p>
        ) : (
          confessions.map((item) => (
            <div key={item.tx_id} style={{ marginBottom: "1rem", padding: "1rem", border: "1px solid #ccc" }}>
              <p style={{ whiteSpace: "pre-wrap" }}>{item.text}</p>
              {currentUser === address && (
                <button
                  onClick={() => deleteConfession(item.tx_id)}
                  style={{ marginTop: "0.5rem", color: "red" }}
                >
                  Delete
                </button>
              )}
            </div>
          ))
        )}
      </section>
    </main>
  );
}
