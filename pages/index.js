import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { WebUploader } from "@irys/web-upload";
import { WebEthereum } from "@irys/web-upload-ethereum";
import { EthersV6Adapter } from "@irys/web-upload-ethereum-ethers-v6";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/router";
import ConfessBox from "../components/ConfessBox";
import { formatTimeAgo } from "../utils/time";

export default function Home() {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState("");
  const [irysUploader, setIrysUploader] = useState(null);
  const [feed, setFeed] = useState([]);
  const [offset, setOffset] = useState(0);
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
    } catch (e) {
      console.error("Failed to connect wallet:", e);
    }
  };

  const disconnectWallet = () => {
    setConnected(false);
    setAddress("");
    setIrysUploader(null);
    setFeed([]);
    setOffset(0);
    localStorage.removeItem("connected");
  };

  const decryptConfession = (encrypted) => {
    try {
      return atob(encrypted);
    } catch {
      return "[decryption error]";
    }
  };

  const fetchFeed = async (start = 0) => {
    const { data, error } = await supabase
      .from("confessions")
      .select("tx_id, encrypted, address, created_at")
      .order("created_at", { ascending: false })
      .range(start, start + 9);

    if (error) {
      console.error("Failed to fetch feed:", error);
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

  useEffect(() => {
    const wasConnected = localStorage.getItem("connected");
    if (wasConnected === "true") {
      connectWallet();
    }
  }, []);

  useEffect(() => {
    if (!connected) return;

    fetchFeed(0);

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
    <main className="min-h-screen bg-black text-white px-4 sm:px-6 lg:px-8 pb-10">
      <div className="sticky top-0 z-50 bg-black border-b border-gray-800 px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1
            className="text-xl sm:text-2xl font-bold cursor-pointer"
            onClick={() => router.push("/")}
          >
            ConfessWall
          </h1>
          {connected && (
            <button
              onClick={() => router.push(`/address/${address}`)}
              className="btn-irys px-3 py-1 text-sm"
            >
              My Confessions
            </button>
          )}
        </div>
        {!connected ? (
          <button onClick={connectWallet} className="btn-irys px-4 py-2 text-sm">
            Connect Wallet
          </button>
        ) : (
          <button onClick={disconnectWallet} className="btn-irys px-4 py-2 text-sm">
            Disconnect
          </button>
        )}
      </div>

      {!connected ? (
        <div className="text-center mt-24 max-w-xl mx-auto">
          <h2 className="text-3xl font-semibold mb-4">Welcome to ConfessWall</h2>
          <p className="text-gray-400 mb-6">
            Connect your wallet to post and view anonymous confessions stored onchain.
          </p>
          <p className="text-xs text-gray-500">
            Powered by <a href="https://irys.xyz" className="underline">Irys</a>
          </p>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto mt-8 space-y-12 px-2 sm:px-0">
          <ConfessBox irysUploader={irysUploader} address={address} onUpload={() => fetchFeed(0)} />

          <div>
            <h2 className="text-xl font-semibold mb-4">Latest Confessions</h2>
            {feed.length === 0 ? (
              <p className="text-gray-500 text-sm">No confessions yet.</p>
            ) : (
              <>
                {feed.map((item) => (
                  <div
                    key={item.tx_id}
                    className="mb-4 p-4 border border-gray-700 rounded-lg bg-[#111]"
                  >
                    <div className="flex justify-between text-sm text-irysAccent mb-2">
                      <span
                        className="cursor-pointer"
                        onClick={() => router.push(`/address/${item.address}`)}
                      >
                        {item.address.slice(0, 6)}...{item.address.slice(-4)}
                      </span>
                      <span className="text-gray-500">
                        {formatTimeAgo(item.created_at)}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-white mt-1">{item.text}</p>
                    {item.address === address && (
                      <button
                        onClick={() => handleDelete(item.tx_id)}
                        className="mt-3 text-sm text-red-400 hover:underline"
                      >
                        🗑️ Delete
                      </button>
                    )}
                  </div>
                ))}
                {hasMore && (
                  <div className="flex justify-center mt-6">
                    <button onClick={() => fetchFeed(offset)} className="btn-irys px-6 py-2">
                      Show More
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
