let uploader = null;

async function connectWallet() {
  const provider = new ethers.providers.Web3Provider(window.ethereum);

  await provider.send("wallet_addEthereumChain", [
    {
      chainId: "0x4f6", // 1270 in hex
      chainName: "Irys Testnet",
      nativeCurrency: { name: "IRYS", symbol: "IRYS", decimals: 18 },
      rpcUrls: ["https://testnet-rpc.irys.xyz/v1/execution-rpc"],
      blockExplorerUrls: ["https://testnet-explorer.irys.xyz"],
    },
  ]);

  await provider.send("eth_requestAccounts", []);

  // Connect Irys uploader
  uploader = await window.IrysWebUploader.WebUploader(
    window.IrysWebUploader.WebEthereum
  ).withProvider(provider);

  // Update UI
  document.getElementById("connect").innerText = "✅ Connected";
  document.getElementById("connect").disabled = true;
  alert("Wallet connected to Irys Testnet!");
}

async function uploadMessage() {
  if (!uploader) {
    alert("⚠️ Please connect your wallet first.");
    return;
  }

  const message = document.getElementById("message").value.trim();
  if (!message) {
    alert("✏️ Write a message first.");
    return;
  }

  try {
    const result = await uploader.upload(message);
    const url = `https://gateway.irys.xyz/${result.id}`;
    alert(`✅ Uploaded to Irys!\n${url}`);
  } catch (err) {
    console.error("Upload error:", err);
    alert("❌ Upload failed.");
  }
}

document.getElementById("connect").onclick = connectWallet;
document.getElementById("upload").onclick = uploadMessage;
