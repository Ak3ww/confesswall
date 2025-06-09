import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import ConfessBox from "../../components/ConfessBox";
import { ethers } from "ethers";
import { WebUploader } from "@irys/web-upload";
import { WebEthereum } from "@irys/web-upload-ethereum";
import { EthersV6Adapter } from "@irys/web-upload-ethereum-ethers-v6";

export default function AddressPage() {
  const router = useRouter();
  const { address } = router.query;

  const [feed, setFeed] = useState([]);
  const [connectedAddress, setConnectedAddress] = useState("");
  const [irysUploader, setIrysUploader] = useState(null);

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
      console.error("Failed to fetch confessions:", error);
      return;
    }

    const formatted = data.map((item) => ({
      ...item,
      text: decryptConfession(item.encrypted),
    }));

    setFeed(formatted);
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
        setFeed((prev) => prev.filter((item) => item.tx_id !== tx_id));
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

  const initConnected = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();
      const irys = await WebUploader(WebEthereum).withAdapter(
        EthersV6Adapter(provider)
      );
      setConnectedAddress(addr);
      setIrysUploader(irys);
    } catch (err) {
      console.error("Connect check failed:", err);
    }
  };

  useEffect(() => {
    initConnected();
    fetchFeed();
  }, [address]);

  return (
    <main className="min-h-screen bg-black text-white px-4 sm:px-8 py-6">
      <div className="max-w-2xl mx-auto">
       <div className="mb-6">
  <button
    onClick={() => router.push("/")}
    className="btn-irys text-sm mb-3"
  >
    ← Back to Global Feed
  </button>
  <h1 className="text-2xl font-bold">
    Confessions from {address?.slice(0, 6)}...{address?.slice(-4)}
  </h1>
</div>

        {/* Confess Box if connected user is viewing their own page */}
        {address === connectedAddress && (
          <div className="mb-10">
            <ConfessBox
              irysUploader={irysUploader}
              address={connectedAddress}
              onUpload={fetchFeed}
            />
          </div>
        )}

        <section>
          <h2 className="text-lg font-semibold mb-4">All Confessions</h2>
          {feed.length === 0 ? (
            <p className="text-gray-500">No confessions found.</p>
          ) : (
            feed.map((item) => (
              <div
                key={item.tx_id}
                className="mb-4 p-4 border border-gray-700 rounded-lg"
              >
                <p className="text-sm text-irysAccent mb-2">
                  {item.address.slice(0, 6)}...{item.address.slice(-4)}
                </p>
                <p className="whitespace-pre-wrap">{item.text}</p>
                {item.address === connectedAddress && (
                  <button
                    onClick={() => handleDelete(item.tx_id)}
                    className="text-sm text-red-400 mt-2"
                  >
                    🗑️ Delete
                  </button>
                )}
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
