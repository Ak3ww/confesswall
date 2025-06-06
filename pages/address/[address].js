import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { ethers } from "ethers";

export default function AddressPage() {
  const router = useRouter();
  const { address: routeAddress } = router.query;
  const [confessions, setConfessions] = useState([]);
  const [walletAddress, setWalletAddress] = useState("");

  const fetchConfessions = async () => {
    if (!routeAddress) return;
    const { data, error } = await supabase
      .from("confessions")
      .select("tx_id, encrypted, address")
      .eq("address", routeAddress)
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

  const decryptConfession = (encrypted) => {
    try {
      return atob(encrypted);
    } catch {
      return "[decryption error]";
    }
  };

  const deleteConfession = async (tx_id) => {
    const { error } = await supabase.from("confessions").delete().eq("tx_id", tx_id);
    if (error) {
      console.error("Delete failed:", error);
    }
  };

  const getWallet = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddr = await signer.getAddress();
      setWalletAddress(userAddr);
    } catch (e) {
      console.warn("Wallet not connected");
    }
  };

  useEffect(() => {
    getWallet();
  }, []);

  useEffect(() => {
    fetchConfessions();
    if (routeAddress) {
      const channel = supabase
        .channel(`confession-profile-${routeAddress}`)
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "confessions",
          filter: `address=eq.${routeAddress}`,
        }, fetchConfessions)
        .on("postgres_changes", {
          event: "DELETE",
          schema: "public",
          table: "confessions",
          filter: `address=eq.${routeAddress}`,
        }, fetchConfessions)
        .subscribe();
      return () => supabase.removeChannel(channel);
    }
  }, [routeAddress]);

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Confessions by {routeAddress?.slice(0, 6)}...{routeAddress?.slice(-4)}</h1>
      <button onClick={() => router.push("/")}>← Back to Global Feed</button>

      <section style={{ marginTop: "2rem" }}>
        {confessions.length === 0 ? (
          <p>No confessions yet for this user.</p>
        ) : (
          confessions.map((item) => (
            <div
              key={item.tx_id}
              style={{
                marginBottom: "1rem",
                padding: "1rem",
                border: "1px solid #ccc",
              }}
            >
              <p style={{ whiteSpace: "pre-wrap" }}>{item.text}</p>
              {walletAddress === item.address && (
                <button
                  onClick={() => deleteConfession(item.tx_id)}
                  style={{ marginTop: "0.5rem" }}
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
