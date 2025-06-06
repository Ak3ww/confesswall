import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";

export default function AddressProfile() {
  const router = useRouter();
  const { address } = router.query;
  const [confessions, setConfessions] = useState([]);
  const [ownAddress, setOwnAddress] = useState("");

  useEffect(() => {
    const init = async () => {
      const cached = localStorage.getItem("walletAddress");
      if (cached) setOwnAddress(cached);
    };
    init();
  }, []);

  useEffect(() => {
    if (!address) return;
    const fetchUserConfessions = async () => {
      const { data, error } = await supabase
        .from("confessions")
        .select("tx_id, encrypted, address")
        .eq("address", address)
        .order("created_at", { ascending: false });
      if (!error) {
        const formatted = data.map((item) => ({
          ...item,
          text: atob(item.encrypted),
        }));
        setConfessions(formatted);
      }
    };
    fetchUserConfessions();

    const channel = supabase
      .channel("confession-user")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "confessions", filter: `address=eq.${address}` },
        () => fetchUserConfessions()
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [address]);

  const deleteConfession = async (tx_id) => {
    const { error } = await supabase.from("confessions").delete().eq("tx_id", tx_id);
    if (error) console.error("Delete failed", error);
  };

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h2>Confessions by {address?.slice(0, 6)}...{address?.slice(-4)}</h2>
      <button onClick={() => router.push("/")}>← Back to Global Feed</button>
      {confessions.map((item) => (
        <div key={item.tx_id} style={{ border: "1px solid #ccc", padding: "1rem", marginTop: "1rem" }}>
          <p style={{ whiteSpace: "pre-wrap" }}>{item.text}</p>
          {ownAddress === item.address && (
            <button onClick={() => deleteConfession(item.tx_id)}>Delete</button>
          )}
        </div>
      ))}
    </main>
  );
}
