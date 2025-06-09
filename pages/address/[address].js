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
  const [page, setPage] = useState(1);
  const perPage = 10;

  const decryptConfession = (encrypted) => {
    try {
      return atob(encrypted);
    } catch {
      return "[decryption error]";
    }
  };

  const fetchFeed = async (page = 1) => {
    if (!address) return;

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    const { data, error } = await supabase
      .from("confessions")
      .select("tx_id, encrypted, address")
      .eq("address", address)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Failed to fetch confessions:", error);
      return;
    }

    const formatted = data.map((item) => ({
      ...item,
      text: decryptConfession(item.encrypted),
    }));

    setFeed((prev) => [...prev, ...formatted]);
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

  // ⚠️ Subscribing to real-time insert/delete once
  useEffect(() => {
    if (!address) return;

    const channel = supabase
      .channel("realtime:confessions")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "confessions",
          filter: `address=eq.${address}`,
        },
        (payload) => {
          const newItem = payload.new;
          setFeed((prev) => {
            const alreadyExists = prev.some((item) => item.tx_id === newItem.tx_id);
            if (alreadyExists) return prev;

            return [
              {
                ...newItem,
                text: decryptConfession(newItem.encrypted),
              },
              ...prev,
            ];
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
          const deletedId = payload.old.tx_id;
          setFeed((prev) => prev.filter((item) => item.tx_id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [address]);

  useEffect(() => {
    initConnected();
    fetchFeed();
  }, [address]);

  const handleShowMore = () => {
    const nextPage = page + 1;
    fetchFeed(nextPage);
    setPage(nextPage);
  };

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

        {address === connectedAddress && (
          <div className="mb-10">
            <ConfessBox
              irysUploader={irysUploader}
              address={connectedAddress}
              onUpload={() => {
                setFeed([]);
                setPage(1);
                fetchFeed(1);
              }}
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
              ))}
              {feed.length % perPage === 0 && (
                <div className="text-center mt-4">
                  <button onClick={handleShowMore} className="btn-irys px-4 py-1">
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
