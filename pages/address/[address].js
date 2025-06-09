import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import ConfessBox from "../../components/ConfessBox";
import { ethers } from "ethers";
import { WebUploader } from "@irys/web-upload";
import { WebEthereum } from "@irys/web-upload-ethereum";
import { EthersV6Adapter } from "@irys/web-upload-ethereum-ethers-v6";
import { formatTimeAgo } from "../../utils/time";

export default function AddressPage() {
  const router = useRouter();
  const { address } = router.query;

  const [feed, setFeed] = useState([]);
  const [connectedAddress, setConnectedAddress] = useState("");
  const [irysUploader, setIrysUploader] = useState(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const decryptConfession = (encrypted) => {
    try {
      return atob(encrypted);
    } catch {
      return "[decryption error]";
    }
  };

  const fetchFeed = async (start = 0) => {
    if (!address) return;

    const { data, error } = await supabase
      .from("confessions")
      .select("tx_id, encrypted, address, created_at")
      .eq("address", address)
      .order("created_at", { ascending: false })
      .range(start, start + 9);

    if (error) {
      console.error("Failed to fetch confessions:", error);
      return;
    }

    const formatted = data.map((item) => ({
      ...item,
      text: decryptConfession(item.encrypted),
    }));

    if (start === 0) {
      setFeed(formatted);
    } else {
      setFeed((prev) => [...prev, ...formatted]);
    }

    setOffset(start + 10);
    setHasMore(data.length === 10);
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
    fetchFeed(0);
  }, [address]);

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-black z-50 px-4 sm:px-8 py-4 border-b border-gray-800 flex justify-between items-center">
        <h1
          className="text-lg font-semibold cursor-pointer"
          onClick={() => router.push("/")}
        >
          ← Back to Global Feed
        </h1>
        <p className="text-sm text-gray-400 hidden sm:block">
          Viewing {address?.slice(0, 6)}...{address?.slice(-4)}
        </p>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-8 py-6">
        {/* Confess Box if connected user is viewing their own page */}
        {address === connectedAddress && (
          <div className="mb-10">
            <ConfessBox
              irysUploader={irysUploader}
              address={connectedAddress}
              onUpload={() => fetchFeed(0)}
            />
          </div>
        )}

        <section>
          <h2 className="text-lg font-semibold mb-4">All Confessions</h2>
          {feed.length === 0 ? (
            <p className="text-gray-500">No confessions found.</p>
          ) : (
            <>
              {feed.map((item) => (
                <div
                  key={item.tx_id}
                  className="mb-4 p-4 border border-gray-700 rounded-lg bg-[#111]"
                >
                  <div className="flex justify-between text-sm text-irysAccent mb-2">
                    <span>
                      {item.address.slice(0, 6)}...{item.address.slice(-4)}
                    </span>
                    <span className="text-gray-500">
                      {formatTimeAgo(item.created_at)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap">{item.text}</p>
                  {item.address === connectedAddress && (
                    <button
                      onClick={() => handleDelete(item.tx_id)}
                      className="text-sm text-red-400 mt-2 hover:underline"
                    >
                      🗑️ Delete
                    </button>
                  )}
                </div>
              ))}
              {hasMore && (
                <div className="flex justify-center mt-6">
                  <button
                    onClick={() => fetchFeed(offset)}
                    className="btn-irys px-6 py-2"
                  >
                    Show More
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
