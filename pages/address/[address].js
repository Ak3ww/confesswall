import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { ethers } from "ethers";

export default function UserPage() {
  const router = useRouter();
  const { address } = router.query;
  const [confessions, setConfessions] = useState([]);
  const [currentUser, setCurrentUser] = useState("");
  const [connected, setConnected] = useState(false);

  const decryptConfession = (encrypted) => {
    try {
      return atob(encrypted);
    } catch {
      return "[decryption error]";
    }
  };

  const fetchConfessions = async () => {
    const { data, error } = await supabase
      .from("confessions")
      .select("tx_id, encrypted, address")
      .eq("address", address)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching confessions:", error);
      return;
    }

    const formatted = data.map((item) => ({
      ...item,
      text: decryptConfession(item.encrypted),
    }));

    setConfessions(formatted);
  };

  const connectWallet = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      setCurrentUser(userAddress);
      setConnected(true);
    } catch (err) {
      console.error("Wallet connection failed:", err);
    }
  };

  const disconnectWallet = () => {
    setCurrentUser("");
    setConnected(false);
  };

  const handleDelete = async (tx_id) => {
    try {
      const message = `Delete Confession with tx_id: ${tx_id}`;
      const signer = await new ethers.BrowserProvider(window.ethereum).getSigner();
      const signature = await signer.signMessage(message);

      const res = await fetch("/api/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tx_id, address, signature }),
      });

      const result = await res.json();

      if (result.success) {
        setConfessions((prev) => prev.filter((item) => item.tx_id !== tx_id));
        alert("✅ Confession deleted");
      } else {
        console.error("Delete failed:", result.error);
        alert("❌ Delete failed");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("❌ Delete error");
    }
  };

  useEffect(() => {
    if (address) fetchConfessions();
    const wasConnected = localStorage.getItem("connected");
    if (wasConnected === "true") connectWallet();
  }, [address]);

  return (
    <>
      {/* HEADER */}
      <header className="w-full border-b border-irysAccent bg-black px-4 py-3 mb-8">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <button onClick={() => router.push("/")} className="text-irysAccent font-bold text-lg">
            ConfessWall
          </button>

          {connected && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-irysText">
                {currentUser.slice(0, 6)}...{currentUser.slice(-4)}
              </span>
              <button onClick={disconnectWallet} className="btn-irys">
                Disconnect
              </button>
            </div>
          )}
        </div>
      </header>

      {/* USER CONFESSIONS */}
      <main className="max-w-2xl mx-auto px-4 font-sans">
        <h1 className="text-xl font-bold mb-4 text-irysAccent">
          Confessions by {address?.slice(0, 6)}...{address?.slice(-4)}
        </h1>

        <button onClick={() => router.push("/")} className="btn-irys mb-6">
          ← Back to Home
        </button>

        {confessions.length === 0 ? (
          <p>No confessions yet.</p>
        ) : (
          confessions.map((item) => (
            <div key={item.tx_id} className="mb-4 p-4 border border-neutral-800 rounded-lg bg-irysGray">
              <p className="text-sm text-gray-400">
                <span className="text-irysAccent cursor-pointer">
                  {item.address.slice(0, 6)}...{item.address.slice(-4)}
                </span>
              </p>
              <p className="whitespace-pre-wrap">{item.text}</p>
              {item.address === currentUser && (
                <button onClick={() => handleDelete(item.tx_id)} className="btn-irys mt-2">
                  🗑️ Delete
                </button>
              )}
            </div>
          ))
        )}
      </main>
    </>
  );
}
