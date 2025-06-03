let uploader = null;

async function connectWallet() {
  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);

    await provider.send("wallet_addEthereumChain", [
      {
        chainId: "0x4f6", // 1270
        chainName: "Irys Testnet",
        nativeCurrency: { name: "IRYS", symbol: "IRYS", decimals: 18 },
        rpcUrls: ["https://testnet-rpc.irys.xyz/v1/execution-rpc"],
        blockExplorerUrls: ["https://testnet-explorer.irys.xyz"],
      },
    ]);

    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();

    // ✅ Ensure uploader is created and stored globally
    const instance = await window.IrysWebUploader.WebUploader(
      window.IrysWebUploader.WebEthereum
    ).withSigner(signer);

    uploader = instance;

    // Update UI
    document.getElementById("connect").innerText = "✅ Connected";
    document.getElementById("connect").disabled = true;
    alert("Wallet connected!");
  } catch (err) {
    console.error("Connect error:", err);
    alert("❌ Wallet connection failed.");
  }
}

async function uploadMessage() {
  if (!uploader) {
    alert("⚠️ Please connect your wallet first.");
    return;
  }

  const message = document.getElementById("message").value.trim();
  if (!message) {
    alert("✏️ Write a message before uploading.");
    return;
  }

  try {
    const res = await uploader.upload(message);
    const url = `https://gateway.irys.xyz/${res.id}`;
    alert(`✅ Uploaded!\n${url}`);
  } catch (err) {
    console.error("Upload error:", err);
    alert("❌ Upload failed.");
  }
}

window.onload = () => {
  document.getElementById("connect").onclick = connectWallet;
  document.getElementById("upload").onclick = uploadMessage;
};
