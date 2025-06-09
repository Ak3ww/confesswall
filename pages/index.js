import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { WebUploader } from "@irys/web-upload";
import { WebEthereum } from "@irys/web-upload-ethereum";
import { EthersV6Adapter } from "@irys/web-upload-ethereum-ethers-v6";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";
import ConfessBox from "../components/ConfessBox";

export default function Home() {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState("");
  const [irysUploader, setIrysUploader] = useState(null);
  const [uploadResult, setUploadResult] = useState("");
  const [feed, setFeed] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const router = useRouter();

  const connectWallet = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const irys = await WebUploader(WebEthereum).withAdapter(
        EthersV6Adapter(provider)
      );
      const userAddress = await signer.getAddress();

      setAddress(userAddress);
      setIrysUploader(irys);
      setConnected(true);
      localStorage.setItem("connected", "true");
      await fetchFeed(0);
    } catch (e) {
      console.error("Failed to connect wallet:", e);
    }
  };

  const disconnectWallet = () => {
    setConnected(false);
    setAddress("");
    setIrysUploader(null);
    setUploadResult("");
    setFeed([]);
    setPage(0);
    setHasMore(true);
    localStorage.removeItem("connected");
  };

  const encryptConfession = (plaintext) => btoa(plaintext);
  const decryptConfession = (encrypted) => {
    try {
      return atob(encrypted);
    } catch {
      return "[decryption error]";
    }
  };

  const uploadData = async (text) => {
    if (!text || !irysUploader) return;
    const encrypted = encryptConfession(text);

    try {
      const receipt = await irysUploader.upload(encrypted);
      const tx_id = receipt.id;

      await supabase.from("confessions").insert({
        tx_id,
        encrypted,
        address,
      });

      setUploadResult("✅ Uploaded anonymously");
      await fetchFeed(0); // Refresh list from top
    } catch (e) {
      console.error("Upload error:", e);
      setUploadResult("❌ Upload failed");
    }
  };

  const fetchFeed = async (nextPage = 0) => {
    const start = nextPage * 10;
    const end = start + 9;
    const { data, error } = await supabase
      .from("confessions")
      .select("tx_id, encrypted, address")
      .order("created_at", { ascending: false })
      .range(start, end);

    if (error) {
      console.error("Failed to fetch feed:", error);
      return;
    }

    const formatted = data.map((item) => ({
      ...item,
      text: decryptConfession(item.encrypted),
    }));

    setFeed((prev) => [...prev, ...formatted]);
    if (formatted.length < 10) setHasMore(false);
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

  useEffect(() => {
    const wasConnected = localStorage.getItem("connected");
    if (wasConnected === "true") {
      connectWallet();
    }
  }, []);

  useEffect(() => {
    if (!connected) return;

    const channel = supabase
      .channel("realtime:confessions")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "confessions" },
        (payload) => {
          const newItem = payload.new;
          const alreadyExists = feed.some((item) => item.tx_id === newItem.tx_id);
          if (!alreadyExists) {
            setFeed((prev) => [
              {
                ...newItem,
                text: decryptConfession(newItem.encrypted),
              },
              ...prev,
            ]);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "confessions" },
        (payload) => {
          const deletedId = payload.old.tx_id;
          setFeed((prev) => prev.filter((item) => item.tx_id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [connected, feed]);

  return (
    <main className="min-h-screen bg-black text-white px-4 sm:px-8 py-6">
      <div className="max-w-2xl mx-auto">
        {!connected ? (
          <p className="text-center text-gray-400 mt-10">Connect wallet to start confessing.</p>
        ) : (
          <>
            <ConfessBox
              irysUploader={irysUploader}
              address={address}
              onUpload={(text) => uploadData(text)}
            />

            <section className="mt-10">
              <h2 className="text-lg font-semibold mb-4">Latest Confessions</h2>
              {feed.length === 0 ? (
                <p className="text-gray-500">No confessions yet.</p>
              ) : (
                <>
                  {feed.map((item) => (
                    <div
                      key={item.tx_id}
                      className="mb-4 p-4 border border-gray-700 rounded-lg"
                    >
                      <p className="text-sm text-irysAccent mb-2 cursor-pointer"
                         onClick={() => router.push(`/address/${item.address}`)}>
                        {item.address.slice(0, 6)}...{item.address.slice(-4)}
                      </p>
                      <p className="whitespace-pre-wrap">{item.text}</p>
                      {item.address === address && (
                        <button
                          onClick={() => handleDelete(item.tx_id)}
                          className="text-sm text-red-400 mt-2"
                        >
                          🗑️ Delete
                        </button>
                      )}
                    </div>
                  ))}
                  {hasMore && (
                    <button
                      onClick={() => {
                        const nextPage = page + 1;
                        fetchFeed(nextPage);
                        setPage(nextPage);
                      }}
                      className="block mx-auto mt-6 px-4 py-2 text-sm text-irysAccent border border-irysAccent rounded hover:bg-irysAccent hover:text-black transition"
                    >
                      Show More
                    </button>
                  )}
                </>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
