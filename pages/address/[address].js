import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { ethers } from "ethers";
import { supabase } from "../../lib/supabaseClient";

export default function ProfilePage() {
  const router = useRouter();
  const { address: routeAddress } = router.query;

  const [walletAddress, setWalletAddress] = useState("");
  const [feed, setFeed] = useState([]);
  const [connected, setConnected] = useState(false);

  const connectWallet = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      setWalletAddress(userAddress);
      setConnected(true);
      localStorage.setItem("walletConnected", "true");
    } catch (e) {
      console.error("Wallet connect error:", e);
    }
  };

  const disconnectWallet = () => {
    setConnected(false);
    setWalletAddress("");
    localStorage.removeItem("walletConnected");
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
      const signer = await new ethers.BrowserProvider(window.ethereum).getSigner();
      const signature = await signer.signMessage(message);

      const res = await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tx_id, address: walletAddress, signature }),
      });

      const result = await res.json();

      if (result.success) {
        console.log("✅ Deleted successfully");
      } else {
        console.error("❌ Failed to delete:", result.error);
      }
    } catch (e) {
      console.error("Delete error:", e);
    }
  };

  const fetchFeed = async () => {
    if (!routeAddress) return;

    const { data, error } = await supabase
      .from("confessions")
      .select("tx_id, encrypted, address")
      .eq("address", routeAddress)
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

  useEffect(() => {
    fetchFeed();
  }, [routeAddress]);

  useEffect(() => {
    const autoConnect = async () => {
      if (typeof window !== "undefined" && localStorage.getItem("walletConnected") === "true") {
        await connectWallet();
      }
    };

    autoConnect();

    const sub = supabase
      .channel("confession_feed_profile")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "confessions",
        },
        () => fetchFeed()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, []);

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Profile Confessions</h1>

      <button onClick={() => router.push("/")}>← Back to Global Feed</button>

      {!connected ? (
        <div style={{ marginTop: "1rem" }}>
          <button onClick={connectWallet}>Connect Wallet</button>
        </div>
      ) : (
        <div style={{ marginTop: "1rem" }}>
          <p>
            Viewing:{" "}
            {routeAddress ? `${routeAddress.slice(0, 6)}...${routeAddress.slice(-4)}` : "—"}
          </p>
          <p>
            Connected:{" "}
            {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "—"}
          </p>
        </div>
      )}

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
                {item.address.slice(0, 6)}...{item.address.slice(-4)}
              </p>
              <p style={{ whiteSpace: "pre-wrap" }}>{item.text}</p>
              {connected && walletAddress.toLowerCase() === item.address.toLowerCase() && (
                <button onClick={() => deleteConfession(item.tx_id)}>🗑 Delete</button>
              )}
            </div>
          ))
        )}
      </section>
    </main>
  );
}
