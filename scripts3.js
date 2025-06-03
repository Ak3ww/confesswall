let uploader = null;

document.getElementById("connect").onclick = async () => {
  const provider = new ethers.providers.Web3Provider(window.ethereum);

  await provider.send("wallet_addEthereumChain", [
    {
      chainId: "0x4f6",
      chainName: "Irys Testnet",
      nativeCurrency: { name: "IRYS", symbol: "IRYS", decimals: 18 },
      rpcUrls: ["https://testnet-rpc.irys.xyz/v1/execution-rpc"],
      blockExplorerUrls: ["https://testnet-explorer.irys.xyz"],
    },
  ]);

  await provider.send("eth_requestAccounts", []);

  const ethSigner = new window.IrysWebUploader.WebEthereum(provider);
  uploader = await window.IrysWebUploader.WebUploader.withProvider(ethSigner);

  // ✅ Update button UI
  const connectBtn = document.getElementById("connect");
  connectBtn.textContent = "Connected ✅";
  connectBtn.disabled = true;

  alert("✅ Wallet connected to Irys Testnet");
};

document.getElementById("upload").onclick = async () => {
  if (!uploader) return alert("⚠️ Please connect wallet first.");
  const msg = document.getElementById("message").value.trim();
  if (!msg) return alert("✏️ Write something to upload.");

  try {
    const res = await uploader.upload(msg);
    alert(`✅ Uploaded!\n🔗 https://gateway.irys.xyz/${res.id}`);
  } catch (err) {
    console.error("Upload failed", err);
    alert("❌ Upload failed. Check console.");
  }
};
