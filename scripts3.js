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
  const signer = provider.getSigner();

  uploader = await window.IrysWebUploader.WebUploader(
    window.IrysWebUploader.WebEthereum
  ).withSigner(signer);

  document.getElementById("connect").innerText = "✅ Connected";
  document.getElementById("connect").disabled = true;
  alert("Wallet connected!");
}

async function uploadMessage() {
  if (!uploader) {
    alert("⚠️ Connect your wallet first.");
    return;
  }

  const message = document.getElementById("message").value.trim();
  if (!message) {
    alert("✏️ Please write something first.");
    return;
  }

  try {
    const res = await uploader.upload(message);
    const url = `https://gateway.irys.xyz/${res.id}`;
    alert(`✅ Uploaded!\n${url}`);
  } catch (err) {
    console.error("Upload failed:", err);
    alert("❌ Upload failed.");
  }
}

window.onload = () => {
  document.getElementById("connect").onclick = connectWallet;
  document.getElementById("upload").onclick = uploadMessage;
};
